import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Search, ChevronRight, UserPlus } from 'lucide-react'
import { PageHeader, StateBadge, ConfidenceBar, Avatar, Empty } from '../../components/ui.jsx'
import { AddEmployeeModal } from '../../components/Resume.jsx'
import { useData } from '../../state/DataContext.jsx'
import { STATES } from '../../engine/constants.js'
import { fmtDate } from '../../lib/format.js'

const Count = ({ n, state }) => <span className={clsx('num inline-flex h-7 min-w-[30px] items-center justify-center border-2 font-mono text-[12px] font-bold', n ? `border-${state} bg-${state}-soft text-${state}` : 'border-ink/15 text-ink-30')}>{n}</span>

export default function Employees() {
  const { org, employees } = useData()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [team, setTeam] = useState('All teams')
  const [state, setState] = useState('any')
  const [focus, setFocus] = useState('sneha-deshmukh')
  const [adding, setAdding] = useState(false)
  const teams = ['All teams', ...new Set(employees.map((e) => e.team))]
  const rows = useMemo(() => employees.map((e) => org.byEmployee[e.id]).filter((a) => {
    const s = q.toLowerCase()
    return (team === 'All teams' || a.employee.team === team) && (!s || `${a.employee.name} ${a.employee.role} ${a.competencies.map((c) => c.label).join(' ')}`.toLowerCase().includes(s)) && (state === 'any' || a.counts[state] > 0)
  }), [employees, org, q, team, state])
  const f = org.byEmployee[focus]

  return (
    <div>
      <PageHeader title="Employees" sub="Search people, understand skill states and decide the next useful action." actions={<button id="add-employee" className="btn-primary" onClick={() => setAdding(true)}><UserPlus size={16} />Add employee</button>} />
      <AddEmployeeModal open={adding} onClose={() => setAdding(false)} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
          <input id="emp-search" className="input h-10 bg-panel pl-9" placeholder="Search by name, role or skill" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <select id="emp-team" className="input h-10 w-auto bg-panel font-semibold" value={team} onChange={(e) => setTeam(e.target.value)}>{teams.map((t) => <option key={t}>{t}</option>)}</select>
          <select id="emp-state" className="input h-10 w-auto bg-panel font-semibold" value={state} onChange={(e) => setState(e.target.value)}>
            <option value="any">Any skill state</option>
            {Object.entries(STATES).map(([k, v]) => <option key={k} value={k}>Has {v.label.toLowerCase()}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-5 2xl:grid-cols-[1fr_360px]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b-2 border-ink px-4 py-3"><span className="font-semibold">{rows.length} employees</span><span className="text-[12px] text-olive">States are per competency — no overall score</span></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-[13px]">
              <thead className="border-b-2 border-ink bg-sand font-mono text-[10px] uppercase tracking-wider text-olive">
                <tr><th className="px-4 py-2.5">Employee</th><th className="px-3">Role</th><th className="px-2 text-center">Improving</th><th className="px-2 text-center">Stagnating</th><th className="px-2 text-center">Declining</th><th className="px-2 text-center">Evidence gaps</th><th className="px-3">Confidence</th><th className="px-3">Last assessment</th><th className="px-3">Focus area</th><th /></tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const e = a.employee
                  return (
                    <tr key={e.id} onClick={() => nav(`/hr/employees/${e.id}`)} onMouseEnter={() => setFocus(e.id)} className={clsx('cursor-pointer border-b-2 border-ink/10 hover:bg-cream', e.hero && 'bg-[#fff3e4]')}>
                      <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar name={e.name} size={36} /><div><div className="text-[14px] font-semibold">{e.name}</div><div className="text-[11px] text-olive">{e.team} · {e.location}</div></div></div></td>
                      <td className="px-3 text-ink-70">{e.role}</td>
                      <td className="px-2 text-center"><Count n={a.counts.improving} state="improving" /></td>
                      <td className="px-2 text-center"><Count n={a.counts.stagnating} state="stagnating" /></td>
                      <td className="px-2 text-center"><Count n={a.counts.declining} state="declining" /></td>
                      <td className="px-2 text-center"><Count n={a.gaps} state="insufficient" /></td>
                      <td className="px-3"><ConfidenceBar confidence={{ value: a.confidence, label: a.confidence >= 0.75 ? 'HIGH' : a.confidence >= 0.5 ? 'MEDIUM' : 'LOW' }} width="w-14" showLabel={false} /></td>
                      <td className="num px-3 font-mono text-[12px]">{fmtDate(a.lastAssessment)}</td>
                      <td className="max-w-[220px] px-3"><span className="line-clamp-2 text-[12px] font-semibold text-rust">{a.focus ? `${a.focus.label}: ${a.focus.stateLabel}` : '—'}</span></td>
                      <td className="pr-3"><ChevronRight size={18} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!rows.length && <div className="p-6"><Empty title="No matches">Clear the filters to see everyone.</Empty></div>}
          </div>
        </section>
        {f && (
          <aside className="panel hidden self-start 2xl:block">
            <div className="flex items-start gap-3 border-b-2 border-ink p-4">
              <Avatar name={f.employee.name} size={46} tone="ink" />
              <div className="min-w-0 flex-1"><div className="font-head text-[20px] font-bold uppercase leading-tight">{f.employee.name}</div><div className="text-[12px] text-olive">{f.employee.role} · {f.employee.team}</div></div>
              <Link to={`/hr/employees/${f.employee.id}`} className="btn-secondary btn-sm">View profile</Link>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b-2 border-ink p-4">
              {[[f.competencies.length, 'Skills tracked'], [f.evidenceCount, 'Evidence items'], [f.gaps, 'Evidence gaps']].map(([v, l]) => <div key={l} className="border-2 border-ink bg-cream p-2"><div className="num font-head text-[22px] font-bold">{v}</div><div className="text-[10px] text-olive">{l}</div></div>)}
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              {f.competencies.map((c) => (
                <Link to={`/hr/employees/${f.employee.id}/${c.competencyId}`} key={c.competencyId} className="block border-b-2 border-ink/10 px-4 py-3 hover:bg-cream">
                  <div className="flex items-center justify-between gap-2"><span className="text-[14px] font-semibold">{c.label}</span><StateBadge state={c.state} size="sm" /></div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-olive"><span>{c.score ?? '—'} / 100 · {c.evidenceCount} signals</span><ConfidenceBar confidence={c.confidence} width="w-12" showLabel={false} /></div>
                </Link>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
