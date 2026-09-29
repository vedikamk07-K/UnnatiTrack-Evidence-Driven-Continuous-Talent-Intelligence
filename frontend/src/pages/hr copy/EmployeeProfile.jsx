import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { ChevronRight, Info, Lock, Send, Eye, MapPin, Plus } from 'lucide-react'
import { Panel, Avatar, Empty, Chip, useToast } from '../../components/ui.jsx'
import CompetencyCard from '../../components/CompetencyCard.jsx'
import { TrajectoryChart, SourceLegend } from '../../components/charts.jsx'
import { EvidenceRow, AddEvidenceModal } from '../../components/Evidence.jsx'
import { useData } from '../../state/DataContext.jsx'
import { fmtDate } from '../../lib/format.js'

export default function EmployeeProfile() {
  const { id } = useParams()
  const { org, evidence, comments, comment, asOf } = useData()
  const toast = useToast()
  const a = org.byEmployee[id]
  const [sel, setSel] = useState(null)
  const [text, setText] = useState('')
  const [vis, setVis] = useState('employee')
  const [addOpen, setAddOpen] = useState(false)
  if (!a) return <Empty title="Employee not found"><Link className="btn-ghost" to="/hr/employees">Back to employees</Link></Empty>
  const e = a.employee
  const focus = a.competencies.find((c) => c.competencyId === (sel || a.focus.competencyId))
  const mine = evidence.filter((x) => x.employeeId === id && x.date <= asOf).sort((x, y) => y.date.localeCompare(x.date))
  const notes = comments.filter((c) => c.employeeId === id)
  const post = async () => { try { await comment(id, text, vis); setText(''); toast(vis === 'employee' ? `Comment shared with ${e.name.split(' ')[0]}.` : 'Private note saved — HR only.') } catch (x) { toast(x.message, 'error') } }

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1.5 font-mono text-[11px] uppercase text-olive"><Link to="/hr/employees" className="hover:text-rust">Employees</Link><ChevronRight size={12} /><span className="font-bold text-ink">{e.name}</span></nav>
      <header className="panel animate-in p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={e.name} size={64} tone="ink" />
          <div className="min-w-0 flex-1">
            <h1 className="font-head text-[38px] font-bold uppercase leading-none">{e.name}</h1>
            <p className="mt-1.5 text-[15px] text-ink-70">{e.role} · {e.team}</p>
            <p className="mt-1 flex items-center gap-1 font-mono text-[11px] uppercase text-olive"><MapPin size={12} />{e.location} · {e.experience} · reports to {e.manager}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Chip><Eye size={11} />HR view · authorized</Chip>
            <div className="flex gap-2">
              <button className="btn-secondary btn-sm" onClick={() => setAddOpen(true)}><Plus size={14} />Add evidence</button>
            </div>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[[a.competencies.length, 'Competencies tracked'], [a.evidenceCount, 'Evidence items'], [a.gaps, 'Evidence gaps'], [a.counts.conflicting, 'Conflicts']].map(([v, l]) => (
            <div key={l} className="border-2 border-ink bg-cream px-3 py-2"><dd className="num font-head text-[26px] font-bold">{v}</dd><dt className="text-[12px] text-olive">{l}</dt></div>
          ))}
        </dl>
      </header>

      <div className="flex items-center gap-2 border-2 border-ink bg-sand px-3 py-2 text-[13px] font-semibold"><Info size={15} />No overall employee score. Each competency is assessed on its own evidence — {a.counts.improving} improving, {a.counts.stagnating} stagnating, {a.counts.declining} declining, {a.counts.conflicting} conflicting, {a.counts.insufficient} insufficient.</div>

      <section>
        <h2 className="h-panel mb-3">Competency health</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {a.competencies.map((c) => <CompetencyCard key={c.competencyId} a={c} to={`/hr/employees/${id}/${c.competencyId}`} />)}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Longitudinal trajectory" sub="Choose a competency · 4 review cycles">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {a.competencies.map((c) => <button key={c.competencyId} onClick={() => setSel(c.competencyId)} className={clsx('border-2 border-ink px-2 py-1 font-mono text-[10px] font-bold uppercase', focus.competencyId === c.competencyId ? 'bg-ink text-panel' : 'bg-panel hover:bg-cream')}>{c.label}</button>)}
          </div>
          <TrajectoryChart a={focus} height={260} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><SourceLegend sources={focus.sources.filter((s) => s.count).map((s) => s.source)} /><Link to={`/hr/employees/${id}/${focus.competencyId}`} className="btn-ghost text-[13px]">Open {focus.label} →</Link></div>
        </Panel>
        <Panel title="Recent evidence" sub="Newest first" bodyClass="p-0 pt-2">
          <div className="max-h-[380px] overflow-y-auto border-t-2 border-ink">{mine.slice(0, 10).map((x) => <EvidenceRow key={x.id} e={x} compact />)}</div>
        </Panel>
      </div>

      <AddEvidenceModal open={addOpen} onClose={() => setAddOpen(false)} preset={{ employeeId: id, competencyId: focus.competencyId }} />

      <Panel title="HR comments" sub="Shared comments appear in the employee’s HR Feedback. Private notes never leave the HR portal.">
        <div className="mb-4 space-y-2">
          <textarea id="hr-comment" className="input h-24 py-2" placeholder={`Write to ${e.name.split(' ')[0]} about their growth…`} value={text} onChange={(x) => setText(x.target.value)} />
          <div className="flex flex-wrap items-center gap-2">
            {[['employee', 'Share with employee', Send], ['private', 'Private HR note', Lock]].map(([v, l, I]) => (
              <button key={v} onClick={() => setVis(v)} className={clsx('inline-flex h-8 items-center gap-1.5 border-2 border-ink px-2.5 text-[12px] font-semibold', vis === v ? 'bg-ink text-panel' : 'bg-panel')}><I size={13} />{l}</button>
            ))}
            <button className="btn-primary btn-sm ml-auto" onClick={post}>Save comment</button>
          </div>
        </div>
        <ul className="space-y-2">
          {notes.map((c) => (
            <li key={c.id} className={clsx('border-2 px-3 py-2.5', c.visibility === 'private' ? 'border-dashed border-ink bg-sand' : 'border-ink bg-cream')}>
              <div className="flex items-center justify-between font-mono text-[10px] uppercase text-olive"><span>{c.author} · {fmtDate(c.date)}</span><span className={clsx('font-bold', c.visibility === 'private' ? 'text-rust' : 'text-improving')}>{c.visibility === 'private' ? '🔒 Private · HR only' : 'Shared with employee'}</span></div>
              <p className="mt-1 text-[13px]">{c.text}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
