import { describe, it, expect } from 'vitest'
import { EMPLOYEES } from '../data/people.js'
import { EVIDENCE } from '../data/seed.js'
import { analyzeOrg, analyzeCompetency, theilSen } from './analyze.js'

const org = analyzeOrg(EMPLOYEES, EVIDENCE)
const comp = (e, c) => org.byEmployee[e].competencies.find((x) => x.competencyId === c)
const MAP = { I: 'improving', M: 'improving', S: 'stagnating', D: 'declining', N: 'insufficient', X: 'conflicting' }

describe('seeded organisation matches the demo numbers', () => {
  it('24 employees · 156 competencies · 68% improving · 17 evidence gaps', () => {
    expect(Object.keys(org.byEmployee)).toHaveLength(24)
    expect(org.total).toBe(156)
    expect(org.improvingPct).toBe(68)
    expect(org.evidenceGaps).toBe(17)
  })
  it('the engine recovers every generated pattern from evidence alone', () => {
    for (const e of EMPLOYEES) e.competencies.forEach((c, i) => expect([e.id, c, comp(e.id, c).state]).toEqual([e.id, c, MAP[e.patterns[i]]]))
  })
  it('never produces an overall employee score', () => {
    expect(org.byEmployee['sneha-deshmukh'].score).toBeUndefined()
  })
})

describe('required scenarios', () => {
  it('Sneha · leadership: conflicting, LOW–MEDIUM, 1.3-point manager/peer disagreement, project missing', () => {
    const a = comp('sneha-deshmukh', 'leadership')
    expect(a.state).toBe('conflicting')
    expect(a.confidence.label).toBe('LOW–MEDIUM')
    expect(a.conflict).toMatchObject({ high: 'manager', low: 'peer', spreadFive: 1.3 })
    expect(a.missingRequired).toContain('project')
    expect(a.score).toBe(62)
  })
  it('Sneha profile mixes states', () => {
    expect(['technical', 'communication', 'problem_solving', 'teamwork'].map((c) => comp('sneha-deshmukh', c).state)).toEqual(['improving', 'stagnating', 'insufficient', 'improving'])
  })
  it('Aditya · system design declines with high confidence', () => {
    expect(comp('aditya-kulkarni', 'system_design')).toMatchObject({ state: 'declining', confidence: expect.objectContaining({ level: 'high' }) })
  })
  it('Priya · accessibility is insufficient (proxy-only evidence)', () => {
    expect(comp('priya-mehta', 'accessibility').state).toBe('insufficient')
    expect(comp('priya-mehta', 'accessibility').score).toBeNull()
  })
  it('Rohan improves in one skill while declining in another', () => {
    expect(comp('rohan-gupta', 'technical').state).toBe('improving')
    expect(comp('rohan-gupta', 'leadership').state).toBe('declining')
  })
  it('Theil–Sen is the median pairwise slope', () => {
    expect(theilSen([1, 2, 3], [60, 61, 80])).toBe(10)
  })
})

describe('missing evidence', () => {
  const items = EVIDENCE.filter((e) => e.employeeId === 'sneha-deshmukh' && e.competencyId === 'leadership')
  it('missing evidence lowers confidence, not score', () => {
    const a = analyzeCompetency(items, 'leadership')
    expect(a.score).toBe(62)
    expect(a.confidence.value).toBeLessThan(0.55)
  })
})
