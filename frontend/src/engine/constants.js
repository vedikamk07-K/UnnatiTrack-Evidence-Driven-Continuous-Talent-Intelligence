/**
 * UnnatiTrack — engine constants (single source of truth).
 *
 * `npm run export:seed` writes these to backend/app/engine/constants.json so the
 * FastAPI engine uses identical rules. backend/tests/test_parity.py fails if the
 * JS and Python engines ever disagree.
 *
 * All evidence is normalised to 0–100 internally. Ratings on a 1–5 scale map
 * linearly so that 1 → 0 and 5 → 100:  value = (rating − 1) × 25  (4.4 / 5 → 85).
 * The UI always shows the original scale next to it.
 */

/** Demo "today". Fixed so the seeded story always reads the same. */
export const AS_OF = '2026-09-29'

export const ORG = { name: 'Vidyut Systems', city: 'Pune', cycle: 'Q3 Review Cycle' }

export const CYCLES = [
  { id: 1, label: 'Q4 2025', short: 'Q4’25', start: '2025-10-01', end: '2025-12-31' },
  { id: 2, label: 'Q1 2026', short: 'Q1', start: '2026-01-01', end: '2026-03-31' },
  { id: 3, label: 'Q2 2026', short: 'Q2', start: '2026-04-01', end: '2026-06-30' },
  { id: 4, label: 'Q3 2026', short: 'Q3', start: '2026-07-01', end: '2026-09-30' },
  { id: 5, label: 'Q4 2026', short: 'Q4', start: '2026-10-01', end: '2026-12-31' },
]

/** reliability = how much one signal from this source is trusted in general. */
export const SOURCES = {
  assessment: { label: 'Assessment', reliability: 0.85, scale: 100 },
  manager: { label: 'Manager feedback', reliability: 0.8, scale: 5 },
  peer: { label: 'Peer feedback', reliability: 0.7, scale: 5 },
  project: { label: 'Project outcome', reliability: 0.9, scale: 5 },
  training: { label: 'Training result', reliability: 0.75, scale: 100 },
  kpi: { label: 'KPI', reliability: 0.85, scale: 100 },
  // Self-reported claims parsed from an uploaded resume. They nudge the current score with a
  // low weight, but never count as a source for state, confidence, coverage or conflicts.
  resume: { label: 'Resume (self-reported)', reliability: 0.3, scale: 100, selfReported: true },
}
/** Verified evidence sources — the only ones that decide state, confidence, coverage and conflicts. */
export const SOURCE_ORDER = ['assessment', 'manager', 'peer', 'project', 'training', 'kpi']

/**
 * Competency framework. `required` = the role-required source coverage matrix:
 * the sources that must have recent evidence for a confident conclusion.
 * Relevance: required sources 1.0, other sources 0.6, training 0.4.
 */
export const COMPETENCIES = {
  technical: { label: 'Technical Skills', required: ['assessment', 'project', 'kpi'] },
  communication: { label: 'Communication', required: ['manager', 'peer'] },
  leadership: { label: 'Leadership', required: ['manager', 'peer', 'project'] },
  problem_solving: { label: 'Problem Solving', required: ['assessment', 'project'] },
  teamwork: { label: 'Teamwork', required: ['peer', 'manager'] },
  system_design: { label: 'System Design', required: ['assessment', 'project'] },
  api_design: { label: 'API Design', required: ['assessment', 'project'] },
  python: { label: 'Python', required: ['assessment', 'project'] },
  data_storytelling: { label: 'Data Storytelling', required: ['manager', 'project'] },
  stakeholder: { label: 'Stakeholder Management', required: ['manager', 'project'] },
  accessibility: { label: 'Accessibility', required: ['assessment', 'project'] },
  test_automation: { label: 'Test Automation', required: ['project', 'kpi'] },
  cloud_security: { label: 'Cloud Security', required: ['assessment', 'project'] },
  mentoring: { label: 'Technical Mentoring', required: ['peer', 'manager'] },
}

/**
 * Resume parsing (self-reported claims). Keywords are matched as whole words, longest first.
 * value = min(cap, base + perMention × min(mentions, maxMentions) + perApplied × min(applied, maxApplied))
 * "applied" = a sentence that names the skill together with an action verb (led, built, designed…).
 */
export const RESUME = {
  base: 50, perMention: 5, maxMentions: 4, perApplied: 5, maxApplied: 2, cap: 80,
  maxBytes: 5 * 1024 * 1024,
  verbs: ['led', 'lead', 'managed', 'owned', 'architected', 'designed', 'built', 'delivered', 'implemented', 'mentored', 'launched', 'improved', 'reduced', 'drove', 'created', 'automated'],
  keywords: {
    technical: ['software development', 'programming', 'full stack', 'full-stack', 'backend', 'frontend', 'javascript', 'typescript', 'java', 'react', 'node.js', 'sql'],
    communication: ['communication', 'presentation', 'presented', 'public speaking', 'documentation', 'technical writing'],
    leadership: ['leadership', 'team lead', 'led a team', 'led the team', 'managed a team', 'scrum master', 'head of'],
    problem_solving: ['problem solving', 'problem-solving', 'root cause', 'debugging', 'troubleshooting', 'algorithms'],
    teamwork: ['teamwork', 'collaboration', 'collaborated', 'cross-functional', 'team player'],
    system_design: ['system design', 'architecture', 'architected', 'microservices', 'distributed systems', 'scalability'],
    api_design: ['api design', 'rest api', 'restful', 'graphql', 'openapi', 'api'],
    python: ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy'],
    data_storytelling: ['data storytelling', 'data visualization', 'dashboards', 'dashboard', 'tableau', 'power bi', 'storytelling'],
    stakeholder: ['stakeholder', 'stakeholders', 'client communication', 'requirements gathering', 'business analysis'],
    accessibility: ['accessibility', 'wcag', 'a11y', 'screen reader', 'aria'],
    test_automation: ['test automation', 'automation testing', 'selenium', 'playwright', 'cypress', 'pytest', 'unit testing'],
    cloud_security: ['cloud security', 'application security', 'iam', 'owasp', 'threat model', 'threat modeling', 'devsecops', 'iso 27001', 'penetration testing'],
    mentoring: ['mentoring', 'mentored', 'mentor', 'coaching', 'onboarding'],
  },
}

export const RULES = {
  halfLifeDays: 45, // w_time = 0.5 ^ (age / halfLife)
  recentDays: 90, // window for source coverage, conflicts and "missing source"
  insufficientDays: 180, // no signal at all in this window → Insufficient
  minSignals: 3,
  minSources: 2,
  trendWindow: 3, // Theil–Sen over the last 3 cycles with evidence
  epsilon: 1.5, // points per cycle → Improving / Declining
  sourceEpsilon: 1.5,
  conflictSpread: 25, // 1.0 point on the 5-point scale between two sources' recent means
  conflictSpreadWithOpposingTrends: 15, // 0.6 point when the sources also trend in opposite directions
  volumeFull: 6, // signals in the last 180 days for full volume credit
  recencyFullDays: 14,
  recencyZeroDays: 120,
  weights: { volume: 0.3, diversity: 0.25, recency: 0.2, agreement: 0.15, stability: 0.1 },
  bands: { high: 0.75, medium: 0.5 },
  borderline: 0.05, // 0.45–0.55 is shown as LOW–MEDIUM
  conflictCap: 0.52, // conflicting sources cap confidence at the Low–Medium border
  missingSourceCap: 0.72, // a missing required source caps confidence below High
  insufficientCap: 0.35,
  verify: { minNewSignals: 2, minNewSources: 2, delta: 5 },
  pairing: { strong: 70, gap: 50 }, // 3.8 / 5 and 3.0 / 5
}

export const STATES = {
  improving: { label: 'Improving', symbol: '↑' },
  stagnating: { label: 'Stagnating', symbol: '→' },
  declining: { label: 'Declining', symbol: '↓' },
  insufficient: { label: 'Insufficient Evidence', symbol: '?' },
  conflicting: { label: 'Conflicting Evidence', symbol: '⚠' },
}
// Chart order validated for colour-vision separation, including the donut wrap-around.
export const STATE_ORDER = ['improving', 'stagnating', 'insufficient', 'declining', 'conflicting']

export const GAP_TYPES = {
  no_recent_evidence: { label: 'No recent evidence', action: 'Assign a small task and collect an evaluation' },
  missing_source: { label: 'Missing source', action: 'Create the missing source (small project, audit)' },
  conflicting_sources: { label: 'Conflicting sources', action: 'Second sample using a shared rubric' },
  low_volume: { label: 'Low volume', action: 'Add a short assessment' },
  declining_with_high_confidence: { label: 'Declining (high confidence)', action: 'Targeted skill recovery: clinic, mentoring or pairing' },
}

/** Plan state machine (spec §3.2). */
export const PLAN_STEPS = [
  'GAP_DETECTED',
  'ACTION_RECOMMENDED',
  'PLAN_ACCEPTED',
  'AWAITING_EVIDENCE',
  'EVIDENCE_RECEIVED',
  'REASSESSED',
  'VERDICT',
]
export const VERDICTS = { VERIFIED: 'Verified', NOT_VERIFIED: 'Not verified', INCONCLUSIVE: 'Inconclusive' }
