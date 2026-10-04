import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useUI } from '../state/uiStore'
import { fmt } from '../db/stats'
import type { AdjType } from '../types'
import { ADJ_LABEL } from '../types'

const TYPES: AdjType[] = ['SAVED', 'PLANNED', 'FUND', 'ACTUAL']

function num(s: string): number {
  const v = parseFloat(s)
  return Number.isFinite(v) ? v : 0
}

function dt(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function AdjustDialog() {
  const adjustType = useUI((s) => s.adjustType)
  const closeAdjust = useUI((s) => s.closeAdjust)
  const showToast = useUI((s) => s.showToast)

  const recent = useLiveQuery(() => db.adjustments.orderBy('createdAt').reverse().limit(12).toArray(), [])

  const [type, setType] = useState<AdjType>(adjustType)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  const v = num(amount)
  const valid = v !== 0 && reason.trim().length > 0

  async function save() {
    if (!valid) return
    const adj = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      type,
      targetId: undefined,
      amount: v,
      reason: reason.trim(),
    }
    await db.adjustments.add(adj)
    showToast(`已调整 · ${ADJ_LABEL[type]} ${v >= 0 ? '+' : '−'}${fmt(Math.abs(v))}`)
    closeAdjust()
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && closeAdjust()}>
      <div className="dialog">
        <h3 className="dialog-title">手动调整统计</h3>
        <p className="dialog-sub">系统的自动统计不一定永远正确 —— 数据的控制权在你手里</p>

        <div className="field">
          <label>调整哪个口径？</label>
          <div className="chips">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={'chip' + (type === t ? ' on' : '')}
                onClick={() => setType(t)}
              >
                {ADJ_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>调整多少？（可以输入负数，比如 -20）</label>
          <div className="amount-wrap">
            <span className="yen">¥</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.-]/g, ''))}
              placeholder="+20"
              autoFocus
            />
          </div>
        </div>

        {type === 'FUND' && (
          <div className="field">
            <p className="form-hint">
              基金是「总池」：省下的钱自动按目标创建顺序填充——先填满第一个，达成后自动流入下一个。
            </p>
          </div>
        )}

        <div className="field">
          <label>原因（必填，给自己一个交代）</label>
          <textarea
            className="textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="比如：之前有一笔现金存入没有记录 / 上个月记错了一笔"
          />
        </div>

        <div className="btn-row">
          <button className="btn" onClick={closeAdjust}>取消</button>
          <button className="btn primary" disabled={!valid} onClick={save}>
            保存调整
          </button>
        </div>

        {recent && recent.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <p className="block-title">最近的调整记录（永久保留）</p>
            {recent.map((a) => (
              <div className="sheet-row" key={a.id}>
                <span className="r-main">{a.reason}</span>
                <span className={`r-num ${a.amount >= 0 ? 'pos' : 'neg'}`}>
                  {a.amount >= 0 ? '+' : '−'}{fmt(Math.abs(a.amount))}
                </span>
                <span className="r-sub">{ADJ_LABEL[a.type]} · {dt(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
