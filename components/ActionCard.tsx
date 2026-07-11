import type { ActionCardType } from '@/lib/types'

export const ACTION_CARD_STYLE: Record<string, {
  gradient: string; border: string; iconColor: string; footer: string; glow: string; activeRing: string
}> = {
  common: {
    gradient:   'from-slate-400 via-slate-600 to-slate-900',
    border:     'border-slate-300/30',
    iconColor:  'text-slate-100',
    footer:     'from-slate-900',
    glow:       '',
    activeRing: 'ring-slate-400',
  },
  rare: {
    gradient:   'from-violet-500 via-violet-800 to-indigo-950',
    border:     'border-violet-400/40',
    iconColor:  'text-violet-100',
    footer:     'from-indigo-950',
    glow:       'shadow-[0_0_22px_rgba(139,92,246,0.45)]',
    activeRing: 'ring-violet-400',
  },
  elite: {
    gradient:   'from-amber-400 via-amber-700 to-stone-950',
    border:     'border-amber-400/50',
    iconColor:  'text-amber-100',
    footer:     'from-stone-950',
    glow:       'shadow-[0_0_24px_rgba(251,191,36,0.50)]',
    activeRing: 'ring-amber-400',
  },
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
  size?: 'sm' | 'md'
  onClick?: () => void
}) {
  const s = ACTION_CARD_STYLE[cardType.rarity] ?? ACTION_CARD_STYLE.common
  const iconSize = size === 'sm' ? 'text-xl' : 'text-2xl'
  const nameSize = size === 'sm' ? 'text-[6px]' : 'text-[7px]'
  const width    = size === 'sm' ? 'w-[52px]' : 'w-20'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative ${width} aspect-[5/7] rounded-xl border-2 overflow-hidden bg-gradient-to-b ${s.gradient} ${s.border} transition-all duration-200 ${
        disabled
          ? 'opacity-30 cursor-not-allowed'
          : active
            ? `scale-110 -translate-y-2 ring-2 ${s.activeRing} ring-offset-2 ring-offset-black ${s.glow}`
            : `opacity-90 hover:opacity-100 hover:scale-105 cursor-pointer ${s.glow}`
      }`}
    >
      <div className="foil-sweep absolute inset-0" />
      <div className="absolute inset-[2px] rounded-[9px] border border-white/[0.07] pointer-events-none z-10" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${iconSize} drop-shadow-lg select-none ${s.iconColor}`}>{cardType.icon}</span>
      </div>
      <div className={`absolute bottom-0 inset-x-0 h-2/5 bg-gradient-to-t ${s.footer} to-transparent`} />
      <div className="absolute bottom-0 inset-x-0 px-1.5 pb-1.5 z-20">
        <div className={`text-white font-black ${nameSize} uppercase tracking-wide leading-tight truncate drop-shadow-lg`}>
          {cardType.name}
        </div>
      </div>
    </button>
  )
}
