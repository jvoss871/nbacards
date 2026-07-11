'use client'

import type { ActionCardType } from '@/lib/types'

const RARITY_STYLES: Record<string, {
  gradient: string
  iconBg: string
  badge: string
  badgeText: string
  label: string
  glow: string
}> = {
  common: {
    gradient:  'from-slate-700 via-slate-800 to-slate-900',
    iconBg:    'bg-slate-600/60',
    badge:     'bg-slate-600',
    badgeText: 'text-slate-200',
    label:     'Common',
    glow:      'shadow-slate-500/30',
  },
  rare: {
    gradient:  'from-violet-700 via-violet-900 to-slate-950',
    iconBg:    'bg-violet-600/60',
    badge:     'bg-violet-600',
    badgeText: 'text-violet-100',
    label:     'Rare',
    glow:      'shadow-violet-500/50',
  },
  elite: {
    gradient:  'from-amber-500 via-amber-800 to-stone-950',
    iconBg:    'bg-amber-600/60',
    badge:     'bg-amber-500',
    badgeText: 'text-amber-950',
    label:     'Elite',
    glow:      'shadow-amber-400/50',
  },
}

const CONTEXT_LABEL: Record<string, string> = {
  trivia: 'Trivia',
  picks:  'Pick\'em',
  packs:  'Packs',
}

interface Props {
  card: ActionCardType
  revealed: boolean
  onFlip: () => void
}

export default function ActionCardReveal({ card, revealed, onFlip }: Props) {
  const s = RARITY_STYLES[card.rarity] ?? RARITY_STYLES.common

  return (
    <div
      className={`card-flip-wrapper w-40 h-56 rounded-2xl transition-shadow duration-700 ${revealed ? `shadow-lg ${s.glow}` : 'glow-unrevealed'}`}
      onClick={!revealed ? onFlip : undefined}
    >
      <div className={`card-flip w-full h-full relative ${revealed ? 'flipped' : ''}`}>

        {/* Back */}
        <div className="card-face w-full h-full rounded-2xl border border-[#e2ddd6] bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-stone-500 transition-colors select-none overflow-hidden shadow-sm">
          <div className="foil-sweep absolute inset-0" />
          <div className="absolute inset-[5px] rounded-xl border border-white/[0.06] pointer-events-none" />
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center relative z-10">
            <span className="text-xl">⚡</span>
          </div>
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-white/20 relative z-10">Action</span>
        </div>

        {/* Front */}
        <div
          className={`card-face card-back w-full h-full rounded-2xl border-2 border-white/20 overflow-hidden relative bg-gradient-to-b ${s.gradient} flex flex-col items-center justify-between p-3`}
        >
          {/* Inner frame */}
          <div className="absolute inset-[4px] rounded-xl border border-white/[0.08] pointer-events-none z-10" />

          {/* Top row */}
          <div className="w-full flex items-center justify-end z-20">
            <span className="text-[8px] text-white/40 font-semibold uppercase tracking-wide">
              {CONTEXT_LABEL[card.context]}
            </span>
          </div>

          {/* Icon */}
          <div className={`w-16 h-16 rounded-2xl ${s.iconBg} flex items-center justify-center text-4xl z-20`}>
            {card.icon}
          </div>

          {/* Name + description */}
          <div className="text-center z-20 px-1">
            <p className="text-white font-black text-sm leading-tight">{card.name}</p>
            <p className="text-white/50 text-[9px] leading-tight mt-1">{card.description}</p>
          </div>

          {/* Bonus label */}
          <div className="text-[8px] text-white/25 uppercase tracking-widest font-semibold z-20">
            Bonus Card
          </div>
        </div>

      </div>
    </div>
  )
}
