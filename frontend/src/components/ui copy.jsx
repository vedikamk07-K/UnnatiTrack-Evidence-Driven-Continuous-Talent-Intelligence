import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import clsx from 'clsx'
import { TrendingUp, TrendingDown, MoveRight, CircleHelp, TriangleAlert, X, Lock, CheckCircle2 } from 'lucide-react'
import { STATES } from '../engine/constants.js'
import { initials } from '../data/people.js'

export const STATE_ICON = { improving: TrendingUp, stagnating: MoveRight, declining: TrendingDown, insufficient: CircleHelp, conflicting: TriangleAlert }
export const STATE_HEX = { improving: '#1F6B3A', stagnating: '#B07A0E', insufficient: '#3452D8', declining: '#C0392B', conflicting: '#7B4FD6' }

export function StateBadge({ state, size = 'md', className }) {
  const Icon = STATE_ICON[state]
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap border-2 font-mono font-bold uppercase tracking-[0.06em]', `border-${state} text-${state} bg-${state}-soft`, size === 'sm' ? 'h-6 px-1.5 text-[10px]' : size === 'lg' ? 'h-9 px-3 text-[13px]' : 'h-7 px-2 text-[11px]', className)}>
      <Icon size={size === 'lg' ? 16 : 13} strokeWidth={2.5} aria-hidden />
      {STATES[state].label}
    </span>
  )
}

const CONF_COLOR = { HIGH: '#1F6B3A', MEDIUM: '#B8460F', 'LOW–MEDIUM': '#B8460F', LOW: '#3452D8' }
export function ConfidenceBar({ confidence, width = 'w-24', showLabel = true, className }) {
  const pct = Math.round(confidence.value * 100)
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <span className={clsx('relative h-2 border border-ink bg-cream', width)} aria-hidden>
        <span className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: CONF_COLOR[confidence.label] }} />
      </span>
      <span className="num font-mono text-[12px] font-bold">{pct}%</span>
      {showLabel && <span className="font-mono text-[10px] uppercase tracking-wider text-ink-70">{confidence.label}</span>}
    </span>
  )
}

export function ConfidenceTag({ confidence, size = 'md' }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 border-2 border-ink bg-cream font-mono font-bold uppercase', size === 'lg' ? 'h-9 px-3 text-[13px]' : 'h-7 px-2 text-[11px]')}>
      <span className="h-2.5 w-2.5 border border-ink" style={{ background: CONF_COLOR[confidence.label] }} />
      Confidence: {confidence.label}
    </span>
  )
}

export function Avatar({ name, size = 36, tone = 'rust', className }) {
  return (
    <span className={clsx('inline-flex shrink-0 items-center justify-center border-2 border-ink bg-panel font-head font-bold', tone === 'rust' ? 'text-rust' : 'text-ink', className)} style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden>
      {initials(name)}
    </span>
  )
}

export function Panel({ title, sub, action, children, className, bodyClass, flat, id }) {
  return (
    <section id={id} className={clsx(flat ? 'panel-flat' : 'panel', className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title && <h2 className="h-panel">{title}</h2>}
            {sub && <p className="mt-1.5 text-[13px] text-ink-70">{sub}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={clsx(title ? 'p-5 pt-4' : 'p-5', bodyClass)}>{children}</div>
    </section>
  )
}

export function PageHeader({ title, sub, actions, eyebrow }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-in">
      <div>
        {eyebrow}
        <h1 className="font-head text-[34px] font-bold leading-none text-ink">{title}</h1>
        {sub && <p className="mt-2 max-w-3xl text-[15px] text-ink-70">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  )
}

export function Kpi({ icon: Icon, value, label, sub, subTone = 'olive', tag, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={clsx('panel block w-full p-4 text-left', onClick && 'transition-transform hover:-translate-y-0.5')}>
      <div className="flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-cream"><Icon size={17} /></span>
        {tag && <span className="label">{tag}</span>}
      </div>
      <div className="num mt-3 font-head text-[34px] font-bold leading-none">{value}</div>
      <div className="mt-2 text-[14px] font-semibold">{label}</div>
      {sub && <div className={clsx('mt-0.5 text-[12px]', subTone === 'rust' ? 'text-rust' : subTone === 'green' ? 'text-improving' : 'text-olive')}>{sub}</div>}
    </Tag>
  )
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div role="tablist" className={clsx('flex flex-wrap gap-6 border-b-2 border-ink/80', className)}>
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)} className={clsx('tab -mb-[2px]', value === t.value && 'tab-active')}>
          {t.label}{t.count != null && <span className="ml-1.5 text-ink-50">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Modal({ open, onClose, title, children, width = 'max-w-xl', tag }) {
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-10" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fixed inset-0 bg-ink/40" onClick={onClose} />
      <div className={clsx('panel relative w-full animate-in', width)}>
        <div className="flex items-center justify-between border-b-2 border-ink bg-sand px-5 py-3">
          <div className="flex items-center gap-2">
            <h2 className="h-panel">{title}</h2>
            {tag}
          </div>
          <button onClick={onClose} className="border-2 border-ink bg-panel p-1 hover:bg-cream" aria-label="Close"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function PrivacyBanner({ className, children }) {
  return (
    <div className={clsx('flex items-center gap-2 border-2 border-ink bg-mint px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider', className)}>
      <Lock size={14} />PRIVATE — YOUR GROWTH DATA · VISIBLE ONLY TO YOU{children}
    </div>
  )
}

export function Chip({ children, tone = 'plain', className }) {
  return <span className={clsx('inline-flex h-6 items-center gap-1 border-2 px-1.5 font-mono text-[10px] font-bold uppercase tracking-wider', tone === 'rust' ? 'border-rust bg-rust text-panel' : tone === 'mint' ? 'border-ink bg-mint text-ink' : 'border-ink bg-cream text-ink', className)}>{children}</span>
}

export function Empty({ title, children }) {
  return <div className="border-2 border-dashed border-ink-30 p-8 text-center"><div className="font-head text-lg uppercase">{title}</div>{children && <p className="mt-1 text-[13px] text-ink-70">{children}</p>}</div>
}

// ---------------------------------------------------------------------------------
const ToastCtx = createContext(() => {})
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((text, tone = 'ok') => {
    const id = Math.random()
    setItems((x) => [...x, { id, text, tone }])
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3800)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-4 top-20 z-[60] flex w-[340px] flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={clsx('panel pointer-events-auto flex items-start gap-2 px-3 py-2.5 text-[13px] font-semibold animate-in', t.tone === 'error' && 'bg-declining-soft')}>
            {t.tone === 'error' ? <TriangleAlert size={16} className="mt-0.5 shrink-0 text-declining" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-improving" />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)
