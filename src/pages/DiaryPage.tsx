import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Entry } from '../types'
import { NoteCard } from '../components/NoteCard'
import { BufferBanner } from '../components/BufferBanner'
import { useUI } from '../state/uiStore'
import { startOfDay } from '../db/stats'

const WD = ['日', '一', '二', '三', '四', '五', '六']

interface DayGroup {
  key: string
  label: string
  items: Entry[]
}

function groupByDay(entries: Entry[]): DayGroup[] {
  const out: DayGroup[] = []
  let cur: DayGroup | null = null
  for (const e of entries) {
    const d = new Date(e.createdAt)
    const k = startOfDay(e.createdAt)
    if (!cur || cur.key !== String(k)) {
      cur = {
        key: String(k),
        label: `${d.getMonth() + 1}月${d.getDate()}日 · 星期${WD[d.getDay()]}`,
        items: [],
      }
      out.push(cur)
    }
    cur.items.push(e)
  }
  for (const g of out) g.items.reverse()
  return out
}

export function DiaryPage() {
  const entries = useLiveQuery(() => db.entries.orderBy('createdAt').reverse().toArray())
  const goals = useLiveQuery(() => db.goals.toArray())
  const openForm = useUI((s) => s.openForm)

  if (!entries || !goals) return <div className="loading">…</div>

  const groups = groupByDay(entries)

  return (
    <div>
      <BufferBanner />
      {groups.length === 0 && (
        <div className="empty-note">
          还没有任何记录。
          <br />
          产生消费冲动的时候，点右下角的 ＋，记一笔。
        </div>
      )}
      {groups.map((g) => (
        <section key={g.key}>
          <h2 className="day-head">
            {g.label}
            <span>{g.items.length} 条</span>
          </h2>
          {g.items.map((e) => (
            <NoteCard key={e.id} entry={e} goals={goals} onEdit={(en) => openForm(en.id)} />
          ))}
        </section>
      ))}
    </div>
  )
}
