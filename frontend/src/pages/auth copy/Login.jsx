import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowRight, Lock, Mail, Eye, EyeOff, Building2, UserRound, ShieldCheck } from 'lucide-react'
import { Wordmark } from '../../components/Brand.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { server } from '../../api/mockServer.js'

/** First screen: two clearly separate entry points. */
export function RoleSelect() {
  return (
    <div className="min-h-screen bg-parchment">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 sm:px-8">
        <Wordmark />
        <div className="flex flex-1 flex-col justify-center py-10">
          <span className="w-fit border-2 border-ink bg-panel px-2 py-1 font-mono text-[11px] font-bold uppercase">● Evidence-driven talent intelligence</span>
          <h1 className="mt-5 max-w-3xl font-head text-[46px] font-bold uppercase leading-[1.02] sm:text-[58px]">See how skills grow — not just where they stand.</h1>
          <p className="mt-4 max-w-2xl text-[16px] text-ink-70">Continuous competency tracking from assessments, manager and peer feedback, project outcomes, training results and KPIs — with confidence, conflict detection and verified growth.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <RoleCard to="/login/hr" icon={Building2} tag="HR portal · authorized access" title="HR Login" line="Organization-wide Talent Intelligence" points={['All employees, evidence and skill trajectories', 'Conflict and evidence-gap detection', 'Confidence and evidence trail for every conclusion']} />
            <RoleCard to="/login/employee" icon={UserRound} tag="Employee · private growth" title="Employee Login" line="Personal Growth & Development" points={['Only your own competencies and evidence', 'Your confidence and evidence gaps', 'HR comments addressed to you']} mint />
          </div>
        </div>
        <p className="font-mono text-[11px] uppercase text-olive">HackMatrix 5.0 · PCCOE Pune · Synthetic demo data</p>
      </div>
    </div>
  )
}

function RoleCard({ to, icon: Icon, tag, title, line, points, mint }) {
  return (
    <Link to={to} className="panel group block p-6 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <span className={clsx('flex h-12 w-12 items-center justify-center border-2 border-ink', mint ? 'bg-mint' : 'bg-rust text-panel')}><Icon size={22} /></span>
        <span className="border-2 border-ink bg-cream px-2 py-0.5 font-mono text-[10px] font-bold uppercase">{tag}</span>
      </div>
      <h2 className="mt-5 font-head text-[34px] font-bold uppercase leading-none">{title}</h2>
      <p className="mt-2 font-mono text-[13px] uppercase text-rust">“{line}”</p>
      <ul className="mt-4 space-y-1.5 text-[14px] text-ink-70">{points.map((p) => <li key={p} className="flex gap-2"><span className="text-rust">■</span>{p}</li>)}</ul>
      <span className="mt-6 inline-flex items-center gap-2 font-head text-[16px] font-bold uppercase text-rust group-hover:gap-3">Continue <ArrowRight size={18} /></span>
    </Link>
  )
}

export function Login() {
  const { role } = useParams()
  const hr = role === 'hr'
  const { login } = useAuth()
  const nav = useNavigate()
  const accounts = server.demoAccounts[hr ? 'hr' : 'employee']
  const [email, setEmail] = useState(accounts[0].email)
  const [password, setPassword] = useState('demo')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e?.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const s = await login(hr ? 'hr' : 'employee', email, password)
      nav(s.role === 'hr' ? '/hr/dashboard' : '/me/growth')
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="flex flex-col justify-between border-b-2 border-ink bg-panel p-8 lg:border-b-0 lg:border-r-2 lg:p-12">
        <Link to="/"><Wordmark /></Link>
        <div className="my-10">
          <span className="border-2 border-ink bg-cream px-2 py-1 font-mono text-[11px] font-bold uppercase">● {hr ? 'HR portal / authorized access' : 'Employee portal / personal space'}</span>
          <h1 className="mt-5 font-head text-[44px] font-bold uppercase leading-[1.02]">{hr ? <>Understand your people.<br />Support their growth.</> : <>Understand your growth.<br />Track your trajectory.</>}</h1>
          <p className="mt-3 max-w-lg text-[15px] text-ink-70">{hr ? 'Organization-wide competency insights, evidence, growth trends and development needs across all departments.' : 'Your competencies, the evidence behind them and what to do next. Nobody else’s data — and nobody sees yours except HR.'}</p>
          <div className="panel mt-8 max-w-lg p-5">
            <div className="flex items-center justify-between"><h2 className="h-panel text-[17px]">{hr ? 'Organization-wide skill health' : 'Your growth pipeline'}</h2><span className="border-2 border-ink px-1.5 font-mono text-[10px] font-bold uppercase">{hr ? 'Live feed' : 'Private'}</span></div>
            {hr ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[['68%', 'Skills improving', 'text-improving'], ['17', 'Evidence gaps', 'text-rust'], ['156', 'Competencies', 'text-insufficient']].map(([v, l, c]) => <div key={l} className="border-2 border-ink bg-cream p-2.5"><div className={clsx('font-head text-[26px] font-bold', c)}>{v}</div><div className="font-mono text-[9px] font-bold uppercase">{l}</div></div>)}
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-1.5 font-mono text-[10px] font-bold uppercase">
                {['Evidence', 'Assess', 'Gap', 'Action', 'Verify'].map((s, i) => <span key={s} className={clsx('border-2 border-ink px-2 py-1', i === 4 ? 'bg-rust text-panel' : 'bg-cream')}>{s}</span>)}
              </div>
            )}
          </div>
        </div>
        <p className="font-mono text-[11px] uppercase text-olive">Built by student engineers in Pune</p>
      </aside>
      <main className="flex items-center justify-center bg-parchment p-6">
        <form onSubmit={submit} className="panel w-full max-w-[420px] p-7">
          <span className="border-2 border-ink bg-rust px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-panel">{hr ? 'HR portal' : 'Employee portal'}</span>
          <h2 className="mt-4 font-head text-[32px] font-bold uppercase leading-none">Welcome back</h2>
          <p className="mt-2 text-[14px] text-ink-70">{hr ? 'Sign in to manage and review organization competency models.' : 'Sign in to view your private growth data.'}</p>
          <label className="mt-6 block"><span className="label mb-1.5 block text-ink">Work email</span>
            <span className="relative block"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-olive" /><input id="login-email" className="input pl-9" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></span>
          </label>
          <label className="mt-4 block"><span className="label mb-1.5 block text-ink">Password</span>
            <span className="relative block"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-olive" /><input id="login-password" className="input pl-9 pr-10" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></span>
          </label>
          {err && <p className="mt-3 border-2 border-declining bg-declining-soft px-3 py-2 text-[13px] font-semibold text-declining">{err}</p>}
          <button className="btn-primary mt-5 h-12 w-full font-head text-[17px] uppercase" disabled={busy}>{hr ? 'Login as HR' : 'Login as employee'}</button>
          <div className="mt-3 flex items-center gap-2 border-2 border-ink bg-cream px-3 py-2 font-mono text-[10px] font-bold uppercase"><ShieldCheck size={14} className="text-rust" />{hr ? 'Secure area · authorized HR access only' : 'Private · you only see your own growth data'}</div>
          <div className="mt-5 border-t-2 border-ink pt-4">
            <div className="label mb-2">Demo accounts · password “demo”</div>
            <div className="space-y-1.5">
              {accounts.map((a) => (
                <button type="button" key={a.email} onClick={() => setEmail(a.email)} className={clsx('flex w-full items-center justify-between border-2 px-3 py-1.5 text-left text-[13px]', email === a.email ? 'border-ink bg-sand' : 'border-ink/30 hover:border-ink')}>
                  <span><b>{a.name}</b> <span className="text-olive">· {a.title}</span></span><span className="font-mono text-[10px] text-olive">{a.email}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-5 text-center text-[13px] text-ink-70">{hr ? 'Not an HR account?' : 'HR team member?'} <Link to={hr ? '/login/employee' : '/login/hr'} className="font-semibold text-rust underline underline-offset-4">{hr ? 'Employee login →' : 'HR login →'}</Link></p>
        </form>
      </main>
    </div>
  )
}
