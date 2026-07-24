'use client'

import type { ActionCardType } from '@/lib/types'
import { ACTION_CARD_STYLE, ActionCard } from './ActionCard'
import { ActionCardIcon } from './ActionCardIcon'

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
  const s = ACTION_CARD_STYLE

  return (
    <div
      className={`card-flip-wrapper w-40 h-56 rounded-2xl transition-shadow duration-700 ${revealed ? s.glow : 'glow-unrevealed'}`}
      onClick={!revealed ? onFlip : undefined}
    >
      <div className={`card-flip w-full h-full relative ${revealed ? 'flipped' : ''}`}>

        {/* Back */}
        <div className="card-face w-full h-full rounded-2xl border border-[#e2ddd6] bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-stone-500 transition-colors select-none overflow-hidden shadow-sm">
          <div className="foil-sweep absolute inset-0" />
          <div className="absolute inset-[5px] rounded-xl border border-white/[0.06] pointer-events-none" />
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center relative z-10">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 opacity-30">
              <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
            </svg>
          </div>
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-white/20 relative z-10">Action</span>
        </div>

        {/* Front */}
        <div className={`card-face card-back w-full h-full rounded-2xl border-2 overflow-hidden relative bg-gradient-to-b ${s.gradient} ${s.border}`}>

          {/* Foil sweep */}
          <div className={`${s.foilClass} absolute inset-0`} />

          {/* Radial spotlight */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.08) 0%, transparent 60%)' }}
          />

          {/* Inner frame */}
          <div className="absolute inset-[4px] rounded-xl border border-white/[0.10] pointer-events-none z-10" />

          {/* Top: context label */}
          <div className="absolute top-0 inset-x-0 z-20 bg-black/40 flex items-center px-2.5 py-1.5">
            <span className="text-[8px] text-white/35 font-bold uppercase tracking-widest">
              {CONTEXT_LABEL[card.context] ?? card.context}
            </span>
          </div>

          {/* Icon — large */}
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ marginTop: '-20px' }}>
            <div className="w-16 h-16">
              <ActionCardIcon id={card.id} strokeWidth={2} />
            </div>
          </div>

          {/* Footer gradient */}
          <div className={`absolute bottom-0 inset-x-0 h-[45%] bg-gradient-to-t ${s.footer} to-transparent`} />

          {/* Name + description */}
          <div className="absolute bottom-0 inset-x-0 px-3 pb-3 z-20 text-center">
            <p className="text-white font-black text-sm leading-tight drop-shadow-lg">{card.name}</p>
            <p className="text-white/50 text-[9px] leading-snug mt-1">{card.description}</p>
          </div>

        </div>

      </div>
    </div>
  )
}
