import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, Network, TrendingUp, CircleHelp, Plus, ChevronRight, TriangleAlert, ArrowRight } from 'lucide-react'
import { Kpi, Panel, PageHeader, StateBadge, ConfidenceBar, Avatar } from '../../components/ui.jsx'
import { HealthDonut, TeamTrend, teamTrendRows, Meter } from '../../components/charts.jsx'
import { AddEvidenceModal } from '../../components/Evidence.jsx'
import { useData } from '../../state/DataContext.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { STATE_ORDER, STATES, SOURCES, SOURCE_ORDER } from '../../engine/constants.js'
import { STATE_HEX } from '../../components/ui.jsx'
import { daysBetween } from '../../lib/format.js'

export default function Dashboard() {
  const { org, employees, evidence, asOf, activity } = useData()
  const { session } = useAuth()
  const nav = useNavigate()
  const [adding, setAdding] = useState(false)
  const byId = Object.fromEntries(employees.map((e) => [e.id, e]))
  const rank = (c) => (byId[c.employeeId].hero && c.state === 'conflicting' ? -1 : c.state === 'declining' && c.confidence.level === 'high' ? 1 : c.state === 'conflicting' ? 0 : c.state === 'insufficient' ? 2 : 3)
  const attention = org.all.filter((c) => c.state === 'conflicting' || c.state === 'insufficient' || (c.state === 'declining' && c.confidence.level === 'high')).sort((a, b) => rank(a) - rank(b) || a.confidence.value - b.confidence.value)
  // one person per row, rotating through the kinds of attention so the list isn't all one state
  const buckets = [attention.filter((c) => rank(c) === -1), attention.filter((c) => rank(c) === 1), attention.filter((c) => rank(c) === 2), attention.filter((c) => rank(c) === 0)]
  const shown = []
  const seen = new Set()
  for (let round = 0; shown.length < 5 && round < 10; round++) {
    for (const b of buckets) {
      const c = b.find((x) => !seen.has(x.employeeId))
      if (c && shown.length < 5) { seen.add(c.employeeId); shown.push(c) }
    }
  }
  const peopleNeeding = new Set(attention.map((c) => c.employeeId)).size
  const recent = evidence.filter((e) => e.date <= asOf && daysBetween(e.date, asOf) <= 30)
  const bySrc = Object.fromEntries(SOURCE_ORDER.map((s) => [s, recent.filter((e) => e.source === s).length]))
  const avgConf = org.all.reduce((a, c) => a + c.confidence.value, 0) / org.total
  const coverage = org.all.reduce((a, c) => a + (c.required.length - c.missingRequired.length) / c.required.length, 0) / org.total
  const firstName = session.name.split(' ')[0].toUpperCase()
  const hour = new Date().getHours()

  return (
    <div>
      <PageHeader title={`${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, ${firstName}`} sub="Here’s what changed across your workforce skill signals this cycle."
        actions={<button className="btn-primary" onClick={() => setAdding(true)}><Plus size={16} />Add evidence</button>} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi icon={Users} value={org.byEmployee ? Object.keys(org.byEmployee).length : 0} label="Employees tracked" sub="Across 5 teams" tag="Q3" onClick={() => nav('/hr/employees')} />
        <Kpi icon={Network} value={org.total} label="Competencies monitored" sub="Each assessed on its own" tag="Q3" onClick={() => nav('/hr/competencies')} />
        <Kpi icon={TrendingUp} value={`${org.improvingPct}%`} label="Skills improving" sub={`${org.counts.improving} of ${org.total} competencies`} subTone="green" tag="Q3" onClick={() => nav('/hr/competencies')} />
        <Kpi icon={CircleHelp} value={org.evidenceGaps} label="Evidence gaps" sub={`${org.conflicts.length} conflicts · ${org.counts.insufficient} insufficient`} subTone="rust" tag="Q3" onClick={() => nav('/hr/evidence?tab=gaps')} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        <Panel title="Skill health overview" sub={`All ${org.total} monitored competencies`} action={<Link to="/hr/competencies" className="btn-ghost text-[13px]">View matrix</Link>}>
          <div className="flex flex-wrap items-center gap-6">
            <HealthDonut counts={org.counts} total={org.total} />
            <ul className="min-w-[200px] flex-1 space-y-2">
              {STATE_ORDER.map((s) => (
                <li key={s} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="flex items-center gap-2"><span className="h-3 w-3 border-2 border-ink" style={{ background: STATE_HEX[s] }} />{STATES[s].label}</span>
                  <span className="num font-mono font-bold">{org.counts[s]}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
        <Panel title="Competency trajectory" sub="Average team proficiency score by review cycle" action={<Link to="/hr/competencies" className="btn-ghost text-[13px]">View competencies</Link>}>
          {(() => { const rows = teamTrendRows(org.all); const d = rows[3].avg - rows[2].avg; return (
            <>
              <div className="mb-3 flex items-baseline gap-2"><span className="num font-head text-[32px] font-bold">{rows[3].avg.toFixed(1)}</span><span className="text-olive">/ 5.0 average</span><span className={`font-mono text-[13px] font-bold ${d >= 0 ? 'text-improving' : 'text-declining'}`}>{d >= 0 ? '+' : ''}{d.toFixed(1)}</span></div>
              <TeamTrend rows={rows} />
            </>
          ) })()}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Employees needing attention" sub={`${peopleNeeding} people · prioritised by conflict, confidence and decline`} action={<Link to="/hr/employees" className="btn-ghost text-[13px]">View all</Link>} bodyClass="p-0 pt-3">
          <ul>
            {shown.map((c) => {
              const e = byId[c.employeeId]
              return (
                <li key={c.employeeId + c.competencyId}>
                  <Link to={`/hr/employees/${e.id}/${c.competencyId}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t-2 border-ink/15 px-5 py-3 hover:bg-cream sm:grid-cols-[auto_1.2fr_1fr_auto_auto]">
                    <Avatar name={e.name} size={38} />
                    <span className="min-w-0"><span className="block truncate text-[14px] font-semibold">{e.name}</span><span className="block truncate text-[12px] text-olive">{e.role}</span></span>
                    <span className="hidden min-w-0 sm:block"><span className="label block">Skill</span><span className="block truncate text-[13px] font-semibold">{c.label}</span></span>
                    <span className="hidden flex-col items-end gap-1 sm:flex"><StateBadge state={c.state} size="sm" /><ConfidenceBar confidence={c.confidence} width="w-16" showLabel={false} /></span>
                    <ChevronRight size={18} />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel title="Evidence activity" sub={`${recent.length} signals in the last 30 days`} action={<Link to="/hr/evidence" className="btn-ghost text-[13px]">Open feed</Link>}>
          <div className="grid grid-cols-3 gap-2">
            {[['manager'], ['peer'], ['project']].map(([s]) => (
              <div key={s} className="border-2 border-ink bg-cream p-2.5"><div className="num font-head text-[24px] font-bold">{bySrc[s]}</div><div className="text-[11px] text-olive">{SOURCES[s].label.split(' ')[0]}</div></div>
            ))}
          </div>
          <Link to="/hr/employees/sneha-deshmukh/leadership" className="mt-3 block border-2 border-ink bg-sand p-3 hover:bg-cream">
            <div className="flex items-center gap-2 font-semibold text-rust"><TriangleAlert size={16} />{org.conflicts.length} conflicting-evidence cases</div>
            <p className="mt-1 text-[13px]">Sneha Deshmukh · Leadership: manager and peer signals disagree and no recent project evidence exists.</p>
            <span className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-semibold text-rust">Review conflict <ArrowRight size={14} /></span>
          </Link>
          <div className="mt-3 space-y-2">
            <div><div className="mb-1 flex justify-between text-[12px]"><span>Evidence quality · avg confidence</span><b className="num font-mono">{Math.round(avgConf * 100)}%</b></div><Meter value={avgConf} /></div>
            <div><div className="mb-1 flex justify-between text-[12px]"><span>Required-source coverage</span><b className="num font-mono">{Math.round(coverage * 100)}%</b></div><Meter value={coverage} tone="#B8460F" /></div>
          </div>
          <ul className="mt-3 space-y-1.5 border-t-2 border-ink/15 pt-3 text-[12px]">
            {(activity.length ? activity.slice(0, 3).map((a) => a.text) : [`${org.evidenceGaps} evidence gaps to close`, `${org.conflicts.length} conflicts to review`]).map((t) => <li key={t} className="flex gap-2"><span className="text-rust">■</span>{t}</li>)}
          </ul>
        </Panel>
      </div>
      <AddEvidenceModal open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
