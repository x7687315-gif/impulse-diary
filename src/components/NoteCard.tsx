import type { Entry, Goal } from '../types'
import { DECISION_LABEL, MOTIVE_LABEL, ZONE_LABEL } from '../types'
import { fmt } from '../db/stats'

function hm(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function NoteCard({
  entry,
  goals,
  onEdit,
  onQuickAction,
}: {
  entry: Entry
  goals: Goal[]
  onEdit: (e: Entry) => void
  onQuickAction?: (e: Entry, action: 'pay' | 'cancel') => void
}) {
  const goal = goals.find((g) => g.id === entry.targetId)
  const waitingH = Math.max(0, Math.floor((Date.now() - entry.createdAt) / 3600e3))
  const overdue =
    entry.decision === 'DEFERRED' &&
    entry.bufferUntil !== undefined &&
    entry.bufferUntil < Date.now()

  return (
    <article className="note" onClick={() => onEdit(entry)}>
      <div className="note-time">{hm(entry.createdAt)}</div>
      <p className="note-body">{entry.content}</p>
      {(entry.motive || entry.zone || entry.tags.length > 0) && (
        <div className="note-chips">
          {entry.motive && <span className="tag">{MOTIVE_LABEL[entry.motive]}</span>}
          {entry.zone && <span className="tag">{ZONE_LABEL[entry.zone]}</span>}
          {entry.tags.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      )}
      <div className="note-money">
        {entry.decision === 'RESISTED' && (
          <span className="pos">{DECISION_LABEL[entry.decision]} · +{fmt(entry.savedAmount)} 已节省</span>
        )}
        {entry.decision === 'SUBSTITUTED' && (
          <span className="pos">
            替代消费 · 实付 {fmt(entry.actualAmount)} · +{fmt(entry.savedAmount)} 已节省
          </span>
        )}
        {entry.decision === 'BOUGHT' && (
          <span className="neg">已购买 · −{fmt(entry.actualAmount)}</span>
        )}
        {entry.decision === 'PLANNED' && (
          <span className="amb">已计划 · {fmt(entry.intendedAmount)} 待支付</span>
        )}
        {entry.decision === 'DEFERRED' &&
          (overdue ? (
            <span className="neg">缓冲期已到期 · 点击做个决定</span>
          ) : (
            <span className="amb">待决定 · 已等待 {waitingH} 小时</span>
          ))}
        {entry.fundAmount > 0 && (
          <span className="pos">
            +{fmt(entry.fundAmount)} → 大件基金{goal ? `「${goal.name}」` : ''}
          </span>
        )}
      </div>
      {entry.decision === 'PLANNED' && onQuickAction && (
        <div className="note-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn small" onClick={() => onQuickAction(entry, 'pay')}>
            标记为已支付
          </button>
          <button className="btn small danger" onClick={() => onQuickAction(entry, 'cancel')}>
            不买了
          </button>
        </div>
      )}
    </article>
  )
}
