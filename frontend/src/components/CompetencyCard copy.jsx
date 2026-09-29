import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowRight } from 'lucide-react'
import { StateBadge, ConfidenceBar, STATE_HEX } from './ui.jsx'
import { Sparkline } from './charts.jsx'
import { fmtDate } from '../lib/format.js'

/** Spec §11: current score, trend, confidence, evidence count, last updated, next action. */
export default function CompetencyCard({ a, to }) {
  return (
    <Link to={to} className="panel group relative flex flex-col p-4 transition-transform hover:-translate-y-0.5">
      <span className="absolute inset-x-0 top-0 h-1.5 border-b-2 border-ink" style={{ background: STATE_HEX[a.state] }} />
      <div className="mt-1 flex items-start justify-between gap-2">
        <h3 className="font-head text-[18px] font-bold uppercase leading-tight">{a.label}</h3>
        <span className="font-mono text-[18px] font-bold" style={{ color: STATE_HEX[a.state] }}>{a.symbol}</span>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div className="flex items-baseline gap-1"><span className={clsx('num font-head text-[40px] font-bold leading-none', a.score == null && 'text-ink-30')}>{a.score ?? '—'}</span>{a.score != null && <span className="text-[12px] text-olive">/100</span>}</div>
        <Sparkline a={a} />
      </div>
      <div className="mt-3"><StateBadge state={a.state} size="sm" /></div>
      <div className="mt-2"><ConfidenceBar confidence={a.confidence} width="w-16" /></div>
      <dl className="mt-3 grid grid-cols-2 gap-2 border-t-2 border-ink/15 pt-2 font-mono text-[10px] uppercase text-olive">
        <div><dt>Evidence</dt><dd className="text-[12px] font-bold text-ink">{a.evidenceCount} signals</dd></div>
        <div><dt>Updated</dt><dd className="text-[12px] font-bold text-ink">{fmtDate(a.latestDate)}</dd></div>
      </dl>
      <div className="mt-3 flex-1 border-2 border-ink bg-cream px-2.5 py-2 text-[12px] font-semibold text-rust">
        <span className="label mr-1 text-olive">{a.gaps.length ? 'Gap:' : 'Why:'}</span>
        {a.gaps[0]?.detail || a.headline}
      </div>
      <span className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase text-ink group-hover:text-rust">Open evidence <ArrowRight size={13} /></span>
    </Link>
  )
}
