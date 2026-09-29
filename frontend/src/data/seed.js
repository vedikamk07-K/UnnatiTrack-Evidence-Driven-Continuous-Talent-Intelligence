/**
 * Deterministic synthetic dataset for UnnatiTrack.
 *
 *  - Sneha Deshmukh · Leadership is hand-written (the hero flow).
 *  - A few other cases are hand-tuned (see OVERRIDES).
 *  - Everything else is generated from the pattern codes in people.js with a
 *    seeded PRNG, so every reload — and the backend seed — is identical.
 */
import { EMPLOYEES } from './people.js'
import { COMPETENCIES, SOURCES } from '../engine/constants.js'
import { cycleOf, fromFive } from '../engine/analyze.js'

// ---------------------------------------------------------------------------------
function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hash = (s) => [...s].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 7)
const clampScore = (v) => Math.max(5, Math.min(98, v))

/** Build one evidence item from a raw value on the source's native scale. */
export function makeEvidence({ id, employeeId, competencyId, source, date, raw, title, note, author }) {
  const scale = SOURCES[source].scale
  const value = scale === 5 ? Math.round(fromFive(raw) * 10) / 10 : raw
  return { id, employeeId, competencyId, source, date, cycle: cycleOf(date), raw, scale, value, title, note, author }
}

// ---------------------------------------------------------------------------------
// Hero: Sneha Deshmukh · Leadership. Manager ↑, peer ↓, project missing for 90+ days.
// ---------------------------------------------------------------------------------
const SUNITA = 'Sunita Rao · Manager'
const S = (n, source, date, raw, title, note, author) => makeEvidence({ id: `ev-sneha-lead-${n}`, employeeId: 'sneha-deshmukh', competencyId: 'leadership', source, date, raw, title, note, author })
const SNEHA_LEADERSHIP = [
  S(1, 'manager', '2025-11-18', 3.9, 'Quarterly leadership review', 'Ran the Q4 reporting stand-ups well.', SUNITA),
  S(2, 'peer', '2025-11-12', 3.8, 'Peer feedback · reporting revamp', '“Keeps the squad aligned.”', 'Peer review · 3 reviewers'),
  S(3, 'project', '2025-12-10', 3.4, 'Q4 reporting revamp · outcome review', 'Delivered, but scope decisions were escalated late.', 'Project review board'),
  S(4, 'assessment', '2025-11-06', 58, 'Leadership situational judgement test', 'Solid on delegation, weaker on conflict scenarios.', 'Assessment centre'),
  S(5, 'manager', '2026-02-17', 4.1, 'Quarterly leadership review', 'Took ownership of the churn deep-dive.', SUNITA),
  S(6, 'peer', '2026-02-11', 3.5, 'Peer feedback · churn deep-dive', '“Decisions sometimes made without the team.”', 'Peer review · 3 reviewers'),
  S(7, 'project', '2026-03-10', 3.2, 'Churn deep-dive · outcome review', 'Last project with a leadership component.', 'Project review board'),
  S(8, 'assessment', '2026-02-05', 59, 'Leadership situational judgement test', 'Improved on conflict scenarios.', 'Assessment centre'),
  S(9, 'manager', '2026-05-19', 4.2, 'Quarterly leadership review', 'Strong in leadership reviews with senior stakeholders.', SUNITA),
  S(10, 'peer', '2026-05-13', 3.3, 'Peer feedback · pricing analysis', '“Hard to get time with her during crunch.”', 'Peer review · 3 reviewers'),
  S(11, 'assessment', '2026-05-07', 60, 'Leadership situational judgement test', 'Steady.', 'Assessment centre'),
  S(12, 'peer', '2026-08-19', 3.2, 'Sprint collaboration feedback', '“Clear analysis; narrative varies by audience.”', 'Peer review · Meera Nair'),
  S(13, 'assessment', '2026-08-11', 60, 'Leadership situational judgement test', 'Consistent with last cycle.', 'Assessment centre'),
  S(14, 'peer', '2026-09-08', 3.0, '360° pulse · Insights squad', '“Leads upwards well, less so within the squad.”', 'Peer review · 4 reviewers'),
  S(15, 'manager', '2026-09-15', 4.4, 'Quarterly leadership review', '“Clear and persuasive in leadership reviews.”', SUNITA),
  S(16, 'peer', '2026-09-22', 3.1, 'Peer feedback · dashboard sprint', '“Would like more say in priorities.”', 'Peer review · Yash Verma'),
]

// ---------------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------------
const CYCLE_MONTHS = { 1: [2025, 11], 2: [2026, 2], 3: [2026, 5], 4: [2026, 8] }
const DAY_OF = { assessment: 6, manager: 16, peer: 11, project: 21, training: 25, kpi: 27 }
const MANAGER_AUTHOR = (e) => `${e.manager} · Manager`
const PEERS = ['Riya Patil', 'Meera Nair', 'Rohan Gupta', 'Tanvi Rao', 'Kunal Shah', 'Ananya Joshi', 'Harsh Agarwal', 'Neha Joshi']

const TITLES = {
  assessment: (c) => `${COMPETENCIES[c].label} practical assessment`,
  manager: () => 'Quarterly performance observation',
  peer: () => 'Sprint collaboration feedback',
  project: (c, e, r) => `${['Atlas', 'Orbit', 'Beacon', 'Ledger', 'Pulse', 'Vega'][Math.floor(r() * 6)]} ${['rollout', 'migration', 'revamp', 'pilot'][Math.floor(r() * 4)]} · outcome review`,
  training: (c) => `${COMPETENCIES[c].label} workshop`,
  kpi: (c) => `${COMPETENCIES[c].label} scorecard`,
}
const NOTE = {
  up: ['Clear step up from last cycle.', 'Took on a stretch goal and delivered.', 'Noticeably more confident.', 'Strong, consistent improvement.'],
  down: ['Slipped compared with last cycle.', 'Needed more support than expected.', 'Missed agreed milestones.', 'Less visible this quarter.'],
  flat: ['In line with expectations.', 'No significant change.', 'Meets the bar consistently.', 'Steady.'],
}

/** Hand-tuned per-cycle means (0–100) for cases the demo script relies on. */
const OVERRIDES = {
  'riya-patil::leadership': [70, 75, 80, 85], // strong teacher for pairing
  'riya-patil::python': [44, 45, 43, 44], // weak learner for pairing
  'yash-verma::python': [70, 76, 81, 86], // strong teacher for pairing
  'yash-verma::leadership': [42, 43, 41, 43], // weak learner for pairing
  'aditya-kulkarni::system_design': [82, 75, 68, 61], // declining, high confidence
  'rahul-jadhav::test_automation': [62, 63, 63, 61], // flat after development → Not verified
  'kunal-shah::cloud_security': [54, 58, 63, 72], // development action worked → Verified
  'aarav-sharma::api_design': [70, 76, 82, 88],
}

function meansFor(code, r) {
  const b = 52 + Math.round(r() * 18)
  const step = 5 + Math.round(r() * 2)
  switch (code) {
    case 'I': case 'M': return [b, b + step, b + 2 * step, b + 3 * step].map(clampScore)
    case 'D': return [b + 18, b + 12, b + 6, b].map(clampScore)
    case 'S': return [b + 4, b + 5, b + 3, b + 5]
    case 'X': return [b + 4, b + 5, b + 5, b + 6]
    default: return [b, b, b, b]
  }
}

function generate() {
  const out = []
  for (const emp of EMPLOYEES) {
    emp.competencies.forEach((cid, idx) => {
      if (emp.id === 'sneha-deshmukh' && cid === 'leadership') return
      const code = emp.patterns[idx]
      const r = mulberry32(hash(`${emp.id}:${cid}`))
      const means = OVERRIDES[`${emp.id}::${cid}`] || meansFor(code, r)
      const req = COMPETENCIES[cid].required
      let n = 0
      const push = (source, cycle, v, dayShift = 0, note) => {
        const [y, m] = CYCLE_MONTHS[cycle]
        const month = cycle === 4 && source !== 'assessment' ? m + 1 : m
        const day = Math.min(27, DAY_OF[source] + dayShift)
        const date = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const scale = SOURCES[source].scale
        const raw = scale === 5 ? Math.round((1 + clampScore(v) / 25) * 10) / 10 : Math.round(clampScore(v))
        out.push(makeEvidence({
          id: `ev-${emp.id}-${cid}-${++n}`, employeeId: emp.id, competencyId: cid, source, date, raw,
          title: TITLES[source](cid, emp, r), note: note || NOTE[code === 'D' ? 'down' : code === 'S' || code === 'X' ? 'flat' : 'up'][Math.floor(r() * 4)],
          author: source === 'manager' ? MANAGER_AUTHOR(emp) : source === 'peer' ? `Peer review · ${PEERS[Math.floor(r() * PEERS.length)]}` : source === 'project' ? 'Project review board' : source === 'kpi' ? `${emp.team} scorecard` : source === 'training' ? 'Vidyut Academy' : 'Assessment centre',
        }))
      }

      if (code === 'N') {
        // Insufficient: proxy-only or stale evidence.
        if (emp.id === 'priya-mehta') {
          push('kpi', 4, means[0] + 4, 0, 'Defect escape rate — proxy indicator, needs direct audit evidence.')
          push('kpi', 4, means[0], -12, 'Proxy indicator only.')
        } else {
          push('assessment', 2, means[0] + (r() - 0.5) * 6, 0, 'Baseline only — no follow-up recorded.')
          if (r() > 0.5) push('assessment', 2, means[0] + (r() - 0.5) * 6, 4, 'Retake in the same cycle.')
        }
        return
      }

      for (let c = 1; c <= 4; c++) {
        const mu = means[c - 1]
        const noise = () => (r() - 0.5) * 3
        const sources = new Set(req)
        if (!req.includes('assessment') && c % 2 === 0) sources.add('assessment')
        if (!req.includes('manager')) sources.add('manager')
        if (c === 3 && r() > 0.5) sources.add('training')
        for (const src of sources) {
          if (code === 'M' && c === 4 && src === req[req.length - 1]) continue // required source missing recently
          let v = mu + noise()
          if (code === 'X') {
            // manager & assessment rising, peer (or project) falling, apart by > 1 point
            const low = req.includes('peer') ? 'peer' : 'project'
            if (src === 'manager' || src === 'assessment') v = mu + 6 + c * 4 + noise()
            else if (src === low) v = mu - 2 - c * 4 + noise()
          }
          push(src, c, v)
        }
      }
    })
  }
  return out
}

export const EVIDENCE = [...SNEHA_LEADERSHIP, ...generate()]
  .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  .map((e, i) => ({ ...e, seq: i + 1 }))

// ---------------------------------------------------------------------------------
export const COMMENTS = [
  { id: 'c1', employeeId: 'sneha-deshmukh', visibility: 'employee', author: 'Neha Menon · HR', date: '2026-09-22', competencyId: null, text: 'Your technical skills have improved consistently over the last three assessment cycles. Communication is currently stable. More team-based project experience may help.' },
  { id: 'c2', employeeId: 'sneha-deshmukh', visibility: 'employee', author: 'Neha Menon · HR', date: '2026-09-24', competencyId: 'leadership', text: 'Your manager rates your leadership highly, but your peers see it differently. A short project where you lead the squad will help us understand this properly — it is not a judgement either way.' },
  { id: 'n1', employeeId: 'sneha-deshmukh', visibility: 'private', author: 'Neha Menon · HR', date: '2026-09-24', competencyId: 'leadership', text: 'Private: check with Sunita whether the Insights squad reorg in August is behind the peer scores before the next 1:1.' },
  { id: 'c3', employeeId: 'aarav-sharma', visibility: 'employee', author: 'Neha Menon · HR', date: '2026-09-20', competencyId: null, text: 'Great quarter — API Design and System Design are both trending up with high confidence. Cloud Security has too little evidence to judge yet; the threat-model task will fix that.' },
  { id: 'n2', employeeId: 'aarav-sharma', visibility: 'private', author: 'Neha Menon · HR', date: '2026-09-20', competencyId: null, text: 'Private: shortlist for the Platform tech-lead track in Q1.' },
  { id: 'c4', employeeId: 'priya-mehta', visibility: 'employee', author: 'Neha Menon · HR', date: '2026-09-25', competencyId: 'accessibility', text: 'We only have indirect KPI signals for Accessibility, so we are not drawing any conclusion yet. The WCAG audit will give us direct evidence.' },
  { id: 'c5', employeeId: 'rahul-jadhav', visibility: 'employee', author: 'Neha Menon · HR', date: '2026-09-28', competencyId: 'test_automation', text: 'The fixtures migration was completed, but Test Automation evidence did not move. Let’s try a different action next cycle rather than repeat the same one.' },
]
