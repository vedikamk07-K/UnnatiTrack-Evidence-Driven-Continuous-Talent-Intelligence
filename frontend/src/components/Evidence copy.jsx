import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ClipboardCheck, MessageSquare, Users, FolderKanban, GraduationCap, Gauge, TriangleAlert, ArrowRight, Plus } from 'lucide-react'
import { SOURCES, SOURCE_ORDER, COMPETENCIES } from '../engine/constants.js'
import { relevance } from '../engine/analyze.js'
import { Avatar, Modal, Chip, useToast } from './ui.jsx'
import { fmtDate, rawText, five } from '../lib/format.js'
import { useData } from '../state/DataContext.jsx'

export const SOURCE_ICON = { assessment: ClipboardCheck, manager: MessageSquare, peer: Users, project: FolderKanban, training: GraduationCap, kpi: Gauge }
const level = (v) => (v >= 0.85 ? 'High' : v >= 0.7 ? 'Medium' : 'Low')

export function SourceIcon({ source, className }) {
  const Icon = SOURCE_ICON[source]
  return <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-cream', className)}><Icon size={16} /></span>
}

/** One evidence item: source, date, result, reliability, relevance. */
export function EvidenceRow({ e, showPerson, person, compact }) {
  return (
    <article className={clsx('flex gap-3 border-b-2 border-ink/15 px-5 py-4 last:border-0', e.isNew && 'bg-mint/30')}>
      <SourceIcon source={e.source} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[15px] font-semibold leading-snug">{e.title}{e.isNew && <Chip tone="mint" className="ml-2 align-middle">New</Chip>}</div>
            <div className="text-[12px] text-olive">{SOURCES[e.source].label} · {fmtDate(e.date)} · {e.author}</div>
          </div>
          <div className="num text-right font-mono text-[14px] font-bold">{rawText(e)}</div>
        </div>
        {!compact && e.note && <p className="mt-1 text-[13px] text-ink-70">{e.note}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-olive">
          {showPerson && person && <Link to={`/hr/employees/${person.id}`} className="inline-flex items-center gap-1.5 font-bold text-ink hover:text-rust"><Avatar name={person.name} size={20} />{person.name}</Link>}
          <Link to={showPerson ? `/hr/employees/${e.employeeId}/${e.competencyId}` : `/me/competencies/${e.competencyId}`} className="font-bold text-rust hover:underline">{COMPETENCIES[e.competencyId].label}</Link>
          <span>Reliability: <b className="text-ink">{e.reliability != null ? `${Math.round(e.reliability * 100)}%` : level(SOURCES[e.source].reliability)}</b></span>
          <span>Relevance: <b className="text-ink">{e.relevance != null ? `${Math.round(e.relevance * 100)}%` : level(relevance(e.competencyId, e.source))}</b></span>
          <span>≈ {e.value.toFixed(0)} / 100</span>
        </div>
      </div>
    </article>
  )
}

/** Source contribution card for a competency (latest, recent mean, trend). */
export function SourceCard({ s, asOf }) {
  const missing = s.required && !s.recentCount
  if (!s.count && !s.required) return null
  return (
    <div className={clsx('border-2 p-3', missing ? 'border-dashed border-insufficient bg-insufficient-soft' : 'border-ink bg-panel')}>
      <div className="flex items-center gap-2">
        <SourceIcon source={s.source} className="h-8 w-8" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold">{s.label}</div>
          <div className="font-mono text-[10px] uppercase text-olive">{s.required ? 'Required' : 'Supporting'} · {s.count} signal{s.count === 1 ? '' : 's'}</div>
        </div>
        {s.direction !== 'none' && <span className={clsx('font-mono text-[12px] font-bold', s.direction === 'up' ? 'text-improving' : s.direction === 'down' ? 'text-declining' : 'text-stagnating')}>{s.direction === 'up' ? '↑' : s.direction === 'down' ? '↓' : '→'}</span>}
      </div>
      {missing ? (
        <div className="mt-2 flex items-start gap-1.5 text-[12px] font-semibold text-insufficient"><TriangleAlert size={14} className="mt-0.5 shrink-0" />{s.count ? `Missing in last 90 days (last ${fmtDate(s.latest.date)})` : 'Never collected'}</div>
      ) : (
        <div className="mt-2 flex items-baseline justify-between">
          <span className="num font-head text-[22px] font-bold">{s.latest ? rawText({ source: s.source, raw: s.latest.raw, scale: s.latest.scale }) : '—'}</span>
          <span className="font-mono text-[10px] uppercase text-olive">{s.latest ? fmtDate(s.latest.date) : ''}</span>
        </div>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[10px] uppercase text-olive">
        <span>Reliability <b className="text-ink">{level(s.reliability)}</b></span>
        <span>Relevance <b className="text-ink">{level(s.relevance)}</b></span>
      </div>
      {asOf && null}
    </div>
  )
}

/** Contradiction Engine output. */
export function ContradictionCard({ a, person, action }) {
  if (!a.conflict) return null
  const hi = a.sources.find((s) => s.source === a.conflict.high)
  const lo = a.sources.find((s) => s.source === a.conflict.low)
  return (
    <div className="border-2 border-ink bg-panel">
      <div className="flex items-center justify-between gap-2 border-b-2 border-ink bg-conflicting px-3 py-2 text-panel">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider">⚠ Conflicting evidence detected</span>
        {person && <span className="font-mono text-[10px] uppercase">{person.name}</span>}
      </div>
      <div className="space-y-2 p-3">
        {[hi, lo].map((s, i) => (
          <div key={s.source} className={clsx('border-2 px-3 py-2', i === 0 ? 'border-improving bg-improving-soft' : 'border-declining bg-declining-soft')}>
            <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase">
              <span className={i === 0 ? 'text-improving' : 'text-declining'}>{s.label} {s.direction === 'up' ? '↑' : s.direction === 'down' ? '↓' : ''}</span>
              <span>{five(s.recentMean)} / 5</span>
            </div>
            <div className="text-[12px] text-ink-70">Recent mean over {s.recentCount} signal{s.recentCount === 1 ? '' : 's'} in the last 90 days</div>
          </div>
        ))}
        <div className="border-2 border-ink bg-sand px-3 py-2">
          <div className="label text-ink">Contradiction engine</div>
          <p className="mt-0.5 text-[13px] font-semibold">“{hi.label} and {lo.label.toLowerCase()} signals disagree by {a.conflict.spreadFive.toFixed(1)} points{a.missingRequired.includes('project') ? '; no project-based evidence exists' : ''}.”</p>
        </div>
        {action}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------
export function AddEvidenceModal({ open, onClose, preset = {} }) {
  const { employees, addEvidence, asOf } = useData()
  const toast = useToast()
  const [f, setF] = useState({})
  const [err, setErr] = useState('')
  useEffect(() => {
    if (open) {
      const emp = preset.employeeId || employees[0]?.id
      const e = employees.find((x) => x.id === emp)
      const cid = preset.competencyId || e?.competencies[0]
      const source = preset.source || 'manager'
      setF({ employeeId: emp, competencyId: cid, source, date: asOf, raw: SOURCES[source].scale === 5 ? '4.0' : '75', title: '', note: '', ...preset })
      setErr('')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null
  const emp = employees.find((x) => x.id === f.employeeId)
  const scale = SOURCES[f.source || 'manager'].scale
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const submit = async (ev) => {
    ev.preventDefault()
    try {
      const r = await addEvidence(f)
      toast(r.reassessed?.length ? 'Evidence recorded — plan complete, reassessed automatically.' : 'Evidence recorded — skill state recomputed.')
      onClose(r)
    } catch (e) { setErr(e.message) }
  }
  return (
    <Modal open={open} onClose={() => onClose(null)} title="Add evidence" tag={<Chip tone="rust">Triggers recompute</Chip>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-1"><span className="label mb-1 block">Employee</span>
          <select id="ev-emp" className="input" value={f.employeeId} onChange={(e) => { const x = employees.find((p) => p.id === e.target.value); setF((v) => ({ ...v, employeeId: e.target.value, competencyId: x.competencies[0] })) }}>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <label><span className="label mb-1 block">Competency</span>
          <select id="ev-comp" className="input" value={f.competencyId} onChange={set('competencyId')}>
            {emp?.competencies.map((c) => <option key={c} value={c}>{COMPETENCIES[c].label}</option>)}
          </select>
        </label>
        <label><span className="label mb-1 block">Source</span>
          <select id="ev-src" className="input" value={f.source} onChange={(e) => setF((v) => ({ ...v, source: e.target.value, raw: SOURCES[e.target.value].scale === 5 ? '4.0' : '75' }))}>
            {SOURCE_ORDER.map((s) => <option key={s} value={s}>{SOURCES[s].label}</option>)}
          </select>
        </label>
        <label><span className="label mb-1 block">{scale === 5 ? 'Rating (1–5)' : 'Score (0–100)'}</span>
          <input id="ev-raw" className="input num" type="number" step={scale === 5 ? 0.1 : 1} min={scale === 5 ? 1 : 0} max={scale === 5 ? 5 : 100} value={f.raw} onChange={set('raw')} />
        </label>
        <label><span className="label mb-1 block">Event date</span>
          <input id="ev-date" className="input" type="date" value={f.date} onChange={set('date')} />
        </label>
        <label><span className="label mb-1 block">Title</span>
          <input id="ev-title" className="input" placeholder="e.g. Sprint review rubric" value={f.title} onChange={set('title')} />
        </label>
        <label className="sm:col-span-2"><span className="label mb-1 block">Note</span>
          <input id="ev-note" className="input" placeholder="What was observed?" value={f.note} onChange={set('note')} />
        </label>
        {err && <p className="border-2 border-declining bg-declining-soft px-3 py-2 text-[13px] font-semibold text-declining sm:col-span-2">{err}</p>}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <button type="button" className="btn-secondary" onClick={() => onClose(null)}>Cancel</button>
          <button className="btn-primary"><Plus size={16} />Add evidence</button>
        </div>
      </form>
    </Modal>
  )
}

export function ViewEvidenceLink({ to, children = 'View evidence' }) {
  return <Link to={to} className="btn-ghost text-[13px]">{children}<ArrowRight size={14} /></Link>
}
