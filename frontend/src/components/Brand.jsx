import clsx from 'clsx'
import { Activity } from 'lucide-react'

export function Mark({ size = 44 }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center border-2 border-ink bg-rust text-panel shadow-hard-sm" style={{ width: size, height: size }} aria-hidden>
      <Activity size={size * 0.5} strokeWidth={2.5} />
    </span>
  )
}

export function Wordmark({ className, size = 44 }) {
  return (
    <span className={clsx('flex items-center gap-3', className)}>
      <Mark size={size} />
      <span className="leading-tight">
        <span className="block font-head text-[21px] font-bold uppercase tracking-tight text-ink">UnnatiTrack</span>
        <span className="block font-mono text-[10px] uppercase tracking-[0.06em] text-olive">Track skills. Understand growth.</span>
      </span>
    </span>
  )
}
