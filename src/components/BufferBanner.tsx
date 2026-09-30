import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useUI } from '../state/uiStore'
import { fmt } from '../db/stats'
import { Icon } from './icons'

export function BufferBanner() {
  const [open, setOpen] = useState(false)
  const openForm = useUI((s) => s.openForm)

  const due = useLiveQuery(async () => {
    const now = Date.now()
    const all = await db.entries.where('decision').equals('DEFERRED').toArray()
    return all
      .filter((e) => e.bufferUntil !== undefined && e.bufferUntil < now)
      .sort((a, b) => (a.bufferUntil ?? 0) - (b.bufferUntil ?? 0))
  }, [])

  if (!due || due.length === 0) return null

  return (
    <div className="banner">
      <button className="banner-head" onClick={() => setOpen(!open)}>
        <Icon name="clock" size={15} />
        <span className="flex1">有 {due.length} 笔缓冲期到了，做个决定吧</span>
        <span>{open ? '收起' : '展开'}</span>
      </button>
      {open &&
        due.map((e) => (
          <div key={e.id} className="banner-item">
            <span className="banner-text">{e.content}</span>
            <span className="banner-sub">
              {fmt(e.intendedAmount)} · 已等 {Math.floor((Date.now() - e.createdAt) / 3600e3)} 小时
            </span>
            <button className="btn small" onClick={() => openForm(e.id)}>
              去决定
            </button>
          </div>
        ))}
    </div>
  )
}
