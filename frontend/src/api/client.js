/**
 * API client. Mock mode (default) runs the in-browser mock server with the same
 * role-scoped contract as the FastAPI backend. Set VITE_API_URL to use the backend.
 */
import { server } from './mockServer.js'
import { extractResumeText, checkResumeFile, readAsDataUrl } from '../lib/resumeText.js'

export const API_URL = import.meta.env.VITE_API_URL || ''
export const USE_MOCK = !API_URL

async function http(path, { method = 'GET', body, token, form, raw } = {}) {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method,
    headers: { ...(form ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form || (body ? JSON.stringify(body) : undefined),
  })
  if (raw && res.ok) return res
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(Array.isArray(data.detail) ? data.detail.map((d) => d.msg).join('; ') : data.detail || `Request failed (${res.status})`)
  return data
}

export const api = {
  async login(role, email, password) {
    if (USE_MOCK) return { session: server.login(role, email, password), token: null }
    const r = await http('/auth/login', { method: 'POST', body: { role, email, password } })
    return { session: r.user, token: r.access_token }
  },
  async dataset(s) { return USE_MOCK ? server.dataset(s) : http('/dataset', { token: s.token }) },
  async addEvidence(s, item) { return USE_MOCK ? server.addEvidence(s, item) : http('/evidence', { method: 'POST', body: item, token: s.token }) },
  async comment(s, employeeId, text, visibility) { return USE_MOCK ? server.addComment(s, employeeId, text, visibility) : http(`/employees/${employeeId}/comments`, { method: 'POST', body: { text, visibility }, token: s.token }) },
  // Employees & resumes
  async createEmployee(s, body) { return USE_MOCK ? server.createEmployee(s, body) : http('/employees', { method: 'POST', body, token: s.token }) },
  async parseResume(s, file) {
    checkResumeFile(file)
    if (USE_MOCK) return { filename: file.name, ...server.parseResume(s, await extractResumeText(file)) }
    const form = new FormData()
    form.append('file', file)
    return http('/resumes/parse', { method: 'POST', form, token: s.token })
  },
  async uploadResume(s, employeeId, file) {
    checkResumeFile(file)
    if (USE_MOCK) return server.uploadResume(s, employeeId, { filename: file.name, contentType: file.type, size: file.size, text: await extractResumeText(file), dataUrl: await readAsDataUrl(file) })
    const form = new FormData()
    form.append('file', file)
    return http(`/employees/${employeeId}/resume`, { method: 'POST', form, token: s.token })
  },
  async deleteResume(s, employeeId) { return USE_MOCK ? server.deleteResume(s, employeeId) : http(`/employees/${employeeId}/resume`, { method: 'DELETE', token: s.token }) },
  /** Returns { filename, url } — url is a data: URL (offline) or an object URL (API). */
  async resumeFile(s, employeeId, filename) {
    if (USE_MOCK) return server.resumeFile(s, employeeId)
    const res = await http(`/employees/${employeeId}/resume/file`, { token: s.token, raw: true })
    return { filename, url: URL.createObjectURL(await res.blob()) }
  },
  async reset(s) { return USE_MOCK ? server.reset() : http('/admin/seed', { method: 'POST', token: s.token }) },
}
