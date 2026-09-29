import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { Activity, ShieldCheck, CircleHelp, GitCompareArrows, Plus, Search, ArrowRight } from 'lucide-react'
import { PageHeader, Tabs, Kpi, Panel, Avatar, StateBadge, Empty, ConfidenceBar } from '../../components/ui.jsx'
import { EvidenceRow, ContradictionCard, AddEvidenceModal, SOURCE_ICON } from '../../components/Evidence.jsx'
import { Meter } from '../../components/charts.jsx'
import { useData } from '../../state/DataContext.jsx'
import { SOURCES, SOURCE_ORDER, COMPETENCIES, GAP_TYPES, RULES } from '../../engine/constants.js'
import { relevance } from '../../engine/analyze.js'
import { daysBetween } from '../../lib/format.js'

export default function Evidence() {
  const { org, evidence, employees, asOf } = useData()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'feed'
  const [q, setQ] = useState('')
  const [range, setRange] = useState('90')
  const [src, setSrc] = useState(SOURCE_ORDER)
  const [adding, setAdding] = useState(false)
  const byId = Object.fromEntries(employees.map((e) => [e.id, e]))
  const feed = useMemo(() => evidence.filter((e) => e.date <= asOf && src.includes(e.source) && (range === 'all' || daysBetween(e.date, asOf) <= Number(range)) && (!q || `${e.title} ${byId[e.employeeId].name} ${COMPETENCIES[e.competencyId].label}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.date.localeCompare(a.date) || b.seq - a.seq), [evidence, src, range, q, asOf]) // eslint-disable-line react-hooks/exhaustive-deps
  const gaps = org.all.filter((c) => c.evidenceGap).sort((a, b) => (b.gaps.some((g) => g.priority === 'high') ? 1 : 0) - (a.gaps.some((g) => g.priority === 'high') ? 1 : 0))
  const conflicts = [...org.conflicts].sort((a, b) => (byId[b.employeeId].hero ? 1 : 0) - (byId[a.employeeId].hero ? 1 : 0))
  const cycleSignals = evidence.filter((e) => e.date <= asOf && daysBetween(e.date, asOf) <= 90).length
  const avgConf = org.all.reduce((s, c) => s + c.confidence.value, 0) / org.total
  const coverage = (s) => { const need = org.all.filter((c) => c.required.includes(s)); return need.length ? need.filter((c) => !c.missingRequired.includes(s)).length / need.length : 1 }

  return (
    <div>
      <PageHeader title="Evidence" sub="Review the signals behind every skill state, including recency, confidence and conflicts." actions={<button className="btn-primary" onClick={() => setAdding(true)}><Plus size={16} />Add evidence</button>} />
      <Tabs className="mb-5" value={tab} onChange={(v) => setParams({ tab: v })} tabs={[{ value: 'feed', label: 'Recent evidence' }, { value: 'gaps', label: 'Evidence gaps', count: gaps.length }, { value: 'conflicts', label: 'Conflicting evidence', count: conflicts.length }, { value: 'rules', label: 'Source rules' }]} />
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi icon={Activity} value={cycleSignals} label="Signals in last 90 days" />
        <Kpi icon={ShieldCheck} value={`${Math.round(avgConf * 100)}%`} label="Average confidence" />
        <Kpi icon={CircleHelp} value={org.evidenceGaps} label="Evidence gaps" onClick={() => setParams({ tab: 'gaps' })} />
        <Kpi icon={GitCompareArrows} value={conflicts.length} label="Open conflicts" onClick={() => setParams({ tab: 'conflicts' })} />
      </div>

      {tab === 'feed' && (
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <section className="panel">
            <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink p-4">
              <div className="relative w-full max-w-xs"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" /><input id="ev-search" className="input h-9 pl-8" placeholder="Search evidence or employee" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <select id="ev-range" className="input h-9 w-auto font-semibold text-rust" value={range} onChange={(e) => setRange(e.target.value)}><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All cycles</option></select>
              <div className="flex w-full flex-wrap gap-1.5" role="group" aria-label="Filter by source">
                {SOURCE_ORDER.map((s) => { const on = src.includes(s); const I = SOURCE_ICON[s]; return (
                  <button key={s} aria-pressed={on} onClick={() => setSrc((x) => (on ? x.filter((y) => y !== s) : [...x, s]))} className={clsx('inline-flex h-8 items-center gap-1.5 border-2 border-ink px-2.5 font-mono text-[11px] font-bold uppercase', on ? 'bg-ink text-panel' : 'bg-panel text-ink-50')}><I size={13} />{SOURCES[s].label.split(' ')[0]}</button>
                ) })}
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-2.5"><h2 className="h-panel text-[16px]">Recent evidence</h2><span className="text-[12px] text-olive">{feed.length} signals · ordered by event date</span></div>
            <div className="max-h-[900px] overflow-y-auto border-t-2 border-ink">
              {feed.slice(0, 80).map((e) => <EvidenceRow key={e.id} e={e} showPerson person={byId[e.employeeId]} />)}
              {!feed.length && <div className="p-5"><Empty title="No evidence for these filters" /></div>}
            </div>
          </section>
          <div className="space-y-5">
            {conflicts[0] && (
              <Panel title="Conflict to resolve" sub="Signals disagree beyond the threshold" action={<button className="btn-ghost text-[13px]" onClick={() => setParams({ tab: 'conflicts' })}>View all {conflicts.length}</button>}>
                <ContradictionCard a={conflicts[0]} person={byId[conflicts[0].employeeId]} action={<Link to={`/hr/employees/${conflicts[0].employeeId}/${conflicts[0].competencyId}`} className="btn-primary btn-sm w-full">Resolve with targeted action <ArrowRight size={14} /></Link>} />
              </Panel>
            )}
            <Panel title="Source coverage" sub="Required sources with recent evidence (last 90 days)">
              <ul className="space-y-3">
                {SOURCE_ORDER.filter((s) => s !== 'training').map((s) => { const v = coverage(s); return (
                  <li key={s}><div className="mb-1 flex justify-between text-[12px]"><span>{SOURCES[s].label}</span><b className="num font-mono">{Math.round(v * 100)}%</b></div><Meter value={v} tone={v >= 0.85 ? '#1F6B3A' : '#B8460F'} /></li>
                ) })}
              </ul>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'gaps' && (
        <section className="panel overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead className="border-b-2 border-ink bg-sand font-mono text-[10px] uppercase tracking-wider text-olive"><tr><th className="px-4 py-2.5">Employee</th><th className="px-3">Competency</th><th className="px-3">State</th><th className="px-3">Gap</th><th className="px-3">Confidence</th><th className="px-3">Targeted action</th><th /></tr></thead>
            <tbody>
              {gaps.map((c) => { const e = byId[c.employeeId]; return (
                <tr key={c.employeeId + c.competencyId} className="border-b-2 border-ink/10 hover:bg-cream">
                  <td className="px-4 py-3"><span className="flex items-center gap-2"><Avatar name={e.name} size={30} /><b>{e.name}</b></span></td>
                  <td className="px-3 font-semibold">{c.label}</td>
                  <td className="px-3"><StateBadge state={c.state} size="sm" /></td>
                  <td className="px-3"><div className="flex flex-wrap gap-1">{c.gaps.filter((g) => g.type !== 'declining_with_high_confidence').map((g, i) => <span key={i} className={clsx('border-2 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase', g.priority === 'high' ? 'border-rust text-rust' : 'border-ink')}>{GAP_TYPES[g.type].label}{g.source ? ` · ${SOURCES[g.source].label.split(' ')[0]}` : ''}</span>)}</div></td>
                  <td className="px-3"><ConfidenceBar confidence={c.confidence} width="w-12" /></td>
                  <td className="max-w-[240px] px-3 text-[12px] text-olive">{GAP_TYPES[c.gaps[0].type].action}</td>
                  <td className="px-3"><Link to={`/hr/employees/${c.employeeId}/${c.competencyId}`} className="btn-secondary btn-sm">Open</Link></td>
                </tr>
              ) })}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'conflicts' && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {conflicts.map((c) => <ContradictionCard key={c.employeeId + c.competencyId} a={c} person={byId[c.employeeId]} action={<Link to={`/hr/employees/${c.employeeId}/${c.competencyId}`} className="btn-primary btn-sm w-full">Open {c.label} <ArrowRight size={14} /></Link>} />)}
        </div>
      )}

      {tab === 'rules' && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Source reliability" sub="How much one signal from each source is trusted">
            <ul className="space-y-3">{SOURCE_ORDER.map((s) => <li key={s}><div className="mb-1 flex justify-between text-[13px]"><span>{SOURCES[s].label} <span className="font-mono text-[10px] text-olive">scale {SOURCES[s].scale === 5 ? '1–5' : '0–100'}</span></span><b className="num font-mono">{SOURCES[s].reliability}</b></div><Meter value={SOURCES[s].reliability} tone="#1A0F08" /></li>)}</ul>
          </Panel>
          <Panel title="Role-required coverage" sub={`Required sources (relevance 1.0) must have evidence within ${RULES.recentDays} days`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-[12px]">
                <thead><tr className="font-mono text-[10px] uppercase text-olive"><th className="py-1 text-left">Competency</th>{SOURCE_ORDER.map((s) => <th key={s} className="py-1">{SOURCES[s].label.split(' ')[0]}</th>)}</tr></thead>
                <tbody>{Object.keys(COMPETENCIES).map((c) => <tr key={c} className="border-t border-ink/15"><td className="py-1.5 font-semibold">{COMPETENCIES[c].label}</td>{SOURCE_ORDER.map((s) => <td key={s} className="text-center font-mono">{relevance(c, s) === 1 ? <b className="text-rust">■</b> : <span className="text-ink-30">{relevance(c, s)}</span>}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
      <AddEvidenceModal open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
