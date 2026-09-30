export interface Series {
  name: string
  color: string
  values: number[]
}

const INK3 = '#A8A69E'

export function BarChart({
  labels,
  series,
  height = 190,
}: {
  labels: string[]
  series: Series[]
  height?: number
}) {
  const W = 640
  const H = height
  const padT = 8
  const padB = 22
  const n = labels.length
  const plotH = H - padT - padB
  const max = Math.max(1, ...series.flatMap((s) => s.values))
  const groupW = W / n
  const barGap = 2
  const barW = Math.max(2, (groupW * 0.68 - barGap * (series.length - 1)) / series.length)
  const labelStep = Math.ceil(n / 16)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ display: 'block' }}>
      <line x1="0" y1={H - padB} x2={W} y2={H - padB} stroke="#E7E5DE" strokeWidth="1" />
      {series.map((s, j) =>
        s.values.map((v, i) => {
          const h = (v / max) * plotH
          if (v <= 0) return null
          const x = i * groupW + groupW * 0.16 + j * (barW + barGap)
          return (
            <rect
              key={`${j}-${i}`}
              x={x}
              y={H - padB - h}
              width={barW}
              height={h}
              rx={2}
              style={{ fill: s.color }}
            />
          )
        }),
      )}
      {labels.map((l, i) =>
        i % labelStep === 0 ? (
          <text
            key={i}
            x={i * groupW + groupW / 2}
            y={H - 6}
            textAnchor="middle"
            fontSize="11"
            fill={INK3}
          >
            {l}
          </text>
        ) : null,
      )}
    </svg>
  )
}

export function TrendLine({
  labels,
  series,
  height = 190,
}: {
  labels: string[]
  series: Series[]
  height?: number
}) {
  const W = 640
  const H = height
  const padT = 10
  const padB = 22
  const n = labels.length
  const plotH = H - padT - padB
  const max = Math.max(1, ...series.flatMap((s) => s.values))
  const xAt = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * (W - 16) + 8)
  const yAt = (v: number) => padT + plotH * (1 - v / max)
  const labelStep = Math.ceil(n / 12)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ display: 'block' }}>
      <line x1="0" y1={H - padB} x2={W} y2={H - padB} stroke="#E7E5DE" strokeWidth="1" />
      {series.map((s) => (
        <polyline
          key={s.name}
          points={s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ')}
          fill="none"
          style={{ stroke: s.color }}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {series.map((s) => {
        const last = s.values.length - 1
        if (last < 0) return null
        return (
          <circle
            key={`dot-${s.name}`}
            cx={xAt(last)}
            cy={yAt(s.values[last])}
            r="3"
            style={{ fill: s.color }}
          />
        )
      })}
      {labels.map((l, i) =>
        i % labelStep === 0 ? (
          <text key={i} x={xAt(i)} y={H - 6} textAnchor="middle" fontSize="11" fill={INK3}>
            {l}
          </text>
        ) : null,
      )}
    </svg>
  )
}

export function DistBar({
  items,
}: {
  items: { label: string; value: number; color: string }[]
}) {
  const total = items.reduce((s, it) => s + it.value, 0)
  if (total === 0) return <div className="loading" style={{ padding: '14px 0' }}>本时段暂无数据</div>
  return (
    <div>
      <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2 }}>
        {items
          .filter((it) => it.value > 0)
          .map((it) => (
            <div
              key={it.label}
              style={{ width: `${(it.value / total) * 100}%`, background: it.color, minWidth: 3 }}
              title={`${it.label} ${it.value} 次`}
            />
          ))}
      </div>
      <div className="legend" style={{ marginTop: 10 }}>
        {items
          .filter((it) => it.value > 0)
          .sort((a, b) => b.value - a.value)
          .map((it) => (
            <span key={it.label}>
              <i style={{ background: it.color }} />
              {it.label} · {it.value} 次 · {Math.round((it.value / total) * 100)}%
            </span>
          ))}
      </div>
    </div>
  )
}
