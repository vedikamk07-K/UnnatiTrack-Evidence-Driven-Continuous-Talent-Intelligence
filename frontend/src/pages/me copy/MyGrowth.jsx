import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { Target, TrendingUp, CircleHelp, ListChecks, ArrowRight, MessagesSquare } from 'lucide-react'
import { PageHeader, Panel, Kpi, PrivacyBanner, StateBadge, ConfidenceBar, Empty } from '../../components/ui.jsx'
import { TrajectoryChart, SourceLegend } from '../../components/charts.jsx'
import CompetencyCard from '../../components/CompetencyCard.jsx'
import CompetencyView from '../../components/CompetencyView.jsx'
import { EvidenceRow, SOURCE_ICON } from '../../components/Evidence.jsx'
import { useData } from '../../state/DataContext.jsx'
import { SOURCES, SOURCE_ORDER, GAP_TYPES } from '../../engine/constants.js'
import { fmtDate } from '../../lib/format.js'

export function MyGrowth() {
  const { me, comments, evidence, asOf } = useData()
  const [sel, setSel] = useState(null)
  const e = me.employee
  const defaultFocus = me.competencies.find((c) => c.state === 'conflicting') || me.competencies.find((c) => c.state !== 'insufficient' && c.competencyId === me.focus.competencyId) || me.competencies.find((c) => c.state !== 'insufficient') || me.competencies[0]
  const focus = me.competencies.find((c) => c.competencyId === (sel || defaultFocus.competencyId))
  const gap = me.competencies.find((c) => c.gaps.length)
  const latest = comments[0]
  return (
    <div>
      <PageHeader title="Your growth summary" sub={`Hi ${e.name.split(' ')[0]} — here is how each of your skills is moving, how sure we are, and where more evidence is needed.`} />
      <PrivacyBanner className="mb-5" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi icon={Target} value={me.competencies.length} label="Competencies tracked" sub="Each assessed on its own" tag="Q3" />
        <Kpi icon={TrendingUp} value={me.counts.improving} label="Improving" sub={`${me.counts.stagnating} steady · ${me.counts.declining} declining`} subTone="green" tag="Trend" />
        <Kpi icon={CircleHelp} value={me.gaps} label="Need more evidence" sub={`${me.counts.conflicting} conflicting · ${me.counts.insufficient} insufficient`} subTone="rust" tag="Gaps" />
        <Kpi icon={ListChecks} value={me.evidenceCount} label="Evidence signals" sub="Across 6 sources" tag="Logged" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Your proficiency trajectory" sub="Choose a competency · per-cycle score from all sources">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {me.competencies.map((c) => <button key={c.competencyId} onClick={() => setSel(c.competencyId)} className={clsx('border-2 border-ink px-2 py-1 font-mono text-[10px] font-bold uppercase', focus.competencyId === c.competencyId ? 'bg-ink text-panel' : 'bg-panel hover:bg-cream')}>{c.label}</button>)}
          </div>
          <TrajectoryChart a={focus} height={250} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><SourceLegend sources={focus.sources.filter((s) => s.count).map((s) => s.source)} /><StateBadge state={focus.state} size="sm" /></div>
        </Panel>
        <div className="space-y-5">
          <section className="border-2 border-ink bg-ink p-5 text-panel shadow-hard">
            <div className="font-mono text-[11px] font-bold uppercase text-mint">Where more evidence is needed</div>
            {gap ? (
              <>
                <p className="mt-2 font-head text-[22px] font-bold uppercase leading-tight">{gap.label}</p>
                <p className="mt-1 text-[13px] text-panel/80">{gap.gaps[0].detail}</p>
              </>
            ) : <p className="mt-2">No evidence gaps — keep going.</p>}
            <Link to={gap ? `/me/competencies/${gap.competencyId}` : '/me/competencies'} className="mt-4 inline-flex items-center gap-1.5 border-2 border-panel px-3 py-1.5 text-[13px] font-semibold hover:bg-panel hover:text-ink">Open {gap ? gap.label : 'competencies'} <ArrowRight size={14} /></Link>
          </section>
          <Panel title="Skill states" bodyClass="p-0 pt-2">
            <ul>{me.competencies.map((c) => (
              <li key={c.competencyId}><Link to={`/me/competencies/${c.competencyId}`} className="flex items-center gap-2 border-t-2 border-ink/10 px-5 py-2.5 hover:bg-cream"><span className="flex-1 text-[14px] font-semibold">{c.label}</span><span className="num font-mono text-[12px] font-bold">{c.score ?? '—'}</span><StateBadge state={c.state} size="sm" /></Link></li>
            ))}</ul>
          </Panel>
          {latest && (
            <Link to="/me/feedback" className="panel block p-4 hover:bg-cream">
              <div className="flex items-center gap-2 label text-ink"><MessagesSquare size={14} />Latest HR comment · {fmtDate(latest.date)}</div>
              <p className="mt-1.5 line-clamp-3 text-[13px]">“{latest.text}”</p>
            </Link>
          )}
        </div>
      </div>
      <Panel className="mt-5" title="Recent evidence" sub="Only your own records" bodyClass="p-0 pt-2">
        <div className="border-t-2 border-ink">{evidence.filter((x) => x.date <= asOf).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((x) => <EvidenceRow key={x.id} e={x} compact />)}</div>
      </Panel>
    </div>
  )
}

export function MyCompetencies() {
  const { me } = useData()
  return (
    <div>
      <PageHeader title="My competencies" sub="Every skill is judged on its own evidence. There is no overall score." />
      <PrivacyBanner className="mb-5" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {me.competencies.map((c) => <CompetencyCard key={c.competencyId} a={c} to={`/me/competencies/${c.competencyId}`} />)}
      </div>
    </div>
  )
}

export function MyCompetency() {
  const { cid } = useParams()
  const { me, evidence, asOf } = useData()
  const c = me.competencies.find((x) => x.competencyId === cid)
  return <CompetencyView person={me.employee} a={c} evidence={evidence.filter((e) => e.date <= asOf)} back={[{ to: '/me/competencies', label: 'My competencies' }]} />
}

export function MyEvidence() {
  const { me, evidence, asOf } = useData()
  const [src, setSrc] = useState(SOURCE_ORDER)
  const list = evidence.filter((e) => e.date <= asOf && src.includes(e.source)).sort((a, b) => b.date.localeCompare(a.date))
  const gaps = me.competencies.filter((c) => c.evidenceGap)
  return (
    <div>
      <PageHeader title="My evidence" sub="Every signal behind your skill states — including the evidence that is still missing." />
      <PrivacyBanner className="mb-5" />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="panel">
          <div className="flex flex-wrap gap-1.5 border-b-2 border-ink p-4" role="group" aria-label="Filter by source">
            {SOURCE_ORDER.map((s) => { const on = src.includes(s); const I = SOURCE_ICON[s]; return <button key={s} aria-pressed={on} onClick={() => setSrc((x) => (on ? x.filter((y) => y !== s) : [...x, s]))} className={clsx('inline-flex h-8 items-center gap-1.5 border-2 border-ink px-2.5 font-mono text-[11px] font-bold uppercase', on ? 'bg-ink text-panel' : 'bg-panel text-ink-50')}><I size={13} />{SOURCES[s].label.split(' ')[0]}</button> })}
          </div>
          <div className="max-h-[820px] overflow-y-auto">{list.map((e) => <EvidenceRow key={e.id} e={e} />)}{!list.length && <div className="p-5"><Empty title="No evidence for these sources" /></div>}</div>
        </section>
        <Panel title="My evidence gaps" sub="What’s missing before we can be confident">
          {gaps.length ? <ul className="space-y-2">{gaps.map((c) => (
            <li key={c.competencyId}><Link to={`/me/competencies/${c.competencyId}`} className="block border-2 border-ink bg-cream px-3 py-2 hover:bg-sand">
              <div className="flex items-center justify-between gap-2"><b className="text-[13px]">{c.label}</b><StateBadge state={c.state} size="sm" /></div>
              <p className="mt-1 text-[12px] text-olive">{c.gaps.map((g) => GAP_TYPES[g.type].label).join(' · ')}</p>
            </Link></li>
          ))}</ul> : <p className="text-[13px] text-olive">No gaps — all required sources have recent evidence.</p>}
        </Panel>
      </div>
    </div>
  )
}

export function HRFeedback() {
  const { comments, me } = useData()
  const label = (cid) => me.competencies.find((c) => c.competencyId === cid)
  return (
    <div>
      <PageHeader title="HR comments on my growth" sub="Comments your HR partner has shared with you. Private HR notes are never shown here." />
      <PrivacyBanner className="mb-5" />
      <div className="max-w-3xl space-y-4">
        {comments.length ? comments.map((c) => (
          <article key={c.id} className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase text-olive"><span>{c.author} · {fmtDate(c.date)}</span>{c.competencyId && label(c.competencyId) && <Link to={`/me/competencies/${c.competencyId}`} className="font-bold text-rust hover:underline">About {label(c.competencyId).label} →</Link>}</div>
            <p className="mt-2 text-[15px] leading-relaxed">“{c.text}”</p>
            {c.competencyId && label(c.competencyId) && <div className="mt-3 flex items-center gap-2"><StateBadge state={label(c.competencyId).state} size="sm" /><ConfidenceBar confidence={label(c.competencyId).confidence} width="w-14" /></div>}
          </article>
        )) : <Empty title="No comments yet" />}
      </div>
    </div>
  )
}
