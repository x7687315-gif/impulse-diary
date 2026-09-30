import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Entry } from '../types'
import { NoteCard } from '../components/NoteCard'
import { BufferBanner } from '../components/BufferBanner'
import { useUI } from '../state/uiStore'
import { startOfDay, addDays, fmt } from '../db/stats'
import { loadPrefs, savePrefs } from '../db/prefs'

const WD = ['日', '一', '二', '三', '四', '五', '六']
const RANGES = [1, 3, 7, 30]

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
  const showToast = useUI((s) => s.showToast)
  const [range, setRange] = useState(loadPrefs().diaryRange ?? 1)

  const filtered = useMemo(() => {
    if (!entries) return []
    const start = addDays(startOfDay(Date.now()), -(range - 1))
    return entries.filter((e) => e.createdAt >= start)
  }, [entries, range])

  if (!entries || !goals) return <div className="loading">…</div>

  function changeRange(d: number) {
    setRange(d)
    const p = loadPrefs()
    p.diaryRange = d
    savePrefs(p)
  }

  async function quickPay(e: Entry) {
    await db.entries.update(e.id, {
      decision: 'BOUGHT',
      actualAmount: e.intendedAmount,
      savedAmount: 0,
      fundAmount: 0,
      resolvedAt: Date.now(),
      updatedAt: Date.now(),
    })
    showToast(`已支付 ${fmt(e.intendedAmount)} · 记入实际支出`)
  }

  async function quickCancel(e: Entry) {
    await db.entries.update(e.id, {
      decision: 'RESISTED',
      actualAmount: 0,
      savedAmount: e.intendedAmount,
      fundAmount: 0,
      resolvedAt: Date.now(),
      updatedAt: Date.now(),
    })
    showToast(`+${fmt(e.intendedAmount)} 已节省 · 想存基金的话进编辑页拨付`)
  }

  const groups = groupByDay(filtered)

  return (
    <div>
      <BufferBanner />
      <div className="tabs" style={{ marginBottom: 16 }}>
        {RANGES.map((r) => (
          <button key={r} className={'tab' + (range === r ? ' on' : '')} onClick={() => changeRange(r)}>
            {r === 1 ? '今天' : `${r} 天内`}
          </button>
        ))}
      </div>
      {groups.length === 0 && (
        <div className="empty-note">
          这个时间范围内还没有记录。
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
            <NoteCard
              key={e.id}
              entry={e}
              goals={goals}
              onEdit={(en) => openForm(en.id)}
              onQuickAction={(en, action) => (action === 'pay' ? quickPay(en) : quickCancel(en))}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
