import { SOURCES } from '../engine/constants.js'
const d = (s) => new Date(`${s}T00:00:00`)
export const fmtDate = (s) => (s ? d(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
export const fmtShort = (s) => (s ? d(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—')
export const dayNum = (s) => String(d(s).getDate()).padStart(2, '0')
export const monShort = (s) => d(s).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()
export const daysBetween = (a, b) => Math.round((d(b) - d(a)) / 86400000)
export function ago(s, asOf) {
  const n = daysBetween(s, asOf)
  if (n <= 0) return 'today'
  if (n === 1) return 'yesterday'
  if (n < 30) return `${n} days ago`
  const m = Math.round(n / 30)
  return `${m} month${m > 1 ? 's' : ''} ago`
}
/** Evidence result on its native scale: "4.4 / 5" or "91 / 100". */
export const rawText = (e) => ((e.scale ?? SOURCES[e.source].scale) === 5 ? `${Number(e.raw).toFixed(1)} / 5` : `${Math.round(Number(e.raw))} / 100`)
export const five = (v) => (v == null ? '—' : (1 + v / 25).toFixed(1))
