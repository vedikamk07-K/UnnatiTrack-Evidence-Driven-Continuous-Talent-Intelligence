import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { FileText, Upload, Download, Trash2, Loader2, UserPlus, Check, CircleAlert } from 'lucide-react'
import { Panel, Modal, Chip, Empty, useToast } from './ui.jsx'
import { useData } from '../state/DataContext.jsx'
import { COMPETENCIES, SOURCES } from '../engine/constants.js'
import { RESUME_ACCEPT } from '../lib/resumeText.js'
import { fmtDate, five } from '../lib/format.js'

const kb = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

/** Hidden file input behind a normal button. */
export function ResumeButton({ employee, className = 'btn-secondary btn-sm', label, onDone }) {
  const { uploadResume } = useData()
  const toast = useToast()
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const r = await uploadResume(employee.id, file)
      const n = r.evidenceIds.length
      toast(`Resume saved — ${n} skill claim${n === 1 ? '' : 's'} added for ${employee.name.split(' ')[0]} (self-reported).`)
      onDone?.(r)
    } catch (x) { toast(x.message, 'error') } finally { setBusy(false) }
  }
  return (
    <>
      <input ref={ref} type="file" accept={RESUME_ACCEPT} className="hidden" onChange={pick} data-testid="resume-input" />
      <button type="button" className={className} disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}{busy ? 'Reading resume…' : label || 'Upload resume'}
      </button>
    </>
  )
}

function ClaimRow({ m }) {
  return (
    <li className="border-b-2 border-ink/10 px-5 py-3 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] font-semibold">{m.label}</span>
        <span className="flex items-center gap-2">
          <span className="num font-mono text-[13px] font-bold">{m.value} / 100 <span className="font-normal text-olive">≈ {five(m.value)} / 5</span></span>
          {m.tracked ? <Chip tone="mint"><Check size={11} />Claim added</Chip> : <Chip>Not tracked</Chip>}
        </span>
      </div>
      <div className="mt-0.5 font-mono text-[10px] uppercase text-olive">Mentioned {m.mentions}×{m.applied ? ` · applied in ${m.applied} statement${m.applied > 1 ? 's' : ''}` : ''}</div>
      {m.snippet && <p className="mt-1 text-[12px] text-ink-70">“{m.snippet}”</p>}
    </li>
  )
}

/** Resume on file for one employee: file, extracted claims, and (HR) upload / replace / remove. */
export function ResumePanel({ employee, hr }) {
  const { resumes, resumeFile, deleteResume } = useData()
  const toast = useToast()
  const r = resumes.find((x) => x.employeeId === employee.id)
  const download = async () => {
    try {
      const f = await resumeFile(employee.id, r.filename)
      const a = document.createElement('a')
      a.href = f.url
      a.download = f.filename
      a.click()
    } catch (x) { toast(x.message, 'error') }
  }
  const remove = async () => {
    try { await deleteResume(employee.id); toast('Resume removed — its skill claims were removed too.') } catch (x) { toast(x.message, 'error') }
  }
  return (
    <Panel id="resume" title="Resume" sub="Self-reported. Claims add a low-weight signal to the score — they never decide state, confidence or conflicts." bodyClass="p-0 pt-2"
      action={hr && <ResumeButton employee={employee} label={r ? 'Replace' : 'Upload resume'} />}>
      {!r ? (
        <div className="border-t-2 border-ink p-5">
          <Empty title="No resume on file">{hr ? 'Upload a PDF, DOCX or TXT (max 5 MB). Skills it mentions become self-reported claims.' : 'HR has not uploaded your resume yet.'}</Empty>
        </div>
      ) : (
        <div className="border-t-2 border-ink" data-testid="resume-panel">
          <div className="flex flex-wrap items-center gap-3 border-b-2 border-ink bg-cream px-5 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-panel"><FileText size={16} /></span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold">{r.filename}</div>
              <div className="font-mono text-[10px] uppercase text-olive">{kb(r.size)} · uploaded {fmtDate(r.uploadedAt)} by {r.uploadedBy}{r.years ? ` · ${r.years}+ yrs stated` : ''}</div>
            </div>
            <button className="btn-ghost text-[13px]" onClick={download}><Download size={14} />Download</button>
            {hr && <button className="btn-ghost text-[13px] text-declining" onClick={remove}><Trash2 size={14} />Remove</button>}
          </div>
          {r.matches.length ? <ul>{r.matches.map((m) => <ClaimRow key={m.competencyId} m={m} />)}</ul>
            : <p className="flex items-center gap-2 px-5 py-4 text-[13px] text-olive"><CircleAlert size={14} />No competency keywords found in this resume.</p>}
        </div>
      )}
    </Panel>
  )
}

/** Resume claim card for the competency page's "Evidence by source" grid. */
export function ClaimCard({ claim }) {
  if (!claim) return null
  return (
    <div className="border-2 border-dashed border-ink bg-sand p-3" data-testid="claim-card">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink bg-cream"><FileText size={16} /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold">{SOURCES.resume.label}</div>
          <div className="font-mono text-[10px] uppercase text-olive">Claim · not verified</div>
        </div>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="num font-head text-[22px] font-bold">{claim.value} / 100</span>
        <span className="font-mono text-[10px] uppercase text-olive">{fmtDate(claim.date)}</span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-ink-70">Weight {SOURCES.resume.reliability} × 0.5 in the score. Excluded from state, confidence, coverage and conflicts.</p>
    </div>
  )
}

// ---------------------------------------------------------------------------------
const BLANK = { name: '', email: '', role: '', team: '', location: 'Pune', experience: '', manager: '', competencies: [] }

/** HR adds a new employee, optionally starting from a resume (prefills name, email, skills). */
export function AddEmployeeModal({ open, onClose }) {
  const { createEmployee, uploadResume, parseResume, employees } = useData()
  const toast = useToast()
  const nav = useNavigate()
  const ref = useRef(null)
  const [f, setF] = useState(BLANK)
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [busy, setBusy] = useState(null) // 'parse' | 'save'
  const [err, setErr] = useState('')
  useEffect(() => { if (open) { setF(BLANK); setFile(null); setParsed(null); setErr(''); setBusy(null) } }, [open])
  if (!open) return null
  const teams = [...new Set(employees.map((e) => e.team))].sort()
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const toggle = (c) => setF((x) => ({ ...x, competencies: x.competencies.includes(c) ? x.competencies.filter((y) => y !== c) : [...x.competencies, c] }))

  const pick = async (e) => {
    const fl = e.target.files?.[0]
    e.target.value = ''
    if (!fl) return
    setErr('')
    setBusy('parse')
    try {
      const p = await parseResume(fl)
      setFile(fl)
      setParsed(p)
      setF((x) => ({
        ...x,
        name: x.name || p.name || '',
        email: x.email || p.email || '',
        experience: x.experience || (p.years ? `${p.years} yrs` : ''),
        competencies: [...new Set([...x.competencies, ...p.matches.slice(0, 6).map((m) => m.competencyId)])],
      }))
    } catch (x) { setErr(x.message) } finally { setBusy(null) }
  }

  const submit = async (ev) => {
    ev.preventDefault()
    setErr('')
    setBusy('save')
    try {
      const emp = await createEmployee(f)
      let msg = `${emp.name} added — they can sign in with ${emp.email} / demo.`
      if (file) {
        const r = await uploadResume(emp.id, file)
        msg += ` Resume saved with ${r.evidenceIds.length} skill claim${r.evidenceIds.length === 1 ? '' : 's'}.`
      }
      toast(msg)
      onClose()
      nav(`/hr/employees/${emp.id}`)
    } catch (x) { setErr(x.message) } finally { setBusy(null) }
  }

  const claimFor = (c) => parsed?.matches.find((m) => m.competencyId === c)
  return (
    <Modal open={open} onClose={onClose} title="Add employee" width="max-w-3xl" tag={<Chip tone="rust">Saved to database</Chip>}>
      <form onSubmit={submit} className="space-y-5">
        <section className="border-2 border-dashed border-ink bg-sand p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="label text-ink">Start from a resume (optional)</div>
              <p className="mt-0.5 text-[13px] text-ink-70">PDF, DOCX or TXT · fills in name, email and the skills it mentions. Nothing is stored until you save.</p>
            </div>
            <input ref={ref} type="file" accept={RESUME_ACCEPT} className="hidden" onChange={pick} data-testid="new-emp-resume" />
            <button type="button" className="btn-secondary btn-sm" disabled={!!busy} onClick={() => ref.current?.click()}>
              {busy === 'parse' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}{busy === 'parse' ? 'Reading resume…' : file ? 'Choose another' : 'Choose resume'}
            </button>
          </div>
          {file && parsed && (
            <div className="mt-3 flex items-center gap-2 border-2 border-ink bg-panel px-3 py-2 text-[13px]">
              <FileText size={15} /><b className="truncate">{file.name}</b>
              <span className="ml-auto font-mono text-[10px] uppercase text-olive">{parsed.matches.length} skill{parsed.matches.length === 1 ? '' : 's'} found{parsed.years ? ` · ${parsed.years}+ yrs` : ''}</span>
            </div>
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="label mb-1 block">Full name *</span><input id="ne-name" className="input" value={f.name} onChange={set('name')} placeholder="e.g. Ananya Iyer" /></label>
          <label><span className="label mb-1 block">Work email *</span><input id="ne-email" type="email" className="input" value={f.email} onChange={set('email')} placeholder="name@vidyut.in" /></label>
          <label><span className="label mb-1 block">Role *</span><input id="ne-role" className="input" value={f.role} onChange={set('role')} placeholder="e.g. Senior Software Engineer" /></label>
          <label><span className="label mb-1 block">Team</span><input id="ne-team" className="input" list="ne-teams" value={f.team} onChange={set('team')} placeholder="e.g. Payments" /><datalist id="ne-teams">{teams.map((t) => <option key={t} value={t} />)}</datalist></label>
          <label><span className="label mb-1 block">Location</span><input id="ne-loc" className="input" value={f.location} onChange={set('location')} /></label>
          <label><span className="label mb-1 block">Experience</span><input id="ne-exp" className="input" value={f.experience} onChange={set('experience')} placeholder="e.g. 6 yrs" /></label>
          <label className="sm:col-span-2"><span className="label mb-1 block">Reports to</span><input id="ne-mgr" className="input" value={f.manager} onChange={set('manager')} placeholder="Manager name" /></label>
        </div>

        <fieldset>
          <legend className="label mb-2 block">Competencies to track * <span className="normal-case tracking-normal text-olive">— each is assessed on its own evidence</span></legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(COMPETENCIES).map(([c, { label }]) => {
              const on = f.competencies.includes(c)
              const m = claimFor(c)
              return (
                <button type="button" key={c} onClick={() => toggle(c)} aria-pressed={on} className={clsx('flex items-center gap-2 border-2 border-ink px-2.5 py-2 text-left text-[13px] font-semibold', on ? 'bg-ink text-panel' : 'bg-panel hover:bg-cream')}>
                  <span className={clsx('flex h-4 w-4 shrink-0 items-center justify-center border-2', on ? 'border-panel' : 'border-ink')}>{on && <Check size={11} />}</span>
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {m && <span className={clsx('font-mono text-[10px] font-bold', on ? 'text-mint' : 'text-rust')}>CV {m.value}</span>}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[12px] text-olive">A new employee starts as <b>Insufficient evidence</b> on every skill — resume claims alone are never enough. Add assessments, feedback or project outcomes to assess them.</p>
        </fieldset>

        {err && <p role="alert" className="border-2 border-declining bg-declining-soft px-3 py-2 text-[13px] font-semibold text-declining">{err}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button id="ne-save" className="btn-primary" disabled={!!busy}>{busy === 'save' ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}{busy === 'save' ? 'Saving…' : 'Add employee'}</button>
        </div>
      </form>
    </Modal>
  )
}
