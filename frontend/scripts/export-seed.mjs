/**
 * Exports rules, seed data and expected engine output to the backend
 * so FastAPI runs on identical data and the parity test can prove it.
 *   npm run export:seed
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as C from '../src/engine/constants.js'
import { EMPLOYEES, HR_USERS } from '../src/data/people.js'
import { EVIDENCE, COMMENTS } from '../src/data/seed.js'
import { readFileSync } from 'node:fs'
import { analyzeOrg, analyzeCompetency } from '../src/engine/analyze.js'
import { parseResume, resumeEvidence } from '../src/engine/resume.js'
import { makeEvidence } from '../src/data/seed.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend')
const out = (p, d) => { const f = resolve(root, p); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(d, null, 2) + '\n') }

out('app/engine/constants.json', { AS_OF: C.AS_OF, CYCLES: C.CYCLES, SOURCES: C.SOURCES, SOURCE_ORDER: C.SOURCE_ORDER, COMPETENCIES: C.COMPETENCIES, RULES: C.RULES, STATES: C.STATES, GAP_TYPES: C.GAP_TYPES, RESUME: C.RESUME })
out('app/seed/employees.json', EMPLOYEES.map(({ patterns, ...e }) => e))
out('app/seed/hr_users.json', HR_USERS)
out('app/seed/evidence.json', EVIDENCE)
out('app/seed/comments.json', COMMENTS)
const org = analyzeOrg(EMPLOYEES, EVIDENCE)
// Resume parsing + a claim entering Sneha's leadership score, for the Python parity test
const sample = readFileSync(resolve(root, '../docs/sample-resumes/ananya-iyer.txt'), 'utf8')
const parsed = parseResume(sample, ['python', 'api_design', 'leadership', 'communication'])
const sneha = EVIDENCE.filter((e) => e.employeeId === 'sneha-deshmukh' && e.competencyId === 'leadership')
const claim = resumeEvidence(parseResume('Led a team of 5 to launch the onboarding dashboard. Leadership training.', ['leadership']), { employeeId: 'sneha-deshmukh', date: C.AS_OF, filename: 'cv.txt' })
  .map((x, i) => ({ ...makeEvidence({ ...x, id: `r${i}` }), seq: EVIDENCE.length + 1 + i }))
const withClaim = analyzeCompetency([...sneha, ...claim], 'leadership', C.AS_OF)
out('tests/fixtures/expected.json', {
  resume: { parsed, claim: claim.map(({ id, value, note }) => ({ id, value, note })), withClaim: { score: withClaim.score, state: withClaim.state, confidence: withClaim.confidence.value, evidenceCount: withClaim.evidenceCount, claim: withClaim.claim } },
  summary: { total: org.total, improvingPct: org.improvingPct, evidenceGaps: org.evidenceGaps, counts: org.counts },
  competencies: org.all.map((c) => ({ employeeId: c.employeeId, competencyId: c.competencyId, state: c.state, score: c.score, confidence: c.confidence.value, label: c.confidence.label, trajectory: c.trajectory.map((t) => t.score), gaps: c.gaps.map((g) => g.type), missing: c.missingRequired })),
})
console.log(`Exported ${EMPLOYEES.length} employees, ${EVIDENCE.length} evidence items, ${org.total} competency assessments.`)
