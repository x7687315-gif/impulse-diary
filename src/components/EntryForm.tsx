import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useUI } from '../state/uiStore'
import { deriveAmounts, fmt, fundBalance } from '../db/stats'
import { loadPrefs } from '../db/prefs'
import type { Decision, Entry, Motive, Zone } from '../types'
import { DECISION_LABEL, MOTIVE_LABEL, ZONE_LABEL } from '../types'
import { Icon } from './icons'

const MOTIVES: Motive[] = ['STRESS', 'WANT', 'SOCIAL', 'NECESSITY', 'OTHER']
const ZONES: (Zone | 'NONE')[] = ['FREE', 'BUFFER', 'CAUTION', 'NONE']
const DECISIONS: Decision[] = ['RESISTED', 'SUBSTITUTED', 'BOUGHT', 'PLANNED', 'DEFERRED']
const BUFFER_OPTIONS = [24, 48, 72]

function num(s: string): number {
  const v = parseFloat(s)
  return Number.isFinite(v) ? v : 0
}

/** 外层闸门：等编辑目标加载完再挂表单，保证 hooks 稳定 */
export function EntryFormGate({ entryId }: { entryId: string | null }) {
  const existing = useLiveQuery(
    async () => (entryId ? await db.entries.get(entryId) : null),
    [entryId],
  )
  if (entryId && !existing) return null
  return <EntryForm entry={entryId ? (existing as Entry) : null} />
}

function EntryForm({ entry }: { entry: Entry | null }) {
  const closeForm = useUI((s) => s.closeForm)
  const showToast = useUI((s) => s.showToast)

  const goals = useLiveQuery(() => db.goals.where('status').equals('ACTIVE').toArray(), [])

  const [content, setContent] = useState(entry?.content ?? '')
  const [intended, setIntended] = useState(entry ? String(entry.intendedAmount) : '')
  const [motive, setMotive] = useState<Motive | null>(entry?.motive ?? null)
  const [zone, setZone] = useState<Zone | null>(entry?.zone ?? null)
  const [decision, setDecision] = useState<Decision>(entry?.decision ?? 'RESISTED')
  const [actual, setActual] = useState(
    entry && entry.actualAmount > 0 ? String(entry.actualAmount) : '',
  )
  const [fundOn, setFundOn] = useState(entry ? entry.fundAmount > 0 : true)
  const [fund, setFund] = useState(entry && entry.fundAmount > 0 ? String(entry.fundAmount) : '')
  const [targetId, setTargetId] = useState(entry?.targetId ?? '')
  const [tags, setTags] = useState(entry ? entry.tags.join(' ') : '')
  const [bufferH, setBufferH] = useState(loadPrefs().bufferHours)

  const isDeferred = decision === 'DEFERRED'
  const canFund = decision === 'RESISTED' || decision === 'SUBSTITUTED'
  const activeGoals = goals ?? []

  const derived = useMemo(() => {
    const it = num(intended)
    const acRaw = actual.trim() === '' ? undefined : num(actual)
    const d = deriveAmounts(decision, it, acRaw)
    let fu = 0
    if (fundOn && canFund && d.saved > 0) {
      fu = fund.trim() === '' ? d.saved : Math.min(num(fund), d.saved)
      fu = Math.max(0, fu)
    }
    return { intended: it, ...d, fund: fu }
  }, [intended, actual, decision, fund, fundOn, canFund])

  const valid =
    content.trim().length > 0 &&
    derived.intended > 0 &&
    (!isDeferred || true) &&
    derived.fund <= derived.saved

  const chosenGoal = activeGoals.find((g) => g.id === (targetId || activeGoals[0]?.id))

  async function save() {
    if (!valid) return
    const now = Date.now()
    const isNew = !entry
    const base: Entry = entry
      ? { ...entry }
      : {
          id: crypto.randomUUID(),
          createdAt: now,
          content: '',
          intendedAmount: 0,
          actualAmount: 0,
          decision: 'RESISTED',
          motive: null,
          zone: null,
          savedAmount: 0,
          fundAmount: 0,
          tags: [],
          updatedAt: now,
        }

    const tid = derived.fund > 0 ? targetId || activeGoals[0]?.id || undefined : undefined
    const e2: Entry = {
      ...base,
      content: content.trim(),
      intendedAmount: derived.intended,
      actualAmount: derived.actual,
      decision,
      motive,
      zone,
      savedAmount: derived.saved,
      fundAmount: derived.fund,
      targetId: tid,
      tags: tags.split(/[,,\s]+/).map((t) => t.trim()).filter(Boolean),
      bufferUntil: isDeferred ? now + bufferH * 3600e3 : undefined,
      resolvedAt:
        entry && entry.decision === 'DEFERRED' && decision !== 'DEFERRED'
          ? now
          : entry?.resolvedAt,
      updatedAt: now,
    }
    await db.entries.put(e2)

    if (derived.fund > 0 && tid && chosenGoal) {
      const prev = await fundBalance(tid)
      const willReach = prev >= chosenGoal.targetAmount
      if (!willReach && prev + derived.fund >= chosenGoal.targetAmount) {
        showToast(`+${fmt(derived.fund)} 已存入「${chosenGoal.name}」· 目标达成！可以真正拥有它了`)
      } else {
        showToast(`+${fmt(derived.fund)} 已存入「${chosenGoal.name}」· 距离目标又近了 ${fmt(derived.fund)}`)
      }
    } else if (isNew && derived.saved > 0) {
      showToast(`已记录 · +${fmt(derived.saved)} 已节省`)
    }
    closeForm()
  }

  async function remove() {
    if (!entry) return
    if (!window.confirm('删除这条记录？相关的节省、基金拨付与统计会一并撤销。')) return
    await db.entries.delete(entry.id)
    showToast('已删除')
    closeForm()
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && closeForm()}>
      <div className="dialog">
        <h3 className="dialog-title">{entry ? '编辑记录' : '记录一次消费冲动'}</h3>
        <p className="dialog-sub">记下欲望出现的瞬间，以及你是如何决定的</p>

        <div className="field">
          <label>想买什么？</label>
          <textarea
            className="textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="看到一个 ¥21 的东西，很想买…"
            autoFocus={!entry}
          />
        </div>

        <div className="field">
          <label>预计多少钱？</label>
          <div className="amount-wrap">
            <span className="yen">¥</span>
            <input
              inputMode="decimal"
              value={intended}
              onChange={(e) => setIntended(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="0"
            />
          </div>
        </div>

        <div className="field">
          <label>为什么想买？</label>
          <div className="chips">
            {MOTIVES.map((m) => (
              <button
                key={m}
                type="button"
                className={'chip' + (motive === m ? ' on' : '')}
                onClick={() => setMotive(motive === m ? null : m)}
              >
                {MOTIVE_LABEL[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>决策分区（可不选，只是帮你归类）</label>
          <div className="chips">
            {ZONES.map((z) => (
              <button
                key={z}
                type="button"
                className={'chip' + ((z === 'NONE' && zone === null) || zone === z ? ' on' : '')}
                onClick={() => setZone(z === 'NONE' ? null : z)}
              >
                {z === 'NONE' ? '暂不分类' : ZONE_LABEL[z]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>当前状态</label>
          <div className="chips">
            {DECISIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`chip d-${d}${decision === d ? ' on' : ''}`}
                onClick={() => setDecision(d)}
              >
                {DECISION_LABEL[d]}
              </button>
            ))}
          </div>
        </div>

        {decision === 'BOUGHT' && (
          <div className="field">
            <label>实际花了多少？（留空 = 与预计相同）</label>
            <div className="amount-wrap">
              <span className="yen">¥</span>
              <input
                inputMode="decimal"
                value={actual}
                onChange={(e) => setActual(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder={intended || '0'}
              />
            </div>
          </div>
        )}

        {decision === 'SUBSTITUTED' && (
          <div className="field">
            <label>替代方案花了多少？（留空 = ¥0，比如改喝家里的茶）</label>
            <div className="amount-wrap">
              <span className="yen">¥</span>
              <input
                inputMode="decimal"
                value={actual}
                onChange={(e) => setActual(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="0"
              />
            </div>
          </div>
        )}

        {isDeferred && (
          <div className="field">
            <label>缓冲多久再决定？</label>
            <div className="chips">
              {BUFFER_OPTIONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={'chip' + (bufferH === h ? ' on' : '')}
                  onClick={() => setBufferH(h)}
                >
                  {h} 小时
                </button>
              ))}
            </div>
            <p className="form-hint">到期后日记顶部会出现提醒条，不会丢。</p>
          </div>
        )}

        {canFund && derived.saved > 0 && (
          <div className="field">
            <div className="chips" style={{ marginBottom: 10 }}>
              <button
                type="button"
                className={'chip' + (fundOn ? ' on' : '')}
                onClick={() => setFundOn(!fundOn)}
              >
                {fundOn ? '✓ ' : ''}把这笔钱存入大件基金
              </button>
            </div>
            {fundOn &&
              (activeGoals.length > 0 ? (
                <>
                  <div className="amount-wrap" style={{ marginBottom: 10 }}>
                    <span className="yen">¥</span>
                    <input
                      inputMode="decimal"
                      value={fund}
                      onChange={(e) => setFund(e.target.value.replace(/[^\d.]/g, ''))}
                      placeholder={`默认全部（${fmt(derived.saved)}）`}
                    />
                  </div>
                  <select
                    className="input"
                    value={targetId || activeGoals[0]?.id || ''}
                    onChange={(e) => setTargetId(e.target.value)}
                  >
                    {activeGoals.map((g) => (
                      <option key={g.id} value={g.id}>
                        存入「{g.name}」（{fmt(g.targetAmount)}）
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <p className="form-hint">
                  还没有大件目标。先随便记着，「我的目标」页面建好之后，之后的节省就能自动存进去了。
                </p>
              ))}
          </div>
        )}

        <div className="field">
          <label>标签（可选）</label>
          <input
            className="input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="空格或逗号分隔，比如：礼物 双十一"
          />
        </div>

        <div className="preview">
          <div className="preview-line"><span>消费冲动</span><span>{fmt(derived.intended)}</span></div>
          <div className="preview-line"><span>实际支出</span><span className={derived.actual > 0 ? 'neg' : ''}>{fmt(derived.actual)}</span></div>
          <div className="preview-line"><span>已节省</span><span className={derived.saved > 0 ? 'pos' : ''}>{derived.saved > 0 ? '+' : ''}{fmt(derived.saved)}</span></div>
          <div className="preview-line">
            <span>大件基金</span>
            <span className={derived.fund > 0 ? 'pos' : ''}>
              {derived.fund > 0 ? `+${fmt(derived.fund)}${chosenGoal ? `「${chosenGoal.name}」` : ''}` : '—'}
            </span>
          </div>
          <p className="preview-note">
            {isDeferred && '缓冲期内暂不计入任何统计，到期后补一个最终决定。'}
            {decision === 'PLANNED' && '已计划的钱进入「即将支出」岛；真正付款后转为实际支出。'}
            {decision === 'BOUGHT' && '买了就是买了，这里只是如实记录，不作评判。'}
            {decision === 'RESISTED' && '这笔钱没有花掉，它会变成你的节省。'}
            {decision === 'SUBSTITUTED' && '用更小的方式满足了欲望，差额自动成为节省。'}
          </p>
        </div>

        <div className="btn-row">
          {entry ? (
            <button type="button" className="btn danger" onClick={remove}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name="trash" size={15} /> 删除
              </span>
            </button>
          ) : (
            <button type="button" className="btn" onClick={closeForm}>取消</button>
          )}
          <button type="button" className="btn primary" disabled={!valid} onClick={save}>
            {entry ? '保存修改' : '记下这一笔'}
          </button>
        </div>
      </div>
    </div>
  )
}
