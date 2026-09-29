import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, USE_MOCK } from '../api/client.js'
import { subscribe } from '../api/mockServer.js'
import { analyzeOrg } from '../engine/analyze.js'
import { useAuth } from './AuthContext.jsx'

const Ctx = createContext(null)

export function DataProvider({ children }) {
  const { session } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => (USE_MOCK ? subscribe(() => setTick((t) => t + 1)) : undefined), [])
  useEffect(() => {
    if (!session) { setData(null); return }
    let live = true
    api.dataset(session).then((d) => live && setData(d)).catch((e) => live && setError(e.message))
    return () => { live = false }
  }, [session, tick])

  const derived = useMemo(() => {
    if (!data) return null
    return { org: analyzeOrg(data.employees, data.evidence, data.asOf) }
  }, [data])

  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const act = useCallback(async (fn) => { const r = await fn(session); if (!USE_MOCK) refresh(); return r }, [session, refresh])

  const value = {
    ready: !!derived,
    error,
    scope: data?.scope,
    asOf: data?.asOf,
    employees: data?.employees || [],
    evidence: data?.evidence || [],
    comments: data?.comments || [],
    activity: data?.activity || [],
    resumes: data?.resumes || [],
    org: derived?.org,
    me: data?.scope === 'self' ? derived?.org.byEmployee[data.employees[0].id] : null,
    addEvidence: (item) => act((s) => api.addEvidence(s, item)),
    comment: (id, text, vis) => act((s) => api.comment(s, id, text, vis)),
    createEmployee: (body) => act((s) => api.createEmployee(s, body)),
    parseResume: (file) => api.parseResume(session, file),
    uploadResume: (id, file) => act((s) => api.uploadResume(s, id, file)),
    deleteResume: (id) => act((s) => api.deleteResume(s, id)),
    resumeFile: (id, filename) => api.resumeFile(session, id, filename),
    reset: () => act((s) => api.reset(s)),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useData = () => useContext(Ctx)
