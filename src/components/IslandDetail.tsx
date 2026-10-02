import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { adjSum, fmt, fundInOf, startOfDay, statsOf, todaySpent } from '../db/stats'
import { useUI } from '../state/uiStore'
import type { Adjustment, Entry } from '../types'
import { ADJ_LABEL } from '../types'
import type { IslandModule } from './IslandBar'

function short(s: string, n = 22): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

function Row({ main, num, numClass, sub }: { main: string; num: string; numClass: string; sub?: string }) {
  return (
    <div className="sheet-row">
      <span className="r-main">{main}</span>
      <span className="r-num">{numClass ? <b className={numClass}>{num}</b> : num}</span>
      {sub && <span className="r-sub">{sub}</span>}
    </div>
  )
}

function adjRow(a: Adjustment): { main: string; num: string } {
  const sign = a.amount >= 0 ? '+' : '−'
  return { main: `手动调整 · ${a.reason}`, num: `${sign}${fmt(Math.abs(a.amount))}` }
}

export function IslandDetail({ index, onClose }: { index: number; onClose: () => void }) {
  const entries = useLiveQuery(() => db.entries.toArray())
  const adjs = useLiveQuery(() => db.adjustments.toArray())
  const goals = useLiveQuery(() => db.goals.toArray())
  const openForm = useUI((s) => s.openForm)
  const setPage = useUI((s) => s.setPage)
  const openAdjust = useUI((s) => s.openAdjust)

  if (!entries || !adjs || !goals) return null

  const byTime = (a: Entry, b: Entry) => b.createdAt - a.createdAt
  const s = statsOf(entries)

  let title = ''
  let amount = ''
  let amountClass = 'pos'
  let body: React.ReactNode = null
  let foot: React.ReactNode = null

  if (index === 0) {
    title = '已节省'
    const total = s.saved + adjSum(adjs, 'SAVED')
    amount = fmt(total)
    const items = entries.filter((e) => e.savedAmount > 0).sort(byTime).slice(0, 6)
    const adjsSaved = adjs.filter((a) => a.type === 'SAVED').sort((a, b) => b.createdAt - a.createdAt)
    body = (
      <>
        {items.map((e) => (
          <Row key={e.id} main={short(e.content)} num={`+${fmt(e.savedAmount)}`} numClass="pos" />
        ))}
        {adjsSaved.map((a) => {
          const r = adjRow(a)
          return <Row key={a.id} main={r.main} num={`${r.num}`} numClass={a.amount >= 0 ? 'pos' : 'neg'} />
        })}
        {items.length === 0 && adjsSaved.length === 0 && (
          <div className="loading" style={{ padding: '18px 0' }}>还没有节省记录</div>
        )}
      </>
    )
    foot = (
      <>
        <button className="btn small" onClick={() => openForm(null)}>
          再记一笔
        </button>
        <button className="btn small" onClick={() => openAdjust('SAVED')}>
          手动调整…
        </button>
      </>
    )
  } else if (index === 1) {
    title = '即将支出'
    const total = s.planned + adjSum(adjs, 'PLANNED')
    amount = fmt(total)
    amountClass = 'amb'
    const items = entries.filter((e) => e.decision === 'PLANNED').sort(byTime)
    const adjsPlanned = adjs.filter((a) => a.type === 'PLANNED').sort((a, b) => b.createdAt - a.createdAt)
    body = (
      <>
        {items.map((e) => (
          <Row
            key={e.id}
            main={short(e.content)}
            num={fmt(e.intendedAmount)}
            numClass="amb"
            sub="待支付"
          />
        ))}
        {adjsPlanned.map((a) => {
          const r = adjRow(a)
          return <Row key={a.id} main={r.main} num={r.num} numClass={a.amount >= 0 ? 'amb' : 'neg'} />
        })}
        {items.length === 0 && adjsPlanned.length === 0 && (
          <div className="loading" style={{ padding: '18px 0' }}>没有已决定、待支付的消费</div>
        )}
      </>
    )
    foot = (
      <>
        <button className="btn small" onClick={() => openForm(null)}>
          记一笔已计划
        </button>
        <button className="btn small" onClick={() => openAdjust('PLANNED')}>
          手动调整…
        </button>
      </>
    )
  } else if (index === 2) {
    title = '大件基金'
    const total = fundInOf(entries, adjs)
    const tSum = goals.filter((g) => g.status === 'ACTIVE').reduce((x, g) => x + g.targetAmount, 0)
    amount = tSum > 0 ? `${fmt(total)} / ${fmt(tSum)}` : fmt(total)
    const inflows = entries.filter((e) => e.fundAmount > 0).sort(byTime).slice(0, 6)
    const adjsFund = adjs.filter((a) => a.type === 'FUND').sort((a, b) => b.createdAt - a.createdAt)
    body = (
      <>
        {goals.filter((g) => g.status !== 'PAUSED').map((g) => {
          const cur = fundInOf(entries, adjs, g.id)
          const pct = Math.min(100, Math.round((cur / g.targetAmount) * 100))
          return (
            <div key={g.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                <span>{g.name}</span>
                <span className="pos">{fmt(cur)} / {fmt(g.targetAmount)}</span>
              </div>
              <div className="prog"><i style={{ width: `${pct}%` }} /></div>
            </div>
          )
        })}
        {inflows.map((e) => {
          const g = goals.find((x) => x.id === e.targetId)
          return (
            <Row
              key={e.id}
              main={short(e.content)}
              num={`+${fmt(e.fundAmount)}`}
              numClass="pos"
              sub={g ? g.name : undefined}
            />
          )
        })}
        {adjsFund.map((a) => {
          const r = adjRow(a)
          return <Row key={a.id} main={r.main} num={r.num} numClass={a.amount >= 0 ? 'pos' : 'neg'} />
        })}
        {inflows.length === 0 && adjsFund.length === 0 && goals.length === 0 && (
          <div className="loading" style={{ padding: '18px 0' }}>还没有目标和拨付记录</div>
        )}
      </>
    )
    foot = (
      <>
        <button
          className="btn small"
          onClick={() => {
            setPage('goals')
            onClose()
          }}
        >
          去我的目标
        </button>
        <button className="btn small" onClick={() => openAdjust('FUND')}>
          手动调整…
        </button>
      </>
    )
  } else {
    const start = startOfDay(Date.now())
    const spentToday = todaySpent(entries, adjs)
    title = '今日已支出'
    amount = fmt(spentToday)
    amountClass = spentToday > 0 ? 'neg' : ''
    const items = entries
      .filter((e) => e.createdAt >= start && e.actualAmount > 0)
      .sort(byTime)
    const adjsActual = adjs
      .filter((a) => a.createdAt >= start && a.type === 'ACTUAL')
      .sort((a, b) => b.createdAt - a.createdAt)
    body = (
      <>
        {items.map((e) => {
          const d = new Date(e.createdAt)
          return (
            <Row
              key={e.id}
              main={short(e.content)}
              num={`−${fmt(e.actualAmount)}`}
              numClass="neg"
              sub={`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`}
            />
          )
        })}
        {adjsActual.map((a) => {
          const r = adjRow(a)
          return <Row key={a.id} main={r.main} num={r.num} numClass={a.amount >= 0 ? 'neg' : 'pos'} />
        })}
        {items.length === 0 && adjsActual.length === 0 && (
          <div className="loading" style={{ padding: '18px 0' }}>今天还没有支出</div>
        )}
      </>
    )
    foot = (
      <>
        <button className="btn small" onClick={() => openForm(null)}>
          记一笔
        </button>
        <button className="btn small" onClick={() => openAdjust('ACTUAL')}>
          手动调整…
        </button>
      </>
    )
  }

  return (
    <>
      <div className="sheet-ov" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-head">
          <span className="sheet-title">{title}</span>
          <b className={`sheet-sub ${amountClass}`} style={{ fontSize: 15 }}>{amount}</b>
          <button className="sheet-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        {body}
        {foot && <div className="sheet-foot">{foot}</div>}
      </div>
    </>
  )
}
