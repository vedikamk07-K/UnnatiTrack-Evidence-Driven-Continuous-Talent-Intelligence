import { useState } from 'react'
import { RotateCcw, Lock, ShieldCheck } from 'lucide-react'
import { PageHeader, Panel, Avatar, PrivacyBanner, useToast } from '../components/ui.jsx'
import { RulesModal } from '../components/Shell.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { useData } from '../state/DataContext.jsx'
import { USE_MOCK } from '../api/client.js'

export default function Settings() {
  const { session } = useAuth()
  const { reset } = useData()
  const toast = useToast()
  const [rules, setRules] = useState(false)
  const hr = session.role === 'hr'
  return (
    <div>
      <PageHeader title="Settings & Profile" sub={hr ? 'Your profile, workspace rules and demo controls.' : 'Your profile and how your data is protected.'} />
      {!hr && <PrivacyBanner className="mb-5" />}
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="My profile">
          <div className="flex items-center gap-4"><Avatar name={session.name} size={60} /><div><div className="font-head text-[22px] font-bold uppercase">{session.name}</div><div className="text-[13px] text-olive">{session.title}</div></div></div>
          <p className="mt-4 text-[13px] text-olive">Profile details are managed by the HRIS in production; this prototype uses seeded accounts.</p>
        </Panel>
        <Panel title={hr ? 'Access & privacy' : 'Who can see my data'}>
          <ul className="space-y-2 text-[13px]">
            {(hr
              ? ['HR sees organization-wide competencies, evidence and confidence.', 'Private HR notes are never included in any employee payload.', 'Employee sessions receive only their own records — enforced by the API from JWT role claims, not by hiding UI.']
              : ['You see only your own competencies, evidence and HR comments addressed to you.', 'You never see other employees, their scores or any ranking.', 'HR can see your data to support your development; private HR notes are not shown to you.']
            ).map((t) => <li key={t} className="flex gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-improving" />{t}</li>)}
          </ul>
        </Panel>
        <Panel title="Scoring rules" sub="Weights and thresholds are tunable assumptions, documented in the app">
          <button className="btn-secondary" onClick={() => setRules(true)}><Lock size={15} />View source rules</button>
        </Panel>
        {hr && (
          <Panel title="Demo controls" sub={USE_MOCK ? 'Running on the in-browser demo server' : 'Connected to the FastAPI backend'}>
            <p className="mb-3 text-[13px]">Resets evidence, comments and the demo clock to the seeded state — use before each presentation.</p>
            <button className="btn-primary" onClick={async () => { await reset(); toast('Demo data reset to the seeded state.') }}><RotateCcw size={15} />Reset demo data</button>
          </Panel>
        )}
      </div>
      <RulesModal open={rules} onClose={() => setRules(false)} />
    </div>
  )
}
