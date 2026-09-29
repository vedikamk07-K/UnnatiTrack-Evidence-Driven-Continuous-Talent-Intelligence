import { describe, it, expect, beforeEach } from 'vitest'
import { server } from './mockServer.js'

const hr = () => server.login('hr', 'neha.menon@vidyut.in', 'demo')
const sneha = () => server.login('employee', 'sneha.deshmukh@vidyut.in', 'demo')

describe('role-scoped data access', () => {
  beforeEach(() => server.reset())
  it('employee dataset contains only their own records', () => {
    const d = server.dataset(sneha())
    expect(d.employees.map((e) => e.id)).toEqual(['sneha-deshmukh'])
    expect(new Set(d.evidence.map((e) => e.employeeId))).toEqual(new Set(['sneha-deshmukh']))
    expect(d.comments.every((c) => c.visibility === 'employee' && c.employeeId === 'sneha-deshmukh')).toBe(true)
  })
  it('private HR notes never reach the employee', () => {
    expect(JSON.stringify(server.dataset(sneha()))).not.toMatch(/Private:/)
    expect(JSON.stringify(server.dataset(hr()))).toMatch(/Private:/)
  })
  it('generator patterns are never exposed', () => {
    expect(server.dataset(hr()).employees[0].patterns).toBeUndefined()
  })
  it('employees cannot write evidence or plans', () => {
    expect(() => server.addEvidence(sneha(), { employeeId: 'sneha-deshmukh', competencyId: 'leadership', source: 'manager', raw: 5 })).toThrow(/HR access/)
  })
  it('wrong-role logins are rejected', () => {
    expect(() => server.login('hr', 'sneha.deshmukh@vidyut.in', 'demo')).toThrow(/HR access/)
    expect(() => server.login('employee', 'neha.menon@vidyut.in', 'demo')).toThrow()
  })
  it('HR evidence is validated, stored and recomputed', () => {
    const s = hr()
    const before = server.dataset(s).evidence.length
    expect(() => server.addEvidence(s, { employeeId: 'sneha-deshmukh', competencyId: 'leadership', source: 'manager', raw: 7, date: '2026-09-29' })).toThrow(/between 1 and 5/)
    const r = server.addEvidence(s, { employeeId: 'sneha-deshmukh', competencyId: 'leadership', source: 'project', raw: 4.0, scale: 5, date: '2026-09-29', title: 'Onboarding dashboard' })
    expect(r.item).toMatchObject({ source: 'project', value: 75, isNew: true })
    expect(server.dataset(s).evidence.length).toBe(before + 1)
    expect(server.dataset(sneha()).evidence.some((e) => e.id === r.item.id)).toBe(true)
  })
})
