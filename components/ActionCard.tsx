'use client'

import type { ActionCardType } from '@/lib/types'
import { ActionCardIcon } from './ActionCardIcon'

const GRAIN_BG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")"

export const ACTION_CARD_STYLE = {
  gradient:   'from-zinc-600 via-zinc-800 to-zinc-950',
  border:     'border-white/15',
  foilClass:  'foil-sweep',
  footer:     'from-zinc-950',
  glow:       'shadow-[0_0_18px_rgba(0,0,0,0.55),0_2px_8px_rgba(0,0,0,0.40)]',
  activeRing: 'ring-white/50',
  spotlight:  'rgba(255,255,255,0.07)',
}

const CONTEXT_LABEL: Record<string, string> = {
  trivia: 'Trivia',
  picks:  'Pick\'em',
  packs:  'Packs',
}

export function ActionCard({
  cardType,
  active = false,
  disabled = false,
  size = 'md',
  onClick,
}: {
  cardType: ActionCardType
  active?: boolean
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}) {
  const s = ACTION_CARD_STYLE
  const iconBox  = size === 'lg' ? 'w-16 h-16' : size === 'sm' ? 'w-7 h-7' : 'w-10 h-10'
  const nameSize = size === 'lg' ? 'text-[10px]' : size === 'sm' ? 'text-[6px]' : 'text-[8px]'
  const width    = size === 'lg' ? 'w-36' : size === 'sm' ? 'w-14' : 'w-20'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative ${width} aspect-[5/7] rounded-xl border-2 overflow-hidden bg-gradient-to-b ${s.gradient} ${s.border} transition-all duration-200 ${
        disabled
          ? 'opacity-30 cursor-not-allowed'
          : active
            ? `scale-110 -translate-y-2 ring-2 ${s.activeRing} ring-offset-2 ring-offset-black ${s.glow}`
            : `hover:scale-105 cursor-pointer ${s.glow}`
      }`}
    >
      {/* Foil sweep */}
      <div className={`${s.foilClass} absolute inset-0`} />

      {/* Subtle grain texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.12]"
        style={{ backgroundImage: GRAIN_BG, backgroundSize: '200px 200px', mixBlendMode: 'overlay' as const }}
      />

      {/* Radial spotlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 46%, ${s.spotlight} 0%, transparent 65%)` }}
      />

      {/* Inner frame */}
      <div className="absolute inset-[2px] rounded-[9px] border border-white/[0.10] pointer-events-none z-10" />

      {/* Top banner: context only */}
      <div className="absolute top-0 inset-x-0 z-20 bg-black/40 flex items-center px-1.5 py-[3px]">
        <span className="text-[5px] text-white/35 font-bold uppercase tracking-wider leading-none">
          {CONTEXT_LABEL[cardType.context] ?? cardType.context}
        </span>
      </div>

      {/* Icon */}
      <div className="absolute inset-0 flex items-center justify-center z-10" style={{ marginTop: '-4px' }}>
        <div className={iconBox}>
          <ActionCardIcon id={cardType.id} />
        </div>
      </div>

      {/* Footer gradient */}
      <div className={`absolute bottom-0 inset-x-0 h-[45%] bg-gradient-to-t ${s.footer} to-transparent`} />

      {/* Name */}
      <div className="absolute bottom-0 inset-x-0 px-1.5 pb-1 z-20">
        <div className={`text-white/80 font-black ${nameSize} uppercase tracking-wide leading-tight drop-shadow-lg`}>
          {cardType.name}
        </div>
      </div>
    </button>
  )
}
