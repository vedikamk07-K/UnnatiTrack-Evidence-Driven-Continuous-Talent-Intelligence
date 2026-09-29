import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { LayoutDashboard, Users, Network, FileStack, Settings, Search, Bell, CircleHelp, Menu, X, TrendingUp, Target, MessagesSquare, ChevronsUpDown, LogOut, Clock } from 'lucide-react'
import { Wordmark } from './Brand.jsx'
import { Avatar, StateBadge, Modal } from './ui.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { useData } from '../state/DataContext.jsx'
import { AS_OF, ORG, COMPETENCIES, RULES } from '../engine/constants.js'
import { fmtDate } from '../lib/format.js'

const HR_NAV = [
  { to: '/hr/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/hr/employees', label: 'Employees', icon: Users },
  { to: '/hr/competencies', label: 'Competencies', icon: Network },
  { to: '/hr/evidence', label: 'Evidence', icon: FileStack },
]
const EMP_NAV = [
  { to: '/me/growth', label: 'My Growth', icon: TrendingUp },
  { to: '/me/competencies', label: 'My Competencies', icon: Target },
  { to: '/me/evidence', label: 'My Evidence', icon: FileStack },
  { to: '/me/feedback', label: 'HR Feedback', icon: MessagesSquare, badge: true },
]

function NavItem({ item, onClick, badge }) {
  const Icon = item.icon
  return (
    <NavLink to={item.to} onClick={onClick} className={({ isActive }) => clsx('relative flex h-11 items-center gap-3 border-2 border-ink px-3 text-[14px] font-semibold transition-colors', isActive ? 'bg-rust text-panel shadow-hard-sm' : 'bg-panel text-ink hover:bg-cream')}>
      {({ isActive }) => (
        <>
          <Icon size={18} strokeWidth={2} />
          <span className="flex-1">{item.label}</span>
          {badge && <span className="border border-ink bg-rust px-1 font-mono text-[9px] font-bold text-panel">NEW</span>}
          {isActive && <span className="h-5 w-[3px] bg-panel" />}
        </>
      )}
    </NavLink>
  )
}

function Sidebar({ open, onClose }) {
  const { session, logout } = useAuth()
  const { comments } = useData()
  const nav = useNavigate()
  const hr = session.role === 'hr'
  const items = hr ? HR_NAV : EMP_NAV
  const [menu, setMenu] = useState(false)
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={onClose} />}
      <aside className={clsx('fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r-2 border-ink bg-sand px-4 pb-4 pt-5 transition-transform lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-start justify-between">
          <Wordmark />
          <button className="border-2 border-ink bg-panel p-1 lg:hidden" onClick={onClose} aria-label="Close menu"><X size={16} /></button>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <span className="label">{hr ? 'Workspace' : 'My workspace'}</span>
          <span className={clsx('border px-1 font-mono text-[9px] font-bold uppercase', hr ? 'border-ink bg-panel' : 'border-ink bg-mint')}>{hr ? 'HR portal' : 'Private'}</span>
        </div>
        <nav className="mt-2 space-y-2.5" aria-label="Main">
          {items.map((n) => <NavItem key={n.to} item={n} onClick={onClose} badge={n.badge && comments.length > 0} />)}
        </nav>
        <div className="flex-1" />
        <NavItem item={{ to: hr ? '/hr/settings' : '/me/settings', label: 'Settings & Profile', icon: Settings }} onClick={onClose} />
        <div className="relative mt-3 border-t-2 border-ink pt-3">
          <button onClick={() => setMenu((m) => !m)} className="flex w-full items-center gap-2.5 text-left">
            <Avatar name={session.name} size={36} />
            <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold">{session.name}</span><span className="block truncate text-[11px] text-olive">{session.title}</span></span>
            <ChevronsUpDown size={16} />
          </button>
          {menu && (
            <div className="panel absolute bottom-14 left-0 right-0 z-50 p-1.5">
              <button onClick={() => { logout(); nav('/') }} className="flex w-full items-center gap-2 px-2 py-2 text-[13px] font-semibold hover:bg-cream"><LogOut size={15} />Sign out · switch role</button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

function SearchBox() {
  const { session } = useAuth()
  const { employees, org, me } = useData()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const nav = useNavigate()
  const hr = session.role === 'hr'
  useEffect(() => {
    const k = (e) => { if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { e.preventDefault(); ref.current?.focus() } }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [])
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s || !org) return []
    if (!hr) return me.competencies.filter((c) => c.label.toLowerCase().includes(s)).map((c) => ({ key: c.competencyId, title: c.label, sub: 'My competency', state: c.state, to: `/me/competencies/${c.competencyId}` }))
    const people = employees.filter((e) => `${e.name} ${e.role} ${e.team}`.toLowerCase().includes(s)).slice(0, 5).map((e) => ({ key: e.id, title: e.name, sub: `${e.role} · ${e.team}`, to: `/hr/employees/${e.id}`, person: true }))
    const skills = Object.entries(COMPETENCIES).filter(([, c]) => c.label.toLowerCase().includes(s)).slice(0, 4).map(([id, c]) => ({ key: id, title: c.label, sub: 'Competency', to: `/hr/competencies?c=${id}` }))
    return [...people, ...skills]
  }, [q, org, employees, me, hr])
  return (
    <div className="relative w-full max-w-[340px]">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
      <input ref={ref} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) { nav(results[0].to); setQ(''); ref.current.blur() } }}
        placeholder={hr ? 'Search employees, skills or evidence' : 'Search my competencies'} className="h-10 w-full border-2 border-ink bg-panel pl-9 pr-3 text-[14px] outline-none placeholder:text-ink-50 focus:shadow-hard-sm" aria-label="Search" />
      {open && q && (
        <div className="panel absolute left-0 right-0 top-12 z-50 max-h-80 overflow-y-auto p-1">
          {results.length ? results.map((r) => (
            <button key={r.key} onMouseDown={() => { nav(r.to); setQ('') }} className="flex w-full items-center gap-2.5 px-2 py-2 text-left hover:bg-cream">
              {r.person && <Avatar name={r.title} size={28} />}
              <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{r.title}</span><span className="block truncate text-[11px] text-olive">{r.sub}</span></span>
              {r.state && <StateBadge state={r.state} size="sm" />}
            </button>
          )) : <div className="px-3 py-4 text-center text-[13px] text-olive">{hr ? `No match for “${q}”` : 'Only your own competencies are searchable.'}</div>}
        </div>
      )}
    </div>
  )
}

function Notifications() {
  const [open, setOpen] = useState(false)
  const { activity, org, session } = { ...useData(), ...useAuth() }
  const nav = useNavigate()
  const hr = session.role === 'hr'
  const base = hr
    ? [{ text: 'Sneha Deshmukh · Leadership: conflicting evidence detected', to: '/hr/employees/sneha-deshmukh/leadership' }, { text: `${org?.evidenceGaps ?? 0} evidence gaps need action`, to: '/hr/evidence?tab=gaps' }]
    : [{ text: 'New HR comment on your growth', to: '/me/feedback' }]
  const items = [...activity.slice(0, 5).map((a) => ({ text: a.text, at: a.at })), ...base]
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative flex h-10 w-10 items-center justify-center border-2 border-ink bg-panel hover:bg-cream" aria-label="Notifications">
        <Bell size={17} /><span className="absolute right-1.5 top-1.5 h-2 w-2 bg-rust" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="panel absolute right-0 top-12 z-50 w-[330px]">
            <div className="border-b-2 border-ink bg-sand px-3 py-2 font-mono text-[11px] font-bold uppercase">Notifications</div>
            {items.map((n, i) => (
              <button key={i} onClick={() => { if (n.to) nav(n.to); setOpen(false) }} className="block w-full border-b border-ink/15 px-3 py-2.5 text-left text-[13px] last:border-0 hover:bg-cream">
                {n.text}{n.at && <span className="ml-1 font-mono text-[10px] text-olive">{fmtDate(n.at)}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function RulesModal({ open, onClose }) {
  const W = RULES.weights
  return (
    <Modal open={open} onClose={onClose} title="How UnnatiTrack decides" width="max-w-2xl">
      <dl className="space-y-3 text-[13px] leading-relaxed">
        {[
          ['Score', `Recency- and source-weighted mean of normalised evidence. Time weight halves every ${RULES.halfLifeDays} days. Ratings on 1–5 map to 0–100 as (rating − 1) × 25.`],
          ['State', `Theil–Sen slope of the last ${RULES.trendWindow} cycle scores. ≥ +${RULES.epsilon} points/cycle = Improving, ≤ −${RULES.epsilon} = Declining, otherwise Stagnating. Always per competency — never an overall employee score.`],
          ['Confidence', `${W.volume} × volume + ${W.diversity} × source diversity + ${W.recency} × recency + ${W.agreement} × agreement + ${W.stability} × trend stability. High ≥ 75%, Medium ≥ 50%, Low below.`],
          ['Insufficient', `Fewer than ${RULES.minSignals} signals, fewer than ${RULES.minSources} sources, or nothing in ${RULES.insufficientDays} days → Insufficient Evidence. Never guessed.`],
          ['Conflict', `Two sources’ recent means differ by ≥ 1.0 point on the 5-point scale, or by ≥ 0.6 while trending in opposite directions → Conflicting Evidence; confidence is held at the Low–Medium border.`],
        ].map(([k, v]) => (
          <div key={k} className="grid gap-1 border-b border-ink/15 pb-3 sm:grid-cols-[120px_1fr]"><dt className="label pt-0.5 text-ink">{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </Modal>
  )
}

export default function Shell() {
  const { session } = useAuth()
  const { ready, asOf, error } = useData()
  const [open, setOpen] = useState(false)
  const [rules, setRules] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  const hr = session.role === 'hr'
  const moved = asOf && asOf !== AS_OF
  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[70px] items-center gap-3 border-b-2 border-ink bg-panel px-4 sm:px-6">
          <button className="border-2 border-ink bg-panel p-1.5 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          <div className="hidden min-w-0 items-center gap-2 text-[14px] md:flex">
            <span className="font-semibold">{ORG.name}</span><span className="text-olive">/</span><span className="text-ink-70">{hr ? ORG.cycle : 'My Growth Cycle'}</span>
          </div>
          {moved && <span className="hidden items-center gap-1.5 border-2 border-ink bg-mint px-2 py-1 font-mono text-[10px] font-bold uppercase xl:inline-flex"><Clock size={12} />Demo clock: {fmtDate(asOf)} (simulated check-in)</span>}
          <div className="ml-auto flex items-center gap-2">
            <SearchBox />
            <Notifications />
            <button onClick={() => setRules(true)} className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-panel hover:bg-cream" aria-label="How decisions are made"><CircleHelp size={17} /></button>
          </div>
        </header>
        <main className="mx-auto max-w-[1320px] px-4 pb-24 pt-7 sm:px-6 lg:px-7">
          {error ? <div className="panel p-6 text-declining">{error}</div> : ready ? <Outlet /> : <div className="py-20 text-center font-mono text-[12px] uppercase">Loading evidence…</div>}
        </main>
      </div>
      <RulesModal open={rules} onClose={() => setRules(false)} />
    </div>
  )
}
