import { CartesianGrid, ComposedChart, Line, LineChart, Pie, PieChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SOURCES, SOURCE_ORDER, STATE_ORDER, STATES } from '../engine/constants.js'
import { STATE_HEX } from './ui.jsx'
import { five } from '../lib/format.js'

const AXIS = { fontSize: 11, fill: '#5C5640', fontFamily: 'Space Mono' }
const SRC_SHAPE = { assessment: 'square', manager: 'diamond', peer: 'circle', project: 'triangle', training: 'cross', kpi: 'bar' }

function Shape({ kind, cx, cy, s = 4.5 }) {
  const common = { fill: '#FFF8F3', stroke: '#1A0F08', strokeWidth: 1.5 }
  if (kind === 'square') return <rect x={cx - s} y={cy - s} width={s * 2} height={s * 2} {...common} />
  if (kind === 'diamond') return <path d={`M${cx} ${cy - s - 1}L${cx + s + 1} ${cy}L${cx} ${cy + s + 1}L${cx - s - 1} ${cy}Z`} {...common} />
  if (kind === 'triangle') return <path d={`M${cx} ${cy - s - 1}L${cx + s + 1} ${cy + s}L${cx - s - 1} ${cy + s}Z`} {...common} />
  if (kind === 'cross') return <path d={`M${cx - s} ${cy - s}L${cx + s} ${cy + s}M${cx + s} ${cy - s}L${cx - s} ${cy + s}`} stroke="#1A0F08" strokeWidth={2} />
  if (kind === 'bar') return <rect x={cx - s} y={cy - 2} width={s * 2} height={4} fill="#1A0F08" />
  return <circle cx={cx} cy={cy} r={s} {...common} />
}

export function SourceLegend({ sources }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] uppercase text-olive">
      <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-5 bg-rust" />Cycle score</span>
      {SOURCE_ORDER.filter((s) => sources.includes(s)).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5"><svg width="12" height="12"><Shape kind={SRC_SHAPE[s]} cx={6} cy={6} s={4} /></svg>{SOURCES[s].label}</span>
      ))}
    </div>
  )
}

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="panel min-w-[200px] px-3 py-2.5 text-[12px]">
      <div className="font-mono text-[11px] font-bold uppercase">{r.label}</div>
      {r.score != null ? (
        <>
          <div className="mt-1 flex items-baseline gap-1.5"><span className="num font-head text-2xl font-bold">{Math.round(r.score)}</span><span className="text-olive">/ 100 · {five(r.score)} / 5</span></div>
          <div className="mt-1.5 space-y-0.5 border-t-2 border-ink pt-1.5">
            {SOURCE_ORDER.filter((s) => r.sources?.[s] != null).map((s) => (
              <div key={s} className="flex justify-between gap-3"><span className="text-ink-70">{SOURCES[s].label}</span><span className="num font-mono font-bold">{Math.round(r.sources[s])}</span></div>
            ))}
          </div>
          <div className="mt-1 text-olive">{r.n} signal{r.n === 1 ? '' : 's'} this cycle</div>
        </>
      ) : <div className="mt-1 text-insufficient">No evidence this cycle</div>}
    </div>
  )
}

/** Longitudinal trajectory for one competency, drawn on grid paper. */
export function TrajectoryChart({ a, height = 280, baseline }) {
  const rows = a.trajectory.map((t) => {
    const r = { ...t }
    for (const s of SOURCE_ORDER) r[`s_${s}`] = t.sources?.[s] ?? null
    return r
  })
  const used = SOURCE_ORDER.filter((s) => rows.some((r) => r[`s_${s}`] != null))
  const vals = rows.flatMap((r) => [r.score, ...used.map((s) => r[`s_${s}`])]).filter((v) => v != null)
  const lo = Math.max(0, Math.floor((Math.min(...vals, 50) - 8) / 10) * 10)
  const hi = Math.min(100, Math.ceil((Math.max(...vals, 70) + 6) / 10) * 10)
  const ticks = []
  for (let t = lo; t <= hi; t += 10) ticks.push(t)
  const last = rows.findLastIndex((r) => r.score != null)
  return (
    <div className="grid-paper border-2 border-ink" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 22, right: 20, bottom: 6, left: -8 }}>
          <CartesianGrid stroke="#E6DAC0" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#1A0F08', strokeWidth: 2 }} padding={{ left: 28, right: 28 }} />
          <YAxis domain={[lo, hi]} ticks={ticks} tick={AXIS} tickLine={false} axisLine={false} width={44} />
          <Tooltip content={<Tip />} cursor={{ stroke: '#1A0F08', strokeDasharray: '3 3' }} />
          {baseline != null && <ReferenceLine y={baseline} stroke="#1A0F08" strokeDasharray="5 4" label={{ value: `BASELINE ${baseline}`, position: 'insideTopLeft', fontSize: 10, fontFamily: 'Space Mono', fill: '#1A0F08' }} />}
          {used.map((s, i) => (
            <Line key={s} dataKey={`s_${s}`} stroke="transparent" isAnimationActive={false} activeDot={false} legendType="none"
              dot={({ cx, cy, value, index }) => (value == null || cx == null ? <g key={`${s}${index}`} /> : <g key={`${s}${index}`}><Shape kind={SRC_SHAPE[s]} cx={cx + (i - (used.length - 1) / 2) * 7} cy={cy} /></g>)} />
          ))}
          <Line type="linear" dataKey="score" stroke="#B8460F" strokeWidth={3} connectNulls={false} animationDuration={600}
            dot={({ cx, cy, index, payload }) => payload.score == null || cx == null ? <g key={index} /> : (
              <g key={index}>
                <rect x={cx - 6} y={cy - 6} width={12} height={12} fill={index === last ? '#B8460F' : '#FFF8F3'} stroke="#1A0F08" strokeWidth={2} />
                {index === last && <text x={cx} y={cy - 12} textAnchor="middle" fontFamily="Oswald" fontWeight="700" fontSize="15" fill="#1A0F08">{Math.round(payload.score)}</text>}
              </g>
            )} activeDot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Sparkline({ a, width = 90, height = 30 }) {
  const data = a.trajectory.map((t) => ({ v: t.score }))
  if (data.filter((d) => d.v != null).length < 2) {
    return <svg width={width} height={height} aria-hidden><line x1="2" y1={height / 2} x2={width - 2} y2={height / 2} stroke="#3452D8" strokeWidth="2" strokeDasharray="3 4" /></svg>
  }
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis hide domain={['dataMin - 4', 'dataMax + 4']} />
          <Line type="linear" dataKey="v" stroke={STATE_HEX[a.state]} strokeWidth={2.5} isAnimationActive={false} connectNulls={false}
            dot={({ cx, cy, index }) => (index === data.length - 1 && cx != null ? <rect key="d" x={cx - 3} y={cy - 3} width={6} height={6} fill={STATE_HEX[a.state]} /> : <g key={index} />)} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Skill-health donut. Segment order is the CVD-validated order, separated by ink gaps. */
export function HealthDonut({ counts, total, size = 176 }) {
  const data = STATE_ORDER.map((s) => ({ name: STATES[s].label, key: s, value: counts[s] })).filter((d) => d.value > 0)
  const pct = Math.round((counts.improving / total) * 100)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={size * 0.3} outerRadius={size * 0.48} startAngle={90} endAngle={-270} stroke="#1A0F08" strokeWidth={2} isAnimationActive={false}>
            {data.map((d) => <Cell key={d.key} fill={STATE_HEX[d.key]} />)}
          </Pie>
          <Tooltip content={({ active, payload }) => active && payload?.length ? <div className="panel px-2.5 py-1.5 text-[12px] font-semibold">{payload[0].name}: {payload[0].value}</div> : null} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="num font-head text-[32px] font-bold leading-none">{pct}%</span>
        <span className="mt-1 text-[11px] text-olive">improving</span>
      </div>
    </div>
  )
}

/** Organisation trajectory: mean score per cycle on the 5-point scale. */
export function TeamTrend({ rows, height = 200 }) {
  return (
    <div className="grid-paper border-2 border-ink" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 22, right: 22, bottom: 6, left: 0 }}>
          <CartesianGrid stroke="#E6DAC0" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#1A0F08', strokeWidth: 2 }} padding={{ left: 24, right: 24 }} />
          <YAxis domain={[3, 4.5]} ticks={[3, 3.5, 4, 4.5]} tickFormatter={(v) => v.toFixed(1)} tick={AXIS} tickLine={false} axisLine={false} width={40} />
          <Tooltip content={({ active, payload }) => active && payload?.length ? <div className="panel px-3 py-2 text-[12px]"><div className="font-mono text-[11px] font-bold uppercase">{payload[0].payload.label}</div><div className="num font-head text-xl font-bold">{payload[0].value.toFixed(2)} / 5</div><div className="text-olive">{payload[0].payload.n} competencies assessed</div></div> : null} />
          <Line type="linear" dataKey="avg" stroke="#B8460F" strokeWidth={3} animationDuration={600}
            dot={({ cx, cy, index }) => <rect key={index} x={cx - 5} y={cy - 5} width={10} height={10} fill="#FFF8F3" stroke="#B8460F" strokeWidth={2.5} />} activeDot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function teamTrendRows(all) {
  return [1, 2, 3, 4].map((c) => {
    const v = all.map((x) => x.trajectory.find((t) => t.cycle === c)?.score).filter((s) => s != null)
    return { label: ['Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026'][c - 1], avg: v.length ? 1 + v.reduce((a, b) => a + b, 0) / v.length / 25 : null, n: v.length }
  })
}

export function Meter({ value, tone = '#1F6B3A', className = '' }) {
  return (
    <div className={`h-2.5 w-full border-2 border-ink bg-cream ${className}`}>
      <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, background: tone }} />
    </div>
  )
}
