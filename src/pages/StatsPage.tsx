import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  addDays,
  adjSum,
  fundInOf,
  fmt,
  inRange,
  startOfDay,
  statsOf,
  sumsByDay,
  type Range,
} from '../db/stats'
import { BarChart, DistBar, TrendLine, type Series } from '../components/charts'
import { Icon } from '../components/icons'
import type { Motive } from '../types'
import { MOTIVE_LABEL } from '../types'
import { useUI } from '../state/uiStore'

type Tab = 'week' | 'month' | 'year'

const C_IMPULSE = 'var(--chart-impulse)'
const C_SAVE = 'var(--chart-save)'
const C_SPEND = 'var(--chart-spend)'
const MOTIVE_COLORS: Record<Motive, string> = {
  STRESS: 'var(--chart-m-stress)',
  WANT: 'var(--chart-m-want)',
  SOCIAL: 'var(--chart-m-social)',
  NECESSITY: 'var(--chart-m-necessity)',
  OTHER: 'var(--chart-m-other)',
}

function monthDays(range: Range): number[] {
  const out: number[] = []
  let d = startOfDay(range.start)
  while (d < range.end) {
    out.push(d)
    d = addDays(d, 1)
  }
  return out
}

function monthStarts(range: Range): { starts: number[]; labels: string[] } {
  const starts: number[] = []
  const labels: string[] = []
  const end = new Date(range.end)
  const d = new Date(range.start)
  d.setDate(1)
  while (d < end) {
    starts.push(d.getTime())
    labels.push(`${d.getMonth() + 1}月`)
    d.setMonth(d.getMonth() + 1)
  }
  return { starts, labels }
}

export function StatsPage() {
  const [tab, setTab] = useState<Tab>('week')
  const [offset, setOffset] = useState(0)
  const openAdjust = useUI((s) => s.openAdjust)

  const allEntries = useLiveQuery(() => db.entries.toArray())
  const allAdjs = useLiveQuery(() => db.adjustments.toArray())

  const range = useMemo<Range>(() => {
    if (tab === 'week') {
      const now = new Date()
      const dow = (now.getDay() + 6) % 7
      const start = addDays(startOfDay(now.getTime()), -dow + offset * 7)
      return { start, end: addDays(start, 7) }
    }
    if (tab === 'month') {
      const d = new Date()
      const m = d.getMonth() + offset
      const y = d.getFullYear() + Math.floor(m / 12)
      const mm = ((m % 12) + 12) % 12
      return { start: new Date(y, mm, 1).getTime(), end: new Date(y, mm + 1, 1).getTime() }
    }
    const y = new Date().getFullYear() + offset
    return { start: new Date(y, 0, 1).getTime(), end: new Date(y + 1, 0, 1).getTime() }
  }, [tab, offset])

  if (!allEntries || !allAdjs) return <div className="loading">…</div>

  const es = allEntries.filter((e) => inRange(e.createdAt, range))
  const as = allAdjs.filter((a) => inRange(a.createdAt, range))
  const st = statsOf(es)
  const fundIn = fundInOf(es, as)

  const fd = (ts: number) => `${new Date(ts).getMonth() + 1}月${new Date(ts).getDate()}日`
  const rangeTitle =
    tab === 'week'
      ? `${fd(range.start)} – ${fd(addDays(range.end, -1))}`
      : tab === 'month'
        ? `${new Date(range.start).getFullYear()}年${new Date(range.start).getMonth() + 1}月`
        : `${new Date(range.start).getFullYear()}年`

  const adjustNotes: { label: string; sum: number; cls: string }[] = [
    { label: '已节省', sum: adjSum(as, 'SAVED'), cls: 'pos' },
    { label: '实际支出', sum: adjSum(as, 'ACTUAL'), cls: 'neg' },
    { label: '即将支出', sum: adjSum(as, 'PLANNED'), cls: 'amb' },
    { label: '大件基金', sum: adjSum(as, 'FUND'), cls: 'pos' },
  ].filter((x) => x.sum !== 0)

  let chart: React.ReactNode = null
  if (tab === 'week') {
    const days = monthDays(range)
    const sums = sumsByDay(es, days)
    const series: Series[] = [
      { name: '冲动', color: C_IMPULSE, values: sums.map((s) => s.impulse) },
      { name: '节省', color: C_SAVE, values: sums.map((s) => s.saved) },
      { name: '支出', color: C_SPEND, values: sums.map((s) => s.actual) },
    ]
    chart = <BarChart labels={days.map((d) => '周' + '日一二三四五六'[new Date(d).getDay()])} series={series} />
  } else if (tab === 'month') {
    const days = monthDays(range)
    const sums = sumsByDay(es, days)
    const series: Series[] = [
      { name: '冲动', color: C_IMPULSE, values: sums.map((s) => s.impulse) },
      { name: '节省', color: C_SAVE, values: sums.map((s) => s.saved) },
    ]
    chart = <TrendLine labels={days.map((d) => String(new Date(d).getDate()))} series={series} />
  } else {
    const { starts, labels } = monthStarts(range)
    const sums = starts.map((m0) => {
      const m1 = new Date(m0)
      m1.setMonth(m1.getMonth() + 1)
      const bucket = es.filter((e) => e.createdAt >= m0 && e.createdAt < m1.getTime())
      return statsOf(bucket)
    })
    const series: Series[] = [
      { name: '冲动', color: C_IMPULSE, values: sums.map((s) => s.impulse) },
      { name: '节省', color: C_SAVE, values: sums.map((s) => s.saved) },
      { name: '支出', color: C_SPEND, values: sums.map((s) => s.actual) },
    ]
    chart = <BarChart labels={labels} series={series} />
  }

  const dist = (Object.keys(MOTIVE_LABEL) as Motive[]).map((m) => ({
    label: MOTIVE_LABEL[m],
    value: es.filter((e) => e.motive === m).length,
    color: MOTIVE_COLORS[m],
  }))

  return (
    <div>
      <p className="page-title">看见自己的消费行为，本身就是改变</p>
      <div className="tabs">
        {(
          [
            ['week', '周'],
            ['month', '月'],
            ['year', '年'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            className={'tab' + (tab === k ? ' on' : '')}
            onClick={() => {
              setTab(k)
              setOffset(0)
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="range-nav">
        <button className="icon-btn" onClick={() => setOffset((o) => o - 1)} aria-label="上一时段">
          <Icon name="left" />
        </button>
        <span className="range-title">{rangeTitle}</span>
        <button
          className="icon-btn"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset >= 0}
          aria-label="下一时段"
        >
          <Icon name="right" />
        </button>
      </div>

      <div className="metrics">
        <div className="metric">
          <div className="lab">消费冲动</div>
          <div className="val">{fmt(st.impulse)}</div>
          <div className="cnt">{st.count} 次</div>
        </div>
        <div className="metric">
          <div className="lab">实际支出</div>
          <div className="val" style={{ color: 'var(--spend)' }}>{fmt(st.actual)}</div>
        </div>
        <div className="metric">
          <div className="lab">已节省</div>
          <div className="val" style={{ color: 'var(--save)' }}>{fmt(st.saved)}</div>
        </div>
        <div className="metric">
          <div className="lab">即将支出</div>
          <div className="val" style={{ color: 'var(--pending)' }}>{fmt(st.planned)}</div>
        </div>
        <div className="metric">
          <div className="lab">存入基金</div>
          <div className="val" style={{ color: 'var(--save)' }}>{fmt(fundIn)}</div>
        </div>
      </div>

      {adjustNotes.length > 0 && (
        <div className="card-block" style={{ padding: '12px 16px' }}>
          {adjustNotes.map((n) => (
            <div key={n.label} className="adj-note">
              手动调整 · {n.label} <b className={n.cls}>{n.sum >= 0 ? '+' : '−'}{fmt(Math.abs(n.sum))}</b>
            </div>
          ))}
        </div>
      )}

      <div className="card-block">
        <p className="block-title">{tab === 'week' ? '每天的变化' : tab === 'month' ? '本月的趋势' : '12 个月的变化'}</p>
        <div className="legend">
          {(tab === 'month'
            ? [
                { name: '冲动', color: C_IMPULSE },
                { name: '节省', color: C_SAVE },
              ]
            : [
                { name: '冲动', color: C_IMPULSE },
                { name: '节省', color: C_SAVE },
                { name: '支出', color: C_SPEND },
              ]
          ).map((s) => (
            <span key={s.name}>
              <i style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
        {chart}
      </div>

      {tab === 'month' && (
        <div className="card-block">
          <p className="block-title">消费冲动来自哪里</p>
          <DistBar items={dist} />
        </div>
      )}

      <button className="btn" style={{ width: '100%' }} onClick={() => openAdjust()}>
        手动调整统计（金额 + 原因）
      </button>
    </div>
  )
}
