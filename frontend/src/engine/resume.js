/**
 * Resume → self-reported skill claims.
 *
 * Deterministic keyword matching (no AI): for each competency, count whole-word keyword
 * mentions and "applied" sentences (skill + action verb). The claim value is capped at 80,
 * so a resume can never outrank verified evidence. Claims enter the current score with a
 * low weight (source "resume", reliability 0.3) and never decide state or confidence.
 *
 * Pure function, mirrored in backend/app/engine/resume.py (parity-tested).
 */
import { RESUME, COMPETENCIES } from './constants.js'

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const alt = (words) => [...words].sort((a, b) => b.length - a.length || (a < b ? -1 : 1)).map(esc).join('|')
const wordRe = (words) => new RegExp(`(?<![a-z0-9])(?:${alt(words)})(?![a-z0-9])`, 'g')
const SPLIT = /(?:\.\s+|[\n\r;•|])+/
const BULLET = /^[-*·–—]+\s*/
const VERBS = wordRe(RESUME.verbs)
const count = (re, s) => (s.match(re) || []).length

export function parseResume(text, tracked = []) {
  const sentences = String(text || '').split(SPLIT).map((x) => x.trim().replace(BULLET, '').trim()).filter(Boolean)
  const lower = sentences.map((x) => x.toLowerCase())
  const matches = []
  for (const [cid, words] of Object.entries(RESUME.keywords)) {
    const re = wordRe(words)
    let mentions = 0
    let applied = 0
    let snippet = null
    lower.forEach((s, i) => {
      const n = count(re, s)
      if (!n) return
      mentions += n
      if (count(VERBS, s)) applied++
      if (snippet === null) snippet = sentences[i].length > 140 ? `${sentences[i].slice(0, 137)}...` : sentences[i]
    })
    if (!mentions) continue
    const value = Math.min(RESUME.cap, RESUME.base + RESUME.perMention * Math.min(mentions, RESUME.maxMentions) + RESUME.perApplied * Math.min(applied, RESUME.maxApplied))
    matches.push({ competencyId: cid, label: COMPETENCIES[cid].label, mentions, applied, value, snippet, tracked: tracked.includes(cid) })
  }
  matches.sort((a, b) => b.value - a.value || b.mentions - a.mentions || (a.competencyId < b.competencyId ? -1 : 1))
  const all = String(text || '')
  const years = [...all.toLowerCase().matchAll(/([0-9]{1,2})\s*\+?\s*(?:years|yrs)/g)].map((m) => Number(m[1])).filter((n) => n <= 50)
  const email = (all.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/) || [null])[0]
  const first = all.split(/[\n\r]+/).map((x) => x.trim()).find(Boolean) || ''
  const name = /^[A-Za-z][A-Za-z.'-]*(?: [A-Za-z][A-Za-z.'-]*){1,3}$/.test(first) ? first : null
  return { matches, years: years.length ? Math.max(...years) : null, email: email ? email.toLowerCase() : null, name, chars: all.length }
}

/** Evidence items for the tracked competencies a resume mentions (one claim per competency). */
export function resumeEvidence(parsed, { employeeId, date, filename }) {
  return parsed.matches.filter((m) => m.tracked).map((m) => ({
    employeeId,
    competencyId: m.competencyId,
    source: 'resume',
    raw: m.value,
    scale: 100,
    date,
    title: `Resume claim · ${filename}`,
    note: `Mentioned ${m.mentions}×${m.applied ? `, applied in ${m.applied} statement${m.applied > 1 ? 's' : ''}` : ''} — “${m.snippet}”`,
    author: 'Resume parser (self-reported)',
  }))
}
