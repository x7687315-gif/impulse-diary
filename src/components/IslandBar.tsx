import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { adjSum, fmt, fundInOf, statsOf, todaySpent } from '../db/stats'
import { useUI } from '../state/uiStore'
import { Icon, type IconName } from './icons'
import { IslandDetail } from './IslandDetail'

export type IslandKey = 'saved' | 'upcoming' | 'fund' | 'today'

export interface IslandModule {
  key: IslandKey
  label: string
  amount: string
  tone: string
  bg: string
  icon: IconName
  progress?: number
}

const TONES = {
  save: { tone: 'var(--save)', bg: 'var(--save-bg)' },
  spend: { tone: 'var(--spend)', bg: 'var(--spend-bg)' },
  pending: { tone: 'var(--pending)', bg: 'var(--pending-bg)' },
}

export function IslandBar() {
  const entries = useLiveQuery(() => db.entries.toArray())
  const adjs = useLiveQuery(() => db.adjustments.toArray())
  const goals = useLiveQuery(() => db.goals.toArray())

  const [idx, setIdx] = useState(0)
  const [detail, setDetail] = useState<number | null>(null)
  const clickTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pdown = useRef<{ x: number; y: number } | null>(null)
  const expanded = useUI((s) => s.islandExpanded)
  const setExpanded = useUI((s) => s.setIslandExpanded)

  const mods: IslandModule[] = useMemo(() => {
    if (!entries || !adjs || !goals) return []
    const s = statsOf(entries)
    const saved = s.saved + adjSum(adjs, 'SAVED')
    const upcoming = s.planned + adjSum(adjs, 'PLANNED')
    const fund = goals
      .filter((g) => g.status === 'ACTIVE')
      .reduce((x, g) => x + fundInOf(entries, adjs, g.id), 0)
    const spentToday = todaySpent(entries, adjs)
    const tSum = goals.filter((g) => g.status === 'ACTIVE').reduce((x, g) => x + g.targetAmount, 0)
    return [
      { key: 'saved', label: '已节省', amount: fmt(saved), icon: 'saved', ...TONES.save },
      { key: 'upcoming', label: '即将支出', amount: fmt(upcoming), icon: 'outgoing', ...TONES.pending },
      {
        key: 'fund',
        label: '大件基金',
        amount: tSum > 0 ? `${fmt(fund)} / ${fmt(tSum)}` : fmt(fund),
        icon: 'fund',
        ...TONES.save,
        progress: tSum > 0 ? Math.min(1, fund / tSum) : undefined,
      },
      {
        key: 'today',
        label: '今日已支出',
        amount: fmt(spentToday),
        icon: 'cart',
        tone: spentToday > 0 ? TONES.spend.tone : 'var(--ink-3)',
        bg: spentToday > 0 ? TONES.spend.bg : 'var(--card-2)',
      },
    ]
  }, [entries, adjs, goals])

  if (mods.length === 0) return null

  const slide = (d: number) => setIdx((i) => (i + d + mods.length) % mods.length)
  const toggle = () => setExpanded(!expanded)
  const openDetail = (i: number) => setDetail(i)
  const pillClick = (i: number) => {
    clearTimeout(clickTimer.current)
    clickTimer.current = setTimeout(() => openDetail(i), 240)
  }
  const pillDbl = () => {
    clearTimeout(clickTimer.current)
    toggle()
  }
  const onDown = (e: RPointerEvent) => {
    pdown.current = { x: e.clientX, y: e.clientY }
  }
  const onUp = (e: RPointerEvent) => {
    if (!pdown.current) return
    const dx = e.clientX - pdown.current.x
    const dy = e.clientY - pdown.current.y
    pdown.current = null
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) && !expanded) slide(dx < 0 ? 1 : -1)
  }

  const m = mods[idx]

  return (
    <>
      {!expanded ? (
        <>
          <div
            className="pill island"
            key={idx}
            onClick={() => pillClick(idx)}
            onDoubleClick={pillDbl}
            onPointerDown={onDown}
            onPointerUp={onUp}
            title="滑动切换 · 单击明细 · 双击展开"
          >
            <span className="pill-ic" style={{ background: m.bg, color: m.tone }}>
              <Icon name={m.icon} size={16} />
            </span>
            <span className="pill-label">{m.label}</span>
            <span className="pill-amount bump" key={m.amount} style={{ color: m.tone }}>{m.amount}</span>
          </div>
          <div className="island-dots">
            {mods.map((_, i) => (
              <i
                key={i}
                className={i === idx ? 'on' : ''}
                onClick={() => setIdx(i)}
                role="button"
                aria-label={`切换到第 ${i + 1} 个岛：${mods[i].label}`}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="island-stack" onPointerDown={onDown} onPointerUp={onUp}>
          {mods.map((mm, i) => (
            <div
              key={mm.key}
              className="pill"
              style={{ animationDelay: `${i * 55}ms` }}
              onClick={(e) => {
                e.stopPropagation()
                pillClick(i)
              }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                pillDbl()
              }}
            >
              <div className="pill-row">
                <span className="pill-ic" style={{ background: mm.bg, color: mm.tone }}>
                  <Icon name={mm.icon} size={16} />
                </span>
                <span className="pill-label">{mm.label}</span>
                <span className="pill-amount bump" key={mm.amount} style={{ color: mm.tone }}>{mm.amount}</span>
              </div>
              {mm.progress !== undefined && (
                <div className="prog"><i style={{ width: `${Math.round(mm.progress * 100)}%` }} /></div>
              )}
            </div>
          ))}
          <div className="island-dots" style={{ marginTop: 2 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>双击收起</span>
          </div>
        </div>
      )}
      {detail !== null && <IslandDetail index={detail} onClose={() => setDetail(null)} />}
    </>
  )
}
