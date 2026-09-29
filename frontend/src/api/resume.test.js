import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { server } from './mockServer.js'
import { parseResume } from '../engine/resume.js'
import { analyzeEmployee } from '../engine/analyze.js'

const hr = () => server.login('hr', 'neha.menon@vidyut.in', 'demo')
const SAMPLE = readFileSync(new URL('../../../docs/sample-resumes/ananya-iyer.txt', import.meta.url), 'utf8')

describe('resume parser', () => {
  it('finds skills, email, name and years deterministically', () => {
    const p = parseResume(SAMPLE, ['python'])
    expect(p).toMatchObject({ name: 'Ananya Iyer', email: 'ananya.iyer@vidyut.in', years: 6 })
    expect(p.matches[0]).toMatchObject({ competencyId: 'python', value: 80, tracked: true })
    expect(p.matches.every((m) => m.value <= 80)).toBe(true) // a claim can never outrank verified evidence
  })
  it('whole words only — "java" does not match "javascript"', () => {
    expect(parseResume('Wrote JavaScript daily.').matches.find((m) => m.competencyId === 'technical').mentions).toBe(1)
    expect(parseResume('No skills here.').matches).toEqual([])
  })
})

describe('add employee + resume (offline server)', () => {
  beforeEach(() => server.reset())
  it('creates a login-able employee whose resume claims stay insufficient', () => {
    const s = hr()
    const e = server.createEmployee(s, { name: 'Ananya Iyer', email: 'ananya.iyer@vidyut.in', role: 'Senior Software Engineer', team: 'Payments', competencies: ['python', 'api_design', 'leadership'] })
    expect(() => server.createEmployee(s, { name: 'X Y', email: 'ananya.iyer@vidyut.in', role: 'R', competencies: ['python'] })).toThrow(/already exists/)
    expect(server.login('employee', 'ananya.iyer@vidyut.in', 'demo').employeeId).toBe(e.id)

    const r = server.uploadResume(s, e.id, { filename: 'ananya.txt', contentType: 'text/plain', size: SAMPLE.length, text: SAMPLE, dataUrl: 'data:text/plain;base64,QQ==' })
    expect(r.evidenceIds).toHaveLength(3) // one claim per tracked competency the resume mentions ("Led a team of 4" → leadership)
    const d = server.dataset(s)
    const a = analyzeEmployee(d.employees.find((x) => x.id === e.id), d.evidence, d.asOf)
    expect(a.competencies.every((c) => c.state === 'insufficient')).toBe(true)
    expect(a.competencies.find((c) => c.competencyId === 'python').claim.value).toBe(80)
    expect(a.competencies[0].why[0]).toMatch(/self-reported resume claim/)

    // re-upload replaces, employee sees only their own resume, manual resume evidence is refused
    server.uploadResume(s, e.id, { filename: 'v2.txt', size: 10, text: 'Python and FastAPI.', dataUrl: null })
    expect(server.dataset(s).evidence.filter((x) => x.employeeId === e.id)).toHaveLength(1)
    const me = server.login('employee', 'ananya.iyer@vidyut.in', 'demo')
    expect(server.dataset(me).resumes.map((x) => x.employeeId)).toEqual([e.id])
    expect(() => server.resumeFile(me, 'sneha-deshmukh')).toThrow(/PRIVATE/)
    expect(() => server.addEvidence(s, { employeeId: e.id, competencyId: 'python', source: 'resume', raw: 90, date: '2026-09-29' })).toThrow(/uploaded resume/)
    expect(() => server.uploadResume(me, e.id, { filename: 'x.txt', size: 1, text: 'python' })).toThrow(/HR access/)
  })
})
