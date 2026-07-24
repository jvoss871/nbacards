'use client'

import type { Player, Tier } from '@/lib/types'
import { TIER_LABEL } from '@/lib/game-logic'
import { teamLogoUrl } from '@/lib/team-logo'
import { lastNameFontSize, GOLD_HEX_BG, splitName } from '@/lib/card-utils'

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
  photoGlow: string
}> = {
  bronze: {
    gradient: 'from-amber-600 via-amber-900 to-stone-950',
    border: 'border-amber-500/80',
    foil: 'from-amber-500/25 to-transparent',
    foilClass: '',
    label: 'text-amber-300',
    footer: 'from-stone-950',
    glow: 'shadow-sm',
    photoGlow: 'rgba(217,119,6,0.45)',
  },
  silver: {
    gradient: 'from-slate-300 via-slate-600 to-slate-900',
    border: 'border-slate-300/70',
    foil: 'from-slate-200/20 to-transparent',
    foilClass: 'foil-sweep',
    label: 'text-slate-200',
    footer: 'from-slate-900',
    glow: 'glow-silver',
    photoGlow: 'rgba(226,232,240,0.45)',
  },
  gold: {
    gradient: 'from-yellow-400 via-yellow-800 to-amber-950',
    border: 'border-yellow-400/80',
    foil: 'from-yellow-300/30 to-transparent',
    foilClass: 'foil-sweep-gold',
    label: 'text-yellow-200',
    footer: 'from-amber-950',
    glow: 'glow-gold',
    photoGlow: 'rgba(250,204,21,0.45)',
  },
  platinum: {
    gradient: 'from-cyan-400 via-blue-700 to-indigo-950',
    border: 'border-cyan-300/80',
    foil: 'from-blue-200/25 to-transparent',
    foilClass: 'foil-sweep-platinum',
    label: 'text-cyan-200',
    footer: 'from-indigo-950',
    glow: 'glow-platinum',
    photoGlow: 'rgba(34,211,238,0.45)',
  },
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function PlayerCardFlip({ card, reliability, revealed, onFlip }: Props) {
  if (!card) return null
  const s = CARD_STYLE[card.tier]
  const isPlatinum = card.tier === 'platinum'
  const isGold = card.tier === 'gold'

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

          {/* Starburst + grain — platinum only */}
          {isPlatinum && (
            <>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'repeating-conic-gradient(from 0deg at 50% 45%, rgba(180,230,255,0.10) 0deg 11deg, rgba(0,10,60,0.06) 11deg 22deg)',
                  mixBlendMode: 'screen',
                }}
              />
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.22]"
                style={{
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
                  backgroundSize: '200px 200px',
                  mixBlendMode: 'overlay',
                }}
              />
              <div className="holo-overlay" />
            </>
          )}
          {isGold && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: GOLD_HEX_BG,
                backgroundSize: '10.4px 18px',
                mixBlendMode: 'overlay',
                opacity: 0.6,
              }}
            />
          )}

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
            <span className={`text-[9px] font-black ${s.label} ${isPlatinum ? 'platinum-shimmer' : ''}`}>
              {card.multiplier}×
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
                style={{ filter: `drop-shadow(0 0 4px ${s.photoGlow}) drop-shadow(0 0 10px ${s.photoGlow})` }}
                onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-5xl font-black text-white/15 select-none">{initials(card.name)}</span>
              </div>
            )}
          </div>

          <div className={`absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t ${s.footer} to-transparent`} />

          <div className="absolute bottom-0 inset-x-0 pl-1 pr-2.5 pb-1 z-20 flex items-end justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={teamLogoUrl(card.team_abbr)}
              alt={card.team_abbr}
              className="w-11 h-11 object-contain opacity-90 flex-shrink-0"
              style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.9)) drop-shadow(0 0 7px rgba(255,255,255,0.55))' }}
            />
            <div className="text-right min-w-0">
              {(() => {
                const { first, last } = splitName(card.name)
                return (
                  <>
                    {first && <div className="text-white/70 text-[11px] font-bold uppercase tracking-wider leading-none">{first}</div>}
                    <div className="text-white font-black uppercase tracking-wide leading-tight drop-shadow-lg" style={{ fontSize: lastNameFontSize(last, 22) }}>{last}</div>
                    <div className="text-white text-[9px] uppercase tracking-wide">{card.position}</div>
                  </>
                )
              })()}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
