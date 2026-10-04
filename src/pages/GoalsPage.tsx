import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { allocateFund, fmt, fundPool } from '../db/stats'
import { useUI } from '../state/uiStore'
import type { Goal } from '../types'
import { Icon } from '../components/icons'

export function GoalsPage() {
  const goals = useLiveQuery(() => db.goals.orderBy('createdAt').toArray())
  const entries = useLiveQuery(() => db.entries.toArray())
  const adjs = useLiveQuery(() => db.adjustments.toArray())
  const showToast = useUI((s) => s.showToast)
  const [editing, setEditing] = useState<Goal | 'new' | null>(null)

  if (!goals || !entries || !adjs) return <div className="loading">…</div>

  // 瀑布分配：钱按目标创建顺序自动填充，达成后溢出流入下一个
  const stages = allocateFund(
    goals.filter((g) => g.status !== 'PAUSED'),
    fundPool(entries, adjs),
  )
  const paused = goals.filter((g) => g.status === 'PAUSED')

  return (
    <div>
      <p className="page-title">真正想要的东西，一笔一笔攒出来</p>
      {goals.length === 0 && (
        <div className="empty-note">
          还没有目标。
          <br />
          建一个「真正想要」的目标，之后每次忍住消费冲动，省下的钱都会自动存进来。
        </div>
      )}
      {stages.map((st, i) => {
        const g = st.goal
        const pct = Math.min(100, Math.round((st.allocated / g.targetAmount) * 100))
        return (
          <div key={g.id} className="goal-card">
            <div className="goal-top">
              <span className="goal-name">
                <span style={{ fontSize: 11, color: 'var(--ink-3)', marginRight: 6 }}>第 {i + 1} 阶段</span>
                {g.name}
              </span>
              <span className="goal-nums">
                <b>{fmt(st.allocated)}</b> <span>/ {fmt(g.targetAmount)}</span>
              </span>
            </div>
            <div className="prog"><i style={{ width: `${pct}%` }} /></div>
            <div className="goal-remain">
              {st.reached ? (
                <span className="goal-done">已达成 · 这笔省下的钱变成了它</span>
              ) : st.filling ? (
                <>正在存入 · 还差 {fmt(g.targetAmount - st.allocated)} · 已完成 {pct}%</>
              ) : (
                <>排队中 · 前面阶段达成后自动开始存入</>
              )}
              {g.deadline && <> · {new Date(g.deadline).getMonth() + 1}月{new Date(g.deadline).getDate()}日前</>}
            </div>
            <div className="goal-actions">
              <button className="btn small" onClick={() => setEditing(g)}>编辑</button>
              <button
                className="btn small danger"
                onClick={async () => {
                  if (!window.confirm(`删除目标「${g.name}」（第 ${i + 1} 阶段）？省下的钱会自动流入后面的目标，历史记录仍保留在日记中。`)) return
                  await db.goals.delete(g.id)
                  showToast('目标已删除 · 省下的钱自动流入后面的目标')
                }}
              >
                删除
              </button>
            </div>
          </div>
        )
      })}
      {paused.map((g) => (
        <div key={g.id} className="goal-card" style={{ opacity: 0.6 }}>
          <div className="goal-top">
            <span className="goal-name">{g.name}（已暂停）</span>
            <span className="goal-nums">
              <b>0</b> <span>/ {fmt(g.targetAmount)}</span>
            </span>
          </div>
          <div className="goal-actions">
            <button className="btn small" onClick={() => setEditing(g)}>编辑</button>
            <button
              className="btn small danger"
              onClick={async () => {
                if (!window.confirm(`删除已暂停的目标「${g.name}」？`)) return
                await db.goals.delete(g.id)
                showToast('目标已删除')
              }}
            >
              删除
            </button>
          </div>
        </div>
      ))}
      <button className="btn" style={{ width: '100%' }} onClick={() => setEditing('new')}>
        ＋ 新建目标
      </button>
      {editing && (
        <GoalForm
          goal={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(name, created) => showToast(created ? `目标「${name}」已创建 · 省下的钱会自动存入它` : `「${name}」已更新`)}
        />
      )}
    </div>
  )
}

function GoalForm({
  goal,
  onClose,
  onSaved,
}: {
  goal: Goal | null
  onClose: () => void
  onSaved: (name: string, created: boolean) => void
}) {
  const [name, setName] = useState(goal?.name ?? '')
  const [amount, setAmount] = useState(goal ? String(goal.targetAmount) : '')
  const [deadline, setDeadline] = useState(
    goal?.deadline ? new Date(goal.deadline).toISOString().slice(0, 10) : '',
  )
  const valid = name.trim().length > 0 && (parseFloat(amount) || 0) > 0

  async function save() {
    if (!valid) return
    const g: Goal = {
      id: goal?.id ?? crypto.randomUUID(),
      name: name.trim(),
      targetAmount: parseFloat(amount),
      createdAt: goal?.createdAt ?? Date.now(),
      deadline: deadline ? new Date(deadline + 'T12:00:00').getTime() : undefined,
      status: goal?.status ?? 'ACTIVE',
    }
    await db.goals.put(g)
    onSaved(g.name, !goal)
    onClose()
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog">
        <h3 className="dialog-title">{goal ? '编辑目标' : '新建目标'}</h3>
        <p className="dialog-sub">一个真正想要、值得攒钱去换的东西</p>
        <div className="field">
          <label>它是什么？</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="真正喜欢的衣服 / 一台相机 / 一次旅行…"
            autoFocus
          />
        </div>
        <div className="field">
          <label>需要多少钱？</label>
          <div className="amount-wrap">
            <span className="yen">¥</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="300"
            />
          </div>
        </div>
        <div className="field">
          <label>截止日期（可选）</label>
          <input
            className="input"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <div className="btn-row">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn primary" disabled={!valid} onClick={save}>
            {goal ? '保存' : '创建目标'}
          </button>
        </div>
      </div>
    </div>
  )
}
