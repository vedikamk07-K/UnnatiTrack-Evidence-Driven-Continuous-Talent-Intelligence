/**
 * In-browser mock of the FastAPI backend.
 *
 * It behaves like the real API: every call takes a session ({ role, employeeId })
 * and returns ONLY what that role may see. An employee session can never receive
 * other employees' records, scores, rankings or private HR notes — the data simply
 * isn't in the payload. The real backend enforces the same rules from JWT claims
 * (backend/app/deps.py).
 *
 * State (added employees, resumes, evidence, comments, demo clock) persists in localStorage so
 * HR and Employee views in the same browser see the same "database".
 */
import { EMPLOYEES, HR_USERS } from '../data/people.js'
import { EVIDENCE, COMMENTS } from '../data/seed.js'
import { AS_OF, SOURCES, COMPETENCIES } from '../engine/constants.js'
import { cycleOf } from '../engine/analyze.js'
import { normaliseEvidence } from '../engine/evidence.js'
import { parseResume, resumeEvidence } from '../engine/resume.js'

const KEY = 'unnatitrack.db.m1'
const BASE_SEQ = EVIDENCE.length

const strip = ({ patterns, ...e }) => e // generator input, never exposed

function fresh() {
  return { asOf: AS_OF, added: [], employees: [], resumes: {}, comments: COMMENTS, activity: [], seq: BASE_SEQ }
}

let db = load()
const listeners = new Set()
function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...fresh(), ...JSON.parse(raw) }
  } catch { /* storage unavailable */ }
  return fresh()
}
function commit() {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* storage unavailable */ }
  listeners.forEach((l) => l())
}
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === KEY) { db = load(); listeners.forEach((l) => l()) } })
}

const allEvidence = () => [...EVIDENCE, ...db.added]
const emps = () => [...EMPLOYEES, ...db.employees]
const findEmp = (id) => emps().find((e) => e.id === id)
const resumeMeta = ({ dataUrl, text, ...r }) => ({ ...r, hasFile: !!dataUrl, chars: text.length })
/** Keep a copy of the file for download when it fits in browser storage (the API stores any size). */
const MAX_OFFLINE_FILE = 1.5 * 1024 * 1024

function guard(session, role) {
  if (!session) throw new Error('Not signed in.')
  if (role && session.role !== role) throw new Error('This action needs HR access.')
}

function log(text, employeeId) {
  db.activity = [{ id: `a${Date.now()}${Math.random()}`, at: db.asOf, text, employeeId }, ...db.activity].slice(0, 30)
}

// ---------------------------------------------------------------------------------
export const server = {
  // ---- auth -----------------------------------------------------------------------
  login(role, email, password) {
    const e = email.trim().toLowerCase()
    if (!e || !password) throw new Error('Enter your work email and password.')
    if (role === 'hr') {
      const u = HR_USERS.find((x) => x.email === e)
      if (!u) throw new Error(emps().some((x) => x.email === e) ? 'This account does not have HR access. Use Employee login.' : 'No HR account with that email.')
      if (password !== u.password) throw new Error('Incorrect password.')
      return { role: 'hr', userId: u.id, name: u.name, title: u.title }
    }
    const emp = emps().find((x) => x.email === e)
    if (!emp) throw new Error(HR_USERS.some((x) => x.email === e) ? 'HR accounts sign in through HR login.' : 'No employee account with that email.')
    if (password !== 'demo') throw new Error('Incorrect password.')
    return { role: 'employee', userId: emp.id, employeeId: emp.id, name: emp.name, title: `${emp.role} · ${emp.team}` }
  },
  demoAccounts: {
    hr: HR_USERS.map((u) => ({ email: u.email, name: u.name, title: u.title })),
    employee: ['sneha-deshmukh', 'aarav-sharma', 'priya-mehta'].map((id) => { const e = EMPLOYEES.find((x) => x.id === id); return { email: e.email, name: e.name, title: e.role } }),
  },

  // ---- datasets (role-scoped) ---------------------------------------------------------
  dataset(session) {
    guard(session)
    if (session.role === 'hr') {
      return { scope: 'organization', asOf: db.asOf, employees: emps().map(strip), evidence: allEvidence(), comments: db.comments, activity: db.activity, resumes: Object.values(db.resumes).map(resumeMeta) }
    }
    const me = findEmp(session.employeeId)
    return {
      scope: 'self',
      asOf: db.asOf,
      employees: [strip(me)],
      evidence: allEvidence().filter((e) => e.employeeId === me.id),
      comments: db.comments.filter((c) => c.employeeId === me.id && c.visibility === 'employee'),
      activity: db.activity.filter((a) => a.employeeId === me.id),
      resumes: db.resumes[me.id] ? [resumeMeta(db.resumes[me.id])] : [],
    }
  },

  // ---- evidence ------------------------------------------------------------------------
  addEvidence(session, input, { selfReported = false } = {}) {
    guard(session, 'hr')
    if (SOURCES[input.source]?.selfReported && !selfReported) throw new Error('Resume claims come from an uploaded resume, not manual entry.')
    const emp = findEmp(input.employeeId)
    if (!emp) throw new Error('Choose an employee.')
    if (!emp.competencies.includes(input.competencyId)) throw new Error('That competency is not tracked for this employee.')
    const n = normaliseEvidence({ ...input, date: input.date || db.asOf })
    const date = n.date
    const item = { id: `ev-new-${db.seq + 1}`, employeeId: emp.id, competencyId: input.competencyId, ...n, cycle: cycleOf(date), title: input.title || `${SOURCES[input.source].label}`, note: input.note || '', author: input.author || 'Added by Neha Menon · HR', seq: ++db.seq, isNew: true }
    db.added.push(item)
    if (date > db.asOf) db.asOf = date
    log(`${SOURCES[item.source].label} added for ${emp.name}`, emp.id)
    commit()
    return { item }
  },

  // ---- HR comments -----------------------------------------------------------------------
  addComment(session, employeeId, text, visibility) {
    guard(session, 'hr')
    if (!text.trim()) throw new Error('Write a comment first.')
    const c = { id: `c${Date.now()}`, employeeId, visibility, author: `${session.name} · HR`, date: db.asOf, competencyId: null, text: text.trim() }
    db.comments = [c, ...db.comments]
    commit()
    return c
  },

  // ---- employees & resumes ----------------------------------------------------------------
  /** POST /employees — HR adds an employee; they can sign in with the demo password. */
  createEmployee(session, body) {
    guard(session, 'hr')
    const name = (body.name || '').trim()
    const email = (body.email || '').trim().toLowerCase()
    const competencies = (body.competencies || []).filter((c) => COMPETENCIES[c])
    if (name.length < 2 || !(body.role || '').trim()) throw new Error('Name and role are required.')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Enter a valid work email.')
    if (!competencies.length) throw new Error('Choose at least one competency to track.')
    if (emps().some((e) => e.email === email) || HR_USERS.some((u) => u.email === email)) throw new Error('An account with that email already exists.')
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'employee'
    let id = base
    for (let n = 2; findEmp(id); n++) id = `${base}-${n}`
    const e = { id, name, email, role: body.role.trim(), team: (body.team || 'Unassigned').trim(), location: (body.location || 'Pune').trim(), experience: (body.experience || '—').trim(), manager: (body.manager || '—').trim(), competencies }
    db.employees.push(e)
    log(`Employee added: ${name}`, id)
    commit()
    return e
  },

  /** Preview only (nothing stored) — the text is extracted in the browser in offline mode. */
  parseResume(session, text) {
    guard(session, 'hr')
    return parseResume(text)
  },

  /** POST /employees/{id}/resume — store it, replace earlier claims, add one claim per tracked competency. */
  uploadResume(session, employeeId, { filename, contentType, size, text, dataUrl }) {
    guard(session, 'hr')
    const emp = findEmp(employeeId)
    if (!emp) throw new Error('Employee not found.')
    if (!text || !text.trim()) throw new Error('No readable text found in this resume (scanned image PDFs are not supported).')
    const parsed = parseResume(text, emp.competencies)
    db.added = db.added.filter((x) => !(x.employeeId === employeeId && x.source === 'resume'))
    const ids = resumeEvidence(parsed, { employeeId, date: db.asOf, filename }).map((x) => this.addEvidence(session, x, { selfReported: true }).item.id)
    db.resumes[employeeId] = { employeeId, filename, contentType, size, uploadedAt: db.asOf, uploadedBy: session.name, years: parsed.years, matches: parsed.matches, evidenceIds: ids, text, dataUrl: dataUrl && size <= MAX_OFFLINE_FILE ? dataUrl : null }
    log(`Resume uploaded for ${emp.name} · ${ids.length} skill claim${ids.length === 1 ? '' : 's'}`, employeeId)
    commit()
    return resumeMeta(db.resumes[employeeId])
  },

  deleteResume(session, employeeId) {
    guard(session, 'hr')
    if (!db.resumes[employeeId]) throw new Error('No resume on file.')
    db.added = db.added.filter((x) => !(x.employeeId === employeeId && x.source === 'resume'))
    delete db.resumes[employeeId]
    commit()
  },

  /** GET /employees/{id}/resume/file — HR, or the employee themself. */
  resumeFile(session, employeeId) {
    guard(session)
    if (session.role !== 'hr' && session.employeeId !== employeeId) throw new Error('PRIVATE INFORMATION — you can only access your own growth data.')
    const r = db.resumes[employeeId]
    if (!r) throw new Error('No resume on file.')
    if (!r.dataUrl) throw new Error('The file was too large to keep in the offline demo — its skills were still extracted.')
    return { filename: r.filename, url: r.dataUrl }
  },

  reset() { db = fresh(); commit() },
  _db: () => db,
}

