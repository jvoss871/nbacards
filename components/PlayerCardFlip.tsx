'use client'

import type { Player, Tier } from '@/lib/types'
import { TIER_LABEL } from '@/lib/game-logic'

interface Props {
  card: Player
  reliability?: number | null
  revealed: boolean
  onFlip: () => void
}

const CARD_STYLE: Record<Tier, {
  gradient: string
  border: string
  foil: string
  foilClass: string
  label: string
  footer: string
  glow: string
}> = {
  bronze: {
    gradient: 'from-amber-600 via-amber-900 to-stone-950',
    border: 'border-amber-500/80',
    foil: 'from-amber-500/25 to-transparent',
    foilClass: 'foil-sweep',
    label: 'text-amber-300',
    footer: 'from-stone-950',
    glow: 'glow-bronze',
  },
  silver: {
    gradient: 'from-slate-300 via-slate-600 to-slate-900',
    border: 'border-slate-300/70',
    foil: 'from-slate-200/20 to-transparent',
    foilClass: 'foil-sweep',
    label: 'text-slate-200',
    footer: 'from-slate-900',
    glow: 'glow-silver',
  },
  gold: {
    gradient: 'from-yellow-400 via-yellow-800 to-amber-950',
    border: 'border-yellow-400/80',
    foil: 'from-yellow-300/30 to-transparent',
    foilClass: 'foil-sweep-gold',
    label: 'text-yellow-200',
    footer: 'from-amber-950',
    glow: 'glow-gold',
  },
  platinum: {
    gradient: 'from-cyan-400 via-blue-700 to-indigo-950',
    border: 'border-cyan-300/80',
    foil: 'from-blue-200/25 to-transparent',
    foilClass: 'foil-sweep-platinum',
    label: 'text-cyan-200',
    footer: 'from-indigo-950',
    glow: 'glow-platinum',
  },
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function PlayerCardFlip({ card, reliability, revealed, onFlip }: Props) {
  if (!card) return null
  const s = CARD_STYLE[card.tier]
  const isPlatinum = card.tier === 'platinum'

  return (
    <div
      className={`card-flip-wrapper w-40 h-56 rounded-2xl transition-shadow duration-700 ${revealed ? s.glow : 'glow-unrevealed'}`}
      onClick={!revealed ? onFlip : undefined}
    >
      <div className={`card-flip w-full h-full relative ${revealed ? 'flipped' : ''}`}>

        {/* ── Card back ── */}
        <div className="card-face w-full h-full rounded-2xl border border-[#e2ddd6] bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-stone-500 transition-colors select-none overflow-hidden shadow-sm">
          {/* Back foil sweep */}
          <div className="foil-sweep absolute inset-0" />
          {/* Back inner frame */}
          <div className="absolute inset-[5px] rounded-xl border border-white/[0.06] pointer-events-none" />
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center relative z-10">
            <span className="text-xl">🏀</span>
          </div>
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-white/20 relative z-10">CardPicks</span>
        </div>

        {/* ── Card front ── */}
        <div className={`card-face card-back w-full h-full rounded-2xl border-2 overflow-hidden relative bg-gradient-to-b ${s.gradient} ${s.border}`}>

          {/* Diagonal foil gradient */}
          <div className={`absolute inset-0 bg-gradient-to-br ${s.foil} pointer-events-none`} />

          {/* Animated foil sweep */}
          <div className={`${s.foilClass} absolute inset-0`} />

          {/* Holographic overlay — platinum only */}
          {isPlatinum && <div className="holo-overlay" />}

          {/* Inner card frame */}
          <div className="absolute inset-[4px] rounded-xl border border-white/[0.08] pointer-events-none z-10" />

          {/* Top banner */}
          <div className="absolute top-0 inset-x-0 z-20 bg-black/50 flex items-center justify-between gap-1 px-2.5 py-1.5">
            {revealed && reliability != null ? (
              <span className="bg-white/25 rounded-full px-2 py-px text-[8px] font-black text-white leading-none">
                {reliability}%
              </span>
            ) : (
              <span className="text-[8px] font-bold text-white/30 uppercase tracking-[0.2em]">CardPicks</span>
            )}
            <span className={`rounded-full px-2 py-px text-[8px] font-black uppercase leading-none bg-white/15 ${s.label} ${isPlatinum ? 'platinum-shimmer' : ''}`}>
              {TIER_LABEL[card.tier]}
            </span>
          </div>

          {/* Player photo — bounded above the footer */}
          <div className="absolute inset-x-0 top-[28px] bottom-14 overflow-hidden">
            {card.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.image_url}
                alt={card.name}
                className="w-full h-full object-cover object-top"
                onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-5xl font-black text-white/15 select-none">{initials(card.name)}</span>
              </div>
            )}
          </div>

          {/* Bottom gradient overlay */}
          <div className={`absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t ${s.footer} to-transparent`} />

          {/* Bottom info */}
          <div className="absolute bottom-0 inset-x-0 px-2.5 pb-2.5 z-20">
            <div className="text-white font-black text-[11px] uppercase tracking-wide leading-tight truncate drop-shadow-lg">
              {card.name}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-white/50 text-[9px] uppercase tracking-wide">
                {card.team_abbr} · {card.position}
              </span>
              <span className={`text-[10px] font-black ${s.label}`}>{card.multiplier}x</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
