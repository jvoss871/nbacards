'use client'

import { useOnboarding } from '@/lib/use-onboarding'

// One-time dismissible nudge shown the first time a player reaches a given moment
// (e.g. id="wager_overlay"). Renders nothing once the user has dismissed it.
export function OnboardingCallout({
  id,
  children,
  className,
  dark,
}: {
  id: string
  children: React.ReactNode
  className?: string
  dark?: boolean
}) {
  const { hasSeen, markSeen } = useOnboarding()
  if (hasSeen(id)) return null

  const theme = dark
    ? 'bg-white/[0.06] border-amber-400/25 text-amber-100'
    : 'bg-amber-50 border-amber-200 text-amber-900'
  const btnTheme = dark
    ? 'text-amber-400 hover:text-amber-300'
    : 'text-amber-700 hover:text-amber-900'

  return (
    <div className={`flex items-start gap-3 border rounded-2xl px-4 py-3 ${theme} ${className ?? ''}`}>
      <div className="flex-1 text-xs leading-relaxed">{children}</div>
      <button
        onClick={() => markSeen(id)}
        className={`flex-shrink-0 text-[10px] font-black uppercase tracking-widest transition-colors ${btnTheme}`}
      >
        Got it
      </button>
    </div>
  )
}
