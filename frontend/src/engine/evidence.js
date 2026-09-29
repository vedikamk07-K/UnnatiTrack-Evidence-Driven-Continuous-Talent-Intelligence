/**
 * Validate + normalise one evidence input from HR (Add-evidence modal).
 * `scale` may be 5 (rating) or 100 (score); defaults to the source's native scale.
 * Reliability / relevance are optional 0–1 overrides. Mirrored in backend/app/engine/evidence.py.
 */
import { SOURCES } from './constants.js'

export function normaliseEvidence(input) {
  if (!SOURCES[input.source]) throw new Error('Choose a valid source.')
  const scale = Number(input.scale || SOURCES[input.source].scale)
  if (scale !== 5 && scale !== 100) throw new Error('Scale must be 5 or 100.')
  const raw = Number(input.raw)
  if (input.raw === '' || input.raw == null || Number.isNaN(raw) || (scale === 5 ? raw < 1 || raw > 5 : raw < 0 || raw > 100)) throw new Error(`${SOURCES[input.source].label}: ${scale === 5 ? 'rating must be between 1 and 5' : 'score must be between 0 and 100'}.`)
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Each evidence item needs a date.')
  const pct = (v, name) => {
    if (v === undefined || v === null || v === '') return undefined
    const n = Number(v)
    if (Number.isNaN(n) || n < 0 || n > 1) throw new Error(`${name} must be between 0% and 100%.`)
    return n
  }
  const value = scale === 5 ? Math.floor((raw - 1) * 25 * 10 + 0.5) / 10 : raw
  const out = { source: input.source, date: input.date, raw, scale, value }
  const rel = pct(input.reliability, 'Reliability')
  const rev = pct(input.relevance, 'Relevance')
  if (rel !== undefined) out.reliability = rel
  if (rev !== undefined) out.relevance = rev
  return out
}
