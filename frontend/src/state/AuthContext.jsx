import { createContext, useContext, useState } from 'react'
import { api } from '../api/client.js'

const Ctx = createContext(null)
const KEY = 'unnatitrack.session'
const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) } catch { return null } }
const write = (v) => { try { if (v) sessionStorage.setItem(KEY, JSON.stringify(v)); else sessionStorage.removeItem(KEY) } catch { /* storage unavailable */ } }

export function AuthProvider({ children }) {
  const [session, setSession] = useState(read)
  const login = async (role, email, password) => {
    const { session: s, token } = await api.login(role, email, password)
    const full = { ...s, token }
    write(full)
    setSession(full)
    return full
  }
  const logout = () => { write(null); setSession(null) }
  return <Ctx.Provider value={{ session, role: session?.role, login, logout }}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)
