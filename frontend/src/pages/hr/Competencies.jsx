import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { PageHeader, Panel, StateBadge, STATE_HEX, Avatar } from '../../components/ui.jsx'
import { TeamTrend } from '../../components/charts.jsx'
import { useData } from '../../state/DataContext.jsx'
import { COMPETENCIES, STATE_ORDER, STATES } from '../../engine/constants.js'
import { five } from '../../lib/format.js'

export default function Competencies() {
  const { org, employees } = useData()
  const [params, setParams] = useSearchParams()
  const [team, setTeam] = useState('All teams')
  const teams = ['All teams', ...new Set(employees.map((e) => e.team))]
  const people = employees.filter((e) => team === 'All teams' || e.team === team)
  const cols = Object.keys(COMPETENCIES).filter((c) => people.some((p) => p.competencies.includes(c)))
  const sel = params.get('c') || 'leadership'
  const list = org.all.filter((c) => c.competencyId === sel)
  const rows = [1, 2, 3, 4].map((cy) => { const v = list.map((x) => x.trajectory.find((t) => t.cycle === cy)?.score).filter((s) => s != null); return { label: ['Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026'][cy - 1], avg: v.length ? 1 + v.reduce((a, b) => a + b, 0) / v.length / 25 : null, n: v.length } })
  return (
    <div>
      <PageHeader title="Competencies" sub="Framework coverage across people, recent trajectories and skill definitions." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select id="comp-team" className="input h-10 w-auto bg-panel font-semibold" value={team} onChange={(e) => setTeam(e.target.value)}>{teams.map((t) => <option key={t}>{t}</option>)}</select>
        <div className="ml-auto flex flex-wrap gap-3 font-mono text-[10px] uppercase text-olive">{STATE_ORDER.map((s) => <span key={s} className="flex items-center gap-1"><span className="h-3 w-3 border border-ink" style={{ background: STATE_HEX[s] }} />{STATES[s].label}</span>)}</div>
      </div>
      <Panel title="Team competency matrix" sub="Score on the 5-point scale · colour = state · ? = insufficient evidence" bodyClass="p-0 pt-3">
        <div className="overflow-x-auto border-t-2 border-ink">
          <table className="w-full min-w-[1100px] text-[12px]">
            <thead className="bg-sand font-mono text-[10px] uppercase text-olive"><tr><th className="sticky left-0 bg-sand px-3 py-2 text-left">Employee</th>{cols.map((c) => <th key={c} className="px-1 py-2"><button onClick={() => setParams({ c })} className={clsx('uppercase', sel === c && 'text-rust underline')}>{COMPETENCIES[c].label}</button></th>)}</tr></thead>
            <tbody>
              {people.map((p) => {
                const a = org.byEmployee[p.id]
                return (
                  <tr key={p.id} className="border-t border-ink/15">
                    <td className="sticky left-0 bg-panel px-3 py-1.5"><Link to={`/hr/employees/${p.id}`} className="flex items-center gap-2 font-semibold hover:text-rust"><Avatar name={p.name} size={24} />{p.name}</Link></td>
                    {cols.map((c) => {
                      const x = a.competencies.find((y) => y.competencyId === c)
                      if (!x) return <td key={c} className="px-1 text-center text-ink-30">·</td>
                      return <td key={c} className="px-1 py-1"><Link to={`/hr/employees/${p.id}/${c}`} title={`${x.label}: ${x.stateLabel}`} className="flex h-8 items-center justify-center border-2 border-ink font-mono text-[12px] font-bold" style={{ background: x.state === 'insufficient' ? '#E4E9FC' : '#FFF8F3', color: STATE_HEX[x.state], boxShadow: `inset 0 -4px 0 ${STATE_HEX[x.state]}` }}>{x.score == null ? '?' : five(x.score)}</Link></td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <Panel title={`${COMPETENCIES[sel].label} trajectory`} sub={`${list.length} people · average proficiency`}><TeamTrend rows={rows} height={220} /></Panel>
        <Panel title="Competency health" sub={`Required sources: ${COMPETENCIES[sel].required.join(', ')}`}>
          <ul className="max-h-[260px] space-y-1.5 overflow-y-auto">
            {list.sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).map((c) => (
              <li key={c.employeeId}><Link to={`/hr/employees/${c.employeeId}/${sel}`} className="flex items-center gap-2 border-2 border-ink bg-cream px-2.5 py-1.5 hover:bg-sand"><span className="flex-1 text-[13px] font-semibold">{employees.find((e) => e.id === c.employeeId).name}</span><span className="num font-mono text-[12px] font-bold">{c.score ?? '—'}</span><StateBadge state={c.state} size="sm" /></Link></li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
