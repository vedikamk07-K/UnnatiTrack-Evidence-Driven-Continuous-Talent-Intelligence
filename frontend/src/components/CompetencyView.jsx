import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { ChevronRight, TriangleAlert, CircleHelp, Plus } from 'lucide-react'
import { Panel, StateBadge, ConfidenceTag, Avatar, PrivacyBanner, Empty } from './ui.jsx'
import { TrajectoryChart, SourceLegend, Meter } from './charts.jsx'
import { EvidenceRow, SourceCard, ContradictionCard, AddEvidenceModal } from './Evidence.jsx'
import { ClaimCard } from './Resume.jsx'
import { GAP_TYPES, RULES } from '../engine/constants.js'
import { fmtDate, five } from '../lib/format.js'

const FACTORS = [
  ['volume', 'Volume', RULES.weights.volume],
  ['diversity', 'Source diversity', RULES.weights.diversity],
  ['recency', 'Recency', RULES.weights.recency],
  ['agreement', 'Agreement', RULES.weights.agreement],
  ['stability', 'Trend stability', RULES.weights.stability],
]

export function ConfidencePanel({ a }) {
  const c = a.confidence
  return (
    <Panel title="Confidence" sub="How sure the engine is — and why">
      <div className="flex items-end justify-between gap-3">
        <div className="font-head text-[40px] font-bold uppercase leading-none">{c.label}</div>
        <div className="num font-mono text-[20px] font-bold">{Math.round(c.value * 100)}%</div>
      </div>
      <div className="mt-3 space-y-2.5">
        {FACTORS.map(([k, l, w]) => (
          <div key={k}>
            <div className="mb-1 flex justify-between text-[12px]"><span>{l} <span className="font-mono text-[10px] text-olive">× {w}</span></span><b className="num font-mono">{Math.round(c.factors[k] * 100)}%</b></div>
            <Meter value={c.factors[k]} tone={c.factors[k] < 0.5 ? '#3452D8' : '#1A0F08'} />
          </div>
        ))}
      </div>
      {c.caps.map((t) => <p key={t} className="mt-3 border-l-4 border-rust bg-cream px-2.5 py-1.5 text-[12px]">{t}</p>)}
    </Panel>
  )
}

export function GapList({ a }) {
  if (!a.gaps.length) return <p className="text-[13px] text-olive">No evidence gaps — every required source has recent data.</p>
  return (
    <ul className="space-y-2">
      {a.gaps.map((g, i) => (
        <li key={i} className={clsx('border-2 px-3 py-2', g.priority === 'high' ? 'border-rust bg-[#fff0e6]' : 'border-ink bg-cream')}>
          <div className="flex items-center justify-between font-mono text-[10px] font-bold uppercase"><span className="flex items-center gap-1.5"><TriangleAlert size={13} />{GAP_TYPES[g.type].label}</span><span className={g.priority === 'high' ? 'text-rust' : 'text-olive'}>{g.priority} priority</span></div>
          <p className="mt-0.5 text-[13px]">{g.detail}</p>
          <p className="text-[11px] text-olive">Template: {GAP_TYPES[g.type].action}</p>
        </li>
      ))}
    </ul>
  )
}

/**
 * One competency for one person. Shared by HR (hr=true) and the employee's own view.
 */
export default function CompetencyView({ person, a, evidence, hr, back }) {
  const { hash } = useLocation()
  const [modal, setModal] = useState(null) // 'evidence'
  useEffect(() => { if (hash === '#evidence') setTimeout(() => document.getElementById('evidence')?.scrollIntoView({ behavior: 'smooth' }), 80) }, [hash])
  if (!a) return <Empty title="Competency not found" />
  const items = evidence.filter((e) => e.competencyId === a.competencyId).sort((x, y) => y.date.localeCompare(x.date))

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] uppercase text-olive" aria-label="Breadcrumb">
        {back.map((b) => <span key={b.to} className="flex items-center gap-1.5"><Link to={b.to} className="hover:text-rust">{b.label}</Link><ChevronRight size={12} /></span>)}
        <span className="font-bold text-ink">{a.label}</span>
      </nav>
      {!hr && <PrivacyBanner />}

      <header className="panel animate-in">
        <div className="flex flex-wrap items-center gap-5 p-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[13px] text-olive"><Avatar name={person.name} size={24} />{person.name} · {person.role}</div>
            <h1 className="mt-2 font-head text-[40px] font-bold uppercase leading-none">{a.label}</h1>
            <p className="mt-2 max-w-2xl text-[15px]">{a.headline}</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-1"><span className={clsx('num font-head text-[64px] font-bold leading-none', a.score == null && 'text-ink-30')}>{a.score ?? '—'}</span>{a.score != null && <span className="text-olive">/100</span>}</div>
              <div className="font-mono text-[11px] uppercase text-olive">{a.score != null ? `≈ ${five(a.score)} / 5 · recency-weighted` : `Last cycle ${a.lastKnown ?? '—'} · not used`}</div>
            </div>
            <div className="flex flex-col items-start gap-2 border-l-2 border-ink pl-5">
              <StateBadge state={a.state} size="lg" />
              <ConfidenceTag confidence={a.confidence} size="lg" />
              <span className="font-mono text-[10px] uppercase text-olive">{a.evidenceCount} signals · updated {fmtDate(a.latestDate)}</span>
            </div>
          </div>
        </div>
        {hr && (
          <div className="flex flex-wrap items-center gap-2 border-t-2 border-ink px-5 py-3">
            <button className="btn-secondary btn-sm" onClick={() => setModal('evidence')}><Plus size={14} />Add evidence</button>
            <span className="ml-auto font-mono text-[10px] uppercase text-olive">New evidence recomputes state, confidence and gaps immediately</span>
          </div>
        )}
      </header>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Panel title="Skill trajectory" sub={`Per-cycle score from all sources · Theil–Sen slope ${a.slope > 0 ? '+' : ''}${a.slope.toFixed(1)} pts/cycle over the last 3 cycles`}>
            <TrajectoryChart a={a} />
            <div className="mt-3"><SourceLegend sources={a.sources.filter((s) => s.count).map((s) => s.source)} /></div>
          </Panel>
          <Panel title="Evidence by source" sub="Required sources for this competency must have evidence in the last 90 days">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{a.sources.map((s) => <SourceCard key={s.source} s={s} />)}<ClaimCard claim={a.claim} /></div>
          </Panel>
          <Panel id="evidence" title="Evidence trail" sub={`${items.length} items · every conclusion is backed by these records`} bodyClass="p-0 pt-2">
            <div className="max-h-[560px] overflow-y-auto border-t-2 border-ink">
              {items.map((e) => <EvidenceRow key={e.id} e={e} />)}
            </div>
          </Panel>
        </div>
        <div className="space-y-5">
          {a.state === 'insufficient' && (
            <div className="border-2 border-insufficient bg-insufficient-soft p-4">
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase text-insufficient"><CircleHelp size={15} />Insufficient evidence</div>
              <p className="mt-1 text-[14px] font-semibold">Not enough recent evidence to confidently assess this competency.</p>
              <ul className="mt-1.5 list-inside list-disc text-[13px]">{a.why.map((w) => <li key={w}>{w}</li>)}</ul>
            </div>
          )}
          {a.conflict && <ContradictionCard a={a} person={hr ? person : null} />}
          <ConfidencePanel a={a} />
          <Panel title="Why this state" sub="What the engine considered">
            <ul className="space-y-1.5 text-[13px]">{a.why.map((w) => <li key={w} className="flex gap-2"><span className="text-rust">■</span>{w}</li>)}</ul>
          </Panel>
          <Panel title="Evidence gaps"><GapList a={a} /></Panel>
        </div>
      </div>

      {hr && <AddEvidenceModal open={modal === 'evidence'} onClose={() => setModal(null)} preset={{ employeeId: person.id, competencyId: a.competencyId }} />}

    </div>
  )
}
