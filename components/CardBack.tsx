'use client'

// The unrevealed face shown before a card is flipped. Real trading cards all share one
// identical back regardless of what's inside, so this is a single shared design used by
// every flippable card (player cards, action cards) rather than a per-context variant.
export function CardBack() {
  return (
    <div className="card-face w-full h-full rounded-2xl border border-white/10 bg-gradient-to-br from-stone-900 via-[#161311] to-black flex items-center justify-center cursor-pointer select-none overflow-hidden shadow-sm">
      {/* Faint diagonal texture */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(135deg,transparent,transparent 10px,#fff 10px,#fff 11px)' }}
      />
      <div className="foil-sweep absolute inset-0" />

      {/* Double inset frame */}
      <div className="absolute inset-[6px] rounded-xl border border-amber-400/[0.14] pointer-events-none" />
      <div className="absolute inset-[11px] rounded-lg border border-white/[0.05] pointer-events-none" />

      {/* Emblem */}
      <div className="relative z-10 flex flex-col items-center gap-3.5">
        <div className="w-14 h-14 rounded-full border-2 border-amber-400/25 flex items-center justify-center relative">
          <div className="absolute inset-[3px] rounded-full border border-amber-400/[0.14]" />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-7 h-7 text-amber-400/45">
            <circle cx="12" cy="12" r="9.25" />
            <path d="M12 2.75v18.5M2.75 12h18.5M5.4 5.4c2.6 2.6 2.6 10.6 0 13.2M18.6 5.4c-2.6 2.6-2.6 10.6 0 13.2" />
          </svg>
        </div>
        <span className="text-[9px] font-black tracking-[0.35em] uppercase text-white/25">CardPicks</span>
      </div>
    </div>
  )
}
