/**
 * UnnatiTrack skill-state engine — uncertainty-aware tracking per employee × competency.
 *
 *   score       recency- and source-weighted mean of normalised evidence (0–100)
 *   state       Theil–Sen slope of per-cycle scores (never an average across skills)
 *   confidence  0.30·volume + 0.25·diversity + 0.20·recency + 0.15·agreement + 0.10·stability
 *   hard rules  < 3 signals, < 2 sources or nothing in 180 days → Insufficient Evidence
 *   conflict    source spread > threshold, or opposing source trends → Conflicting Evidence
 *   gaps        no_recent_evidence · missing_source · conflicting_sources · low_volume ·
 *               declining_with_high_confidence
 *
 * Pure functions. Mirrored in backend/app/engine/analyze.py (parity-tested).
 */
import { AS_OF, CYCLES, SOURCES, SOURCE_ORDER, COMPETENCIES, RULES, STATES } from './constants.js'

const DAY = 86400000
export const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY)
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
export const r1 = (v) => Math.floor(v * 10 + 0.5) / 10
export const r2 = (v) => Math.floor(v * 100 + 0.5) / 100
export const roundHalfUp = (v) => Math.floor(v + 0.5)
const median = (a) => {
  const s = [...a].sort((x, y) => x - y)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length

/** Theil–Sen estimator: median of all pairwise slopes. Robust to one outlier cycle. */
export function theilSen(xs, ys) {
  const slopes = []
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) if (xs[j] !== xs[i]) slopes.push((ys[j] - ys[i]) / (xs[j] - xs[i]))
  return slopes.length ? median(slopes) : 0
}

export const relevance = (cid, src) => (COMPETENCIES[cid].required.includes(src) ? 1 : src === 'training' ? 0.4 : src === 'resume' ? 0.5 : 0.6)
/** reliability × relevance; either may be overridden per evidence item (entered by HR on the analysis form). */
export const sourceWeight = (e, cid) => (e.reliability ?? SOURCES[e.source].reliability) * (e.relevance ?? relevance(cid, e.source))
export const timeWeight = (e, asOf) => 0.5 ** (Math.max(0, days(e.date, asOf)) / RULES.halfLifeDays)
export const toFive = (v) => r1(1 + v / 25)
export const fromFive = (r) => (r - 1) * 25
const label = (s) => SOURCES[s].label.toLowerCase()
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const list = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`)

function weightedMean(items, cid, asOf, withTime = true) {
  let sw = 0
  let s = 0
  for (const e of items) {
    const w = sourceWeight(e, cid) * (withTime ? timeWeight(e, asOf) : 1)
    sw += w
    s += w * e.value
  }
  return sw ? s / sw : null
}

export function cycleOf(date) {
  const c = CYCLES.find((x) => date >= x.start && date <= x.end)
  return c ? c.id : CYCLES[CYCLES.length - 1].id
}

/**
 * @param {Array} items evidence for one employee × competency
 * @param {string} cid competency id
 * @param {string} asOf ISO date treated as today
 */
export function analyzeCompetency(items, cid, asOf = AS_OF, opts = {}) {
  const comp = COMPETENCIES[cid]
  const dated = items.filter((e) => e.date <= asOf).sort((a, b) => a.date.localeCompare(b.date))
  // Resume claims are kept apart: they only enter the current score (low weight), never state/confidence.
  const claims = dated.filter((e) => SOURCES[e.source].selfReported)
  const ev = dated.filter((e) => !SOURCES[e.source].selfReported)
  const recent = ev.filter((e) => days(e.date, asOf) <= RULES.recentDays)
  // Conflict resolution: once a development plan raised to settle a conflict has
  // collected calibrated evidence from ≥ 2 sources, the conflict check compares only
  // that re-sample (spec §3.3 "second sample using a shared rubric"). Older signals
  // still count in the score and trajectory — they are not deleted or hidden.
  const post = opts.resolveFromSeq != null ? recent.filter((e) => e.seq > opts.resolveFromSeq) : []
  const resolved = new Set(post.map((e) => e.source)).size >= 2
  const pool = resolved ? post : recent
  const window180 = ev.filter((e) => days(e.date, asOf) <= RULES.insufficientDays)

  // --- trajectory (per-cycle source-weighted mean) -------------------------------
  const lastCycle = Math.max(4, cycleOf(asOf))
  const trajectory = CYCLES.filter((c) => c.id <= lastCycle).map((c) => {
    const inC = ev.filter((e) => e.cycle === c.id)
    const bySource = {}
    for (const e of inC) (bySource[e.source] ||= []).push(e.value)
    const m = inC.length ? weightedMean(inC, cid, asOf, false) : null
    return { cycle: c.id, label: c.label, score: m === null ? null : r1(m), n: inC.length, sources: Object.fromEntries(Object.entries(bySource).map(([k, v]) => [k, r1(mean(v))])) }
  })
  const scored = trajectory.filter((t) => t.score !== null)
  const win = scored.slice(-RULES.trendWindow)
  const winCycles = new Set(win.map((t) => t.cycle))
  const slope = r2(theilSen(win.map((t) => t.cycle), win.map((t) => t.score)))

  // --- per-source view ---------------------------------------------------------------
  const sources = SOURCE_ORDER.map((src) => {
    const all = ev.filter((e) => e.source === src)
    const rec = recent.filter((e) => e.source === src)
    const recPool = pool.filter((e) => e.source === src)
    const perCycle = {}
    for (const e of all) if (winCycles.has(e.cycle)) (perCycle[e.cycle] ||= []).push(e.value)
    const cs = Object.keys(perCycle).map(Number).sort((a, b) => a - b)
    const sSlope = cs.length >= 2 ? theilSen(cs, cs.map((c) => mean(perCycle[c]))) : 0
    const recentMean = recPool.length ? weightedMean(recPool, cid, asOf) : null
    const latest = all[all.length - 1] || null
    return {
      source: src,
      label: SOURCES[src].label,
      required: comp.required.includes(src),
      count: all.length,
      recentCount: rec.length,
      recentMean: recentMean === null ? null : r1(recentMean),
      latest: latest ? { id: latest.id, value: latest.value, raw: latest.raw, scale: latest.scale, date: latest.date } : null,
      slope: r2(sSlope),
      direction: cs.length >= 2 ? (sSlope >= RULES.sourceEpsilon ? 'up' : sSlope <= -RULES.sourceEpsilon ? 'down' : 'flat') : 'none',
      relevance: relevance(cid, src),
      reliability: SOURCES[src].reliability,
    }
  })
  const missingRequired = comp.required.filter((s) => !sources.find((x) => x.source === s).recentCount)

  // --- conflict detection ------------------------------------------------------------
  const withRecent = sources.filter((s) => s.recentMean !== null)
  let conflict = null
  if (withRecent.length >= 2) {
    const hi = withRecent.reduce((a, b) => (b.recentMean > a.recentMean ? b : a))
    const lo = withRecent.reduce((a, b) => (b.recentMean < a.recentMean ? b : a))
    const spread = hi.recentMean - lo.recentMean
    const up = sources.filter((s) => s.direction === 'up').map((s) => s.source)
    const down = sources.filter((s) => s.direction === 'down').map((s) => s.source)
    const opposing = up.length > 0 && down.length > 0
    if (spread >= RULES.conflictSpread || (opposing && spread >= RULES.conflictSpreadWithOpposingTrends)) {
      conflict = { high: hi.source, low: lo.source, spread: r1(spread), spreadFive: r1(spread / 25), highMean: hi.recentMean, lowMean: lo.recentMean, up, down, opposing }
    }
  }

  // --- hard rules → insufficient -----------------------------------------------------
  const distinct180 = new Set(window180.map((e) => e.source)).size
  const insufficientReasons = []
  if (!window180.length) insufficientReasons.push(ev.length ? `No evidence in the last ${RULES.insufficientDays} days.` : claims.length ? 'Only a self-reported resume claim — no verified evidence yet.' : 'No evidence has been recorded yet.')
  else {
    if (window180.length < RULES.minSignals) insufficientReasons.push(`Only ${window180.length} signal${window180.length > 1 ? 's' : ''} in the last 6 months (minimum ${RULES.minSignals}).`)
    if (distinct180 < RULES.minSources) insufficientReasons.push(`Only one source (${label(window180[0].source)}) — at least ${RULES.minSources} are needed.`)
  }

  let state
  if (insufficientReasons.length) state = 'insufficient'
  else if (conflict) state = 'conflicting'
  else if (slope >= RULES.epsilon) state = 'improving'
  else if (slope <= -RULES.epsilon) state = 'declining'
  else state = 'stagnating'

  // --- confidence ------------------------------------------------------------------------
  const latestDate = ev.length ? ev[ev.length - 1].date : null
  const age = latestDate ? days(latestDate, asOf) : Infinity
  const factors = {
    volume: clamp(window180.length / RULES.volumeFull),
    diversity: comp.required.length ? (comp.required.length - missingRequired.length) / comp.required.length : 0,
    recency: latestDate ? clamp(1 - (age - RULES.recencyFullDays) / (RULES.recencyZeroDays - RULES.recencyFullDays)) : 0,
    agreement: withRecent.length >= 2 ? clamp(1 - (Math.max(...withRecent.map((s) => s.recentMean)) - Math.min(...withRecent.map((s) => s.recentMean))) / 40) * (conflict?.opposing ? 0.5 : 1) : 0.5,
    stability: (() => {
      const d = []
      for (let i = 1; i < scored.length; i++) d.push(scored[i].score - scored[i - 1].score)
      if (d.length < 2) return 0.5
      const m = mean(d)
      const sd = Math.sqrt(mean(d.map((x) => (x - m) ** 2)))
      return clamp(1 - sd / 8)
    })(),
  }
  const W = RULES.weights
  let value = W.volume * factors.volume + W.diversity * factors.diversity + W.recency * factors.recency + W.agreement * factors.agreement + W.stability * factors.stability
  const caps = []
  if (state === 'insufficient') {
    value = Math.min(value, RULES.insufficientCap)
    caps.push('Insufficient evidence always reads as Low confidence.')
  } else {
    if (conflict) { value = Math.min(value, RULES.conflictCap); caps.push('Sources disagree, so confidence is held at the Low–Medium border until they are reconciled.') }
    if (missingRequired.length) { value = Math.min(value, RULES.missingSourceCap); caps.push(`${cap(list(missingRequired.map(label)))} ${missingRequired.length > 1 ? 'are' : 'is'} required for ${comp.label.toLowerCase()} but missing in the last ${RULES.recentDays} days, so confidence can't be High.`) }
  }
  value = r2(value)
  const level = value >= RULES.bands.high ? 'high' : value >= RULES.bands.medium ? 'medium' : 'low'
  const borderline = Math.abs(value - RULES.bands.medium) < RULES.borderline && state !== 'insufficient'
  const confLabel = borderline ? 'LOW–MEDIUM' : level.toUpperCase()

  // --- score -----------------------------------------------------------------------------
  const current = window180.length ? weightedMean([...ev, ...claims], cid, asOf) : null
  const score = state === 'insufficient' || current === null ? null : roundHalfUp(current)
  const lastKnown = scored.length ? roundHalfUp(scored[scored.length - 1].score) : null

  // --- gaps ------------------------------------------------------------------------------
  const gaps = []
  if (!recent.length) gaps.push({ type: 'no_recent_evidence', priority: 'medium', detail: !ev.length && claims.length ? 'Only a resume claim — collect an assessment, feedback or project outcome.' : `No signals in the last ${RULES.recentDays} days.` })
  else if (window180.length < RULES.minSignals) gaps.push({ type: 'low_volume', priority: 'medium', detail: `Only ${window180.length} signal${window180.length > 1 ? 's' : ''} in 6 months.` })
  if (conflict) gaps.push({ type: 'conflicting_sources', priority: 'high', detail: `${cap(label(conflict.high))} and ${label(conflict.low)} disagree by ${conflict.spreadFive.toFixed(1)} points.` })
  if (state !== 'insufficient') for (const m of missingRequired) gaps.push({ type: 'missing_source', source: m, priority: state === 'declining' || conflict ? 'high' : 'medium', detail: `No ${label(m)} in the last ${RULES.recentDays} days.` })
  if (state === 'declining' && level === 'high') gaps.push({ type: 'declining_with_high_confidence', priority: 'high', detail: `Consistent decline of ${Math.abs(slope).toFixed(1)} points per cycle.` })
  const evidenceGap = gaps.some((g) => g.type !== 'declining_with_high_confidence')

  // --- explanation ------------------------------------------------------------------------
  const why = []
  if (state === 'insufficient') why.push(...insufficientReasons)
  else {
    const up = sources.filter((s) => s.direction === 'up').map((s) => label(s.source))
    const down = sources.filter((s) => s.direction === 'down').map((s) => label(s.source))
    if (conflict) why.push(`${cap(label(conflict.high))} and ${label(conflict.low)} signals disagree by ${conflict.spreadFive.toFixed(1)} points (${toFive(conflict.highMean)} vs ${toFive(conflict.lowMean)} on a 5-point scale).`)
    if (up.length && down.length) why.push(`${cap(list(up))} ${up.length > 1 ? 'are' : 'is'} rising while ${list(down)} ${down.length > 1 ? 'are' : 'is'} falling.`)
    else if (up.length) why.push(`${cap(list(up))} ${up.length > 1 ? 'are' : 'is'} rising across recent cycles.`)
    else if (down.length) why.push(`${cap(list(down))} ${down.length > 1 ? 'are' : 'is'} falling across recent cycles.`)
    else why.push('Recent sources are broadly flat across cycles.')
    for (const m of missingRequired) why.push(`No ${label(m)} evidence in the last ${RULES.recentDays} days.`)
    if (resolved) why.push(`Conflict check uses the calibrated re-sample collected under the development plan (${post.length} signals from ${new Set(post.map((e) => e.source)).size} sources).`)
  }
  const headline =
    state === 'insufficient'
      ? `Not enough recent evidence to assess ${comp.label.toLowerCase()} confidently.`
      : state === 'conflicting'
        ? `Conflicting evidence: ${label(conflict.high)} and ${label(conflict.low)} disagree by ${conflict.spreadFive.toFixed(1)} points${missingRequired.includes('project') ? '; no project-based evidence exists' : ''}.`
        : state === 'improving'
          ? `${comp.label} is improving by ${slope.toFixed(1)} points per cycle.`
          : state === 'declining'
            ? `${comp.label} is declining by ${Math.abs(slope).toFixed(1)} points per cycle.`
            : `${comp.label} has held steady across recent cycles.`

  return {
    competencyId: cid,
    label: comp.label,
    state,
    stateLabel: STATES[state].label,
    symbol: STATES[state].symbol,
    score,
    scoreFive: score === null ? null : toFive(score),
    lastKnown,
    slope,
    trajectory,
    sources,
    required: comp.required,
    missingRequired,
    conflict,
    resolution: resolved ? { fromSeq: opts.resolveFromSeq, signals: post.length, sources: SOURCE_ORDER.filter((s) => post.some((e) => e.source === s)) } : null,
    confidence: { value, level, label: confLabel, borderline, factors: Object.fromEntries(Object.entries(factors).map(([k, v]) => [k, r2(v)])), caps },
    gaps,
    evidenceGap,
    why,
    headline,
    evidenceCount: ev.length + claims.length,
    recentCount: recent.length,
    latestDate,
    evidenceIds: ev.slice(-8).map((e) => e.id),
    claim: claims.length ? { value: claims[claims.length - 1].value, date: claims[claims.length - 1].date, id: claims[claims.length - 1].id, note: claims[claims.length - 1].note || '' } : null,
  }
}

/** Plans raised to settle a conflict → { 'emp::cid': acceptedSeq } for analyzeCompetency's resolveFromSeq. */
export function resolveMapFromPlans(plans = []) {
  const m = {}
  for (const p of plans) {
    if (!(p.gapTypes || []).includes('conflicting_sources')) continue
    const k = `${p.employeeId}::${p.competencyId}`
    if (m[k] == null || p.acceptedSeq > m[k]) m[k] = p.acceptedSeq
  }
  return m
}

export function analyzeEmployee(employee, evidence, asOf = AS_OF, resolveMap = {}) {
  const mine = evidence.filter((e) => e.employeeId === employee.id)
  const competencies = employee.competencies.map((cid) => analyzeCompetency(mine.filter((e) => e.competencyId === cid), cid, asOf, { resolveFromSeq: resolveMap[`${employee.id}::${cid}`] }))
  const counts = { improving: 0, stagnating: 0, declining: 0, insufficient: 0, conflicting: 0 }
  for (const c of competencies) counts[c.state]++
  const conf = mean(competencies.map((c) => c.confidence.value))
  const priorityOf = (c) => (c.state === 'declining' && c.confidence.level === 'high' ? 0 : c.state === 'conflicting' ? 1 : c.state === 'declining' ? 2 : c.state === 'insufficient' ? 3 : c.evidenceGap ? 4 : c.state === 'stagnating' ? 5 : 6)
  const focus = [...competencies].sort((a, b) => priorityOf(a) - priorityOf(b))[0]
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
  return {
    employee,
    competencies,
    counts,
    gaps: competencies.filter((c) => c.evidenceGap).length,
    confidence: r2(conf),
    focus,
    dominant,
    lastAssessment: competencies.reduce((m, c) => (c.latestDate && c.latestDate > m ? c.latestDate : m), ''),
    evidenceCount: mine.filter((e) => e.date <= asOf).length,
  }
}

export function analyzeOrg(employees, evidence, asOf = AS_OF, resolveMap = {}) {
  const byEmployee = Object.fromEntries(employees.map((e) => [e.id, analyzeEmployee(e, evidence, asOf, resolveMap)]))
  const all = Object.values(byEmployee).flatMap((a) => a.competencies.map((c) => ({ ...c, employeeId: a.employee.id })))
  const counts = { improving: 0, stagnating: 0, declining: 0, insufficient: 0, conflicting: 0 }
  for (const c of all) counts[c.state]++
  return {
    byEmployee,
    all,
    counts,
    total: all.length,
    improvingPct: Math.round((counts.improving / all.length) * 100),
    evidenceGaps: all.filter((c) => c.evidenceGap).length,
    conflicts: all.filter((c) => c.conflict),
  }
}
