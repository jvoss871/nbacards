'use client'

import { useEffect, useState } from 'react'
import { useLockBodyScroll } from '@/lib/use-lock-body-scroll'

const THEMES: Record<string, { grad: string; stripe: string; glow: string }> = {
  Starter:  { grad: 'from-blue-950 via-[#0f1b3d] to-[#0a1128]',   stripe: 'bg-red-600',    glow: 'rgba(59,130,246,0.35)' },
  Hardwood: { grad: 'from-amber-950 via-[#1c1105] to-[#100b02]',  stripe: 'bg-amber-500',  glow: 'rgba(217,119,6,0.35)' },
  Elite:    { grad: 'from-cyan-950 via-[#060d1f] to-[#02050f]',   stripe: 'bg-cyan-400',   glow: 'rgba(34,211,238,0.4)' },
}

// Jagged tear edge, positioned near the top of the pack rather than down the middle —
// matches how a real foil pack actually opens (tear off the top edge). Both pieces share
// this exact boundary so they interlock perfectly before tearing apart.
const TOP_CLIP    = 'polygon(0 0, 100% 0, 100% 16%, 84% 21%, 72% 11%, 60% 22%, 48% 13%, 36% 21%, 24% 11%, 12% 22%, 0 16%)'
const BOTTOM_CLIP = 'polygon(0 16%, 12% 22%, 24% 11%, 36% 21%, 48% 13%, 60% 22%, 72% 11%, 84% 21%, 100% 16%, 100% 100%, 0 100%)'

const ANTICIPATE_MS = 800
const TEAR_MS        = 1000
const SETTLE_MS       = 600
const FLASH_DELAY_MS  = ANTICIPATE_MS + TEAR_MS * 0.35

// Auto-plays a foil-tear on mount, no interaction required, then calls onDone.
export function PackTearAnimation({ packName, onDone }: { packName: string; onDone: () => void }) {
  useLockBodyScroll()
  const [phase, setPhase] = useState<'idle' | 'tearing'>('idle')
  const [flash, setFlash] = useState(false)
  const theme = THEMES[packName] ?? THEMES.Starter

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('tearing'), ANTICIPATE_MS)
    const t2 = setTimeout(() => setFlash(true), FLASH_DELAY_MS)
    const t3 = setTimeout(onDone, ANTICIPATE_MS + TEAR_MS + SETTLE_MS)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
      <style>{`
        @keyframes packAnticipate {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.05) rotate(-1deg); }
        }
        @keyframes tearAcross {
          to { transform: translateX(170%) translateY(-15%) rotate(22deg); opacity: 0; }
        }
        @keyframes tearDown {
          to { transform: translateY(120%) scale(0.94); opacity: 0; }
        }
        @keyframes tearFlash {
          0% { opacity: 0; }
          35% { opacity: 0.9; }
          100% { opacity: 0; }
        }
      `}</style>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 50% 40% at 50% 50%, ${theme.glow}, transparent 70%)` }}
      />

      <div className="relative w-52 sm:w-60 aspect-[5/7]">
        {/* Top strip — the piece that actually tears off */}
        <div
          className={`absolute inset-0 rounded-t-2xl overflow-hidden bg-gradient-to-b ${theme.grad} border-t-2 border-x-2 border-white/10`}
          style={{
            clipPath: TOP_CLIP,
            animation: phase === 'idle'
              ? 'packAnticipate 1.1s ease-in-out infinite'
              : `tearAcross ${TEAR_MS}ms cubic-bezier(0.5,0,0.75,0) forwards`,
          }}
        >
          <div className={`absolute top-0 inset-x-0 h-2 ${theme.stripe}`} />
        </div>

        {/* Body — the rest of the pack, falls away after the top rips off */}
        <div
          className={`absolute inset-0 rounded-b-2xl overflow-hidden bg-gradient-to-b ${theme.grad} border-b-2 border-x-2 border-white/10`}
          style={{
            clipPath: BOTTOM_CLIP,
            animation: phase === 'idle'
              ? 'packAnticipate 1.1s ease-in-out infinite'
              : `tearDown ${TEAR_MS}ms cubic-bezier(0.5,0,0.75,0) forwards`,
          }}
        >
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'linear-gradient(135deg,#fff 0%,transparent 40%)' }} />
        </div>

        {/* Center wordmark, sits under both pieces until they tear away */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white/90 font-black text-lg uppercase tracking-widest drop-shadow-lg">
            {packName}
          </span>
        </div>
      </div>

      {flash && (
        <div
          className="absolute inset-0 bg-white pointer-events-none"
          style={{ animation: `tearFlash ${SETTLE_MS}ms ease-out forwards` }}
        />
      )}
    </div>
  )
}
