import type { Decision, Entry, Adjustment, AdjType, Goal } from '../types'
import { db } from './db'

export interface MoneyStats {
  impulse: number
  actual: number
  saved: number
  planned: number
  fundIn: number
  count: number
}

export function fmt(n: number): string {
  const v = Math.round(n * 100) / 100
  return '¥' + (Number.isInteger(v) ? String(v) : v.toFixed(2))
}

export function signed(n: number): string {
  return (n >= 0 ? '+' : '−') + fmt(Math.abs(n))
}

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function addDays(ts: number, n: number): number {
  const d = new Date(ts)
  d.setDate(d.getDate() + n)
  return d.getTime()
}

export interface Range { start: number; end: number }

export function weekRange(offset = 0): Range {
  const now = new Date()
  const dow = (now.getDay() + 6) % 7
  const start = addDays(startOfDay(now.getTime()), -dow + offset * 7)
  return { start, end: addDays(start, 7) }
}

export function monthRange(offset = 0): Range {
  const d = new Date()
  const m = d.getMonth() + offset
  const start = new Date(d.getFullYear() + Math.floor(m / 12), ((m % 12) + 12) % 12, 1).getTime()
  const em = ((m % 12) + 12) % 12 + 1
  const end = new Date(d.getFullYear() + Math.floor(m / 12) + Math.floor(em / 12), em % 12, 1).getTime()
  return { start, end }
}

export function yearRange(offset = 0): Range {
  const y = new Date().getFullYear() + offset
  return { start: new Date(y, 0, 1).getTime(), end: new Date(y + 1, 0, 1).getTime() }
}

export function inRange(ts: number, r: Range): boolean {
  return ts >= r.start && ts < r.end
}

/** 今日已支出：当日实际支出（含手动调整的 ACTUAL 流水） */
export function todaySpent(entries: Entry[], adjs: Adjustment[]): number {
  const start = startOfDay(Date.now())
  const spent = entries
    .filter((e) => e.createdAt >= start)
    .reduce((s, e) => s + e.actualAmount, 0)
  const adj = adjs
    .filter((a) => a.createdAt >= start && a.type === 'ACTUAL')
    .reduce((s, a) => s + a.amount, 0)
  return spent + adj
}

// 口径（与 design-spec.md §4 矩阵一一对应）
export function statsOf(entries: Entry[]): Omit<MoneyStats, 'fundIn'> {
  let impulse = 0, actual = 0, saved = 0, planned = 0
  for (const e of entries) {
    impulse += e.intendedAmount
    actual += e.actualAmount
    saved += e.savedAmount
    if (e.decision === 'PLANNED') planned += e.intendedAmount
  }
  return { impulse, actual, saved, planned, count: entries.length }
}

/** 基金总池：所有存入金额（含手动调整），不再按目标拆分 */
export function fundPool(entries: Entry[], adjs: Adjustment[]): number {
  const fromEntries = entries.reduce((s, e) => s + e.fundAmount, 0)
  const fromAdj = adjs
    .filter((a) => a.type === 'FUND')
    .reduce((s, a) => s + a.amount, 0)
  return fromEntries + fromAdj
}

export interface FundStage {
  goal: Goal
  /** 瀑布分配后该目标实际拿到的金额 */
  allocated: number
  reached: boolean
  /** 是否为当前正在存入的目标（第一个未达成的） */
  filling: boolean
}

/**
 * 瀑布式自动分配：目标按创建时间排序，钱先填满第一个，
 * 溢出自动流入第二个、第三个……（用户无需手动选择存入哪个目标）
 */
export function allocateFund(goals: Goal[], pool: number): FundStage[] {
  const out: FundStage[] = []
  let rest = pool
  const sorted = [...goals].sort((a, b) => a.createdAt - b.createdAt)
  sorted.forEach((g, i) => {
    const allocated = Math.max(0, Math.min(rest, g.targetAmount))
    const reached = allocated >= g.targetAmount
    const filling = !reached && (i === 0 || out[i - 1].reached)
    out.push({ goal: g, allocated, reached, filling })
    rest -= allocated
  })
  return out
}

/** 实时读取当前基金总池（保存前用于对比是否跨过达成线） */
export async function fundPoolNow(): Promise<number> {
  const [es, as] = await Promise.all([db.entries.toArray(), db.adjustments.toArray()])
  return fundPool(es, as)
}

export function adjSum(adjs: Adjustment[], type: AdjType, targetId?: string): number {
  return adjs
    .filter((a) => a.type === type && (!targetId || a.targetId === targetId))
    .reduce((s, a) => s + a.amount, 0)
}

// 决策 → 金额推导（唯一实现，表单预览与入库共用）
export function deriveAmounts(
  decision: Decision,
  intended: number,
  actualOverride?: number,
): { actual: number; saved: number } {
  switch (decision) {
    case 'BOUGHT':
      return { actual: actualOverride ?? intended, saved: 0 }
    case 'RESISTED':
      return { actual: 0, saved: intended }
    case 'SUBSTITUTED': {
      const a = actualOverride ?? 0
      return { actual: a, saved: Math.max(0, intended - a) }
    }
    default:
      return { actual: 0, saved: 0 }
  }
}

// 逐日聚合（周/月趋势用）
export interface DaySums { impulse: number; saved: number; actual: number }
export function sumsByDay(entries: Entry[], dayStarts: number[]): DaySums[] {
  const map = new Map<number, DaySums>()
  for (const d of dayStarts) map.set(d, { impulse: 0, saved: 0, actual: 0 })
  for (const e of entries) {
    const k = startOfDay(e.createdAt)
    const cell = map.get(k)
    if (cell) {
      cell.impulse += e.intendedAmount
      cell.saved += e.savedAmount
      cell.actual += e.actualAmount
    }
  }
  return dayStarts.map((d) => map.get(d)!)
}
