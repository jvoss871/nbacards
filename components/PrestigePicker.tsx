'use client'

import { useState, useEffect } from 'react'
import { LegendCard, type LegendData } from './LegendCard'
import { ROMAN } from './PrestigeAvatar'
import { useLockBodyScroll } from '@/lib/use-lock-body-scroll'

export interface LegendOption extends LegendData {
  id: string
  prestige_required: number
}

function CardBack() {
  return (
    <div className="rounded-[18px] p-[6px] bg-gradient-to-b from-[#0d1e3a] via-[#081428] to-[#030c18] shadow-2xl shadow-black/70">
      <div className="relative aspect-[5/7] rounded-xl overflow-hidden bg-gradient-to-b from-[#0c1a35] via-[#091525] to-[#050d1a]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_40%,rgba(251,191,36,0.05),transparent)]" />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(#fbbf24 1px,transparent 1px),linear-gradient(90deg,#fbbf24 1px,transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
          <div className="w-16 h-16 rounded-full border border-amber-400/10 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border border-amber-400/8 flex items-center justify-center">
              <span className="text-amber-400/15 text-2xl font-black select-none">?</span>
            </div>
          </div>
          <span className="text-[6px] font-black uppercase tracking-[0.45em] text-amber-400/12">CardPicks</span>
        </div>
      </div>
      <div className="mt-[3px] rounded-b-xl bg-[#0a1628] px-3 py-1.5 flex items-center justify-center">
        <span className="text-[6px] font-black uppercase tracking-[0.3em] text-amber-400/12">· · ·</span>
      </div>
    </div>
  )
}

export function PrestigePicker({
  prestigeLevel,
  nextSlotLabel,
  nextSlotPosition,
  options,
  selectedLegendId,
  onSelect,
  onConfirm,
  onCancel,
  prestiging,
}: {
  prestigeLevel: number
  nextSlotLabel: string
  nextSlotPosition: string
  options: LegendOption[]
  selectedLegendId: string | null
  onSelect: (id: string) => void
  onConfirm: () => void
  onCancel: () => void
  prestiging: boolean
}) {
  useLockBodyScroll()
  const [revealed, setRevealed] = useState<boolean[]>(Array(options.length).fill(false))
  const [flipping, setFlipping] = useState<boolean[]>(Array(options.length).fill(false))
  const [confirming, setConfirming] = useState(false)

  const selectedLeg = options.find(l => l.id === selectedLegendId) ?? null

  function revealCard(i: number) {
    setFlipping(prev => { const n = [...prev]; n[i] = true; return n })
    setTimeout(() => {
      setFlipping(prev => { const n = [...prev]; n[i] = false; return n })
      setRevealed(prev => { const n = [...prev]; n[i] = true; return n })
    }, 320)
  }

  useEffect(() => {
    const timers = options.map((_, i) =>
      setTimeout(() => revealCard(i), 500 + i * 200)
    )
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-[#040b15] flex flex-col overflow-hidden">
      <style>{`
        @keyframes ppFlipOut {
          from { transform: perspective(900px) rotateY(0deg); }
          to   { transform: perspective(900px) rotateY(-90deg); }
        }
        @keyframes ppFlipIn {
          from { transform: perspective(900px) rotateY(90deg); }
          to   { transform: perspective(900px) rotateY(0deg); }
        }
        @keyframes ppSmoke {
          0%   { transform: translateY(0) scale(0.4); opacity: 0.85; }
          55%  { opacity: 0.35; }
          100% { transform: translateY(-130px) scale(2.4); opacity: 0; }
        }
        @keyframes ppAura {
          0%,100% { box-shadow: 0 0 22px rgba(251,191,36,0.55), 0 0 55px rgba(251,191,36,0.18); }
          50%      { box-shadow: 0 0 48px rgba(251,191,36,0.95), 0 0 100px rgba(251,191,36,0.4), 0 0 150px rgba(251,191,36,0.12); }
        }
        @keyframes ppFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ppBtn {
          0%,100% { box-shadow: 0 4px 24px rgba(251,191,36,0.45); }
          50%      { box-shadow: 0 4px 48px rgba(251,191,36,0.85), 0 0 70px rgba(251,191,36,0.25); }
        }
      `}</style>

      {/* Background orb */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_62%,rgba(251,191,36,0.06),transparent_70%)]" />
        <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex-shrink-0 pt-12 pb-4 text-center px-4">
        <p className="text-[9px] font-black uppercase tracking-[0.45em] text-amber-400/40 mb-3">
          Prestige {ROMAN[prestigeLevel]}
        </p>
        <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight">
          Choose Your
          <br />
          <span className="text-amber-400">{nextSlotLabel}</span>
        </h2>
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/20 mt-2">
          {nextSlotPosition} · Starting Five
        </p>
      </div>

      {/* Cards */}
      <div className="relative z-10 flex-1 flex items-center min-h-0">
        <div
          className="flex gap-4 sm:gap-5 w-full px-6 sm:px-8 overflow-x-auto justify-start lg:justify-center"
          style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory', paddingTop: '28px', paddingBottom: '8px' }}
        >
          <div className="flex-shrink-0 w-[calc(50vw-88px)] lg:hidden" aria-hidden />

          {options.map((leg, i) => {
            const isSelected = selectedLegendId === leg.id
            const isRevealed = revealed[i]
            const isFlipping = flipping[i]

            return (
              <div
                key={leg.id}
                className="flex-shrink-0 relative"
                style={{ scrollSnapAlign: 'center' }}
              >
                {/* Transform wrapper — aura + dim live here so they move with the card */}
                <div
                  className="relative cursor-pointer"
                  style={{
                    transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                    transform: isSelected ? 'translateY(-16px) scale(1.07)' : 'scale(1)',
                    opacity: !isRevealed && !isFlipping ? 0.6 : 1,
                  }}
                  onClick={() => isRevealed && onSelect(leg.id)}
                >
                  <div className="w-44">
                    {!isRevealed && (
                      <div style={{ animation: isFlipping ? 'ppFlipOut 0.32s ease-in forwards' : 'none' }}>
                        <CardBack />
                      </div>
                    )}
                    {isRevealed && (
                      <div style={{ animation: 'ppFlipIn 0.32s ease-out' }}>
                        <LegendCard legend={leg} prestigeNum={prestigeLevel + 1} />
                      </div>
                    )}
                  </div>

                  {/* Aura — inside transform so it tracks the card */}
                  {isSelected && isRevealed && (
                    <div
                      className="absolute inset-0 rounded-[18px] pointer-events-none"
                      style={{ animation: 'ppAura 2s ease-in-out infinite' }}
                    />
                  )}

                  {/* Dim — inside transform so it tracks the card exactly */}
                  {isRevealed && selectedLegendId && !isSelected && (
                    <div
                      className="absolute inset-0 rounded-[18px] bg-black/65 pointer-events-none"
                      style={{ transition: 'opacity 0.3s' }}
                    />
                  )}
                </div>

                {/* Smoke — stays at layout position (card base), intentionally outside transform */}
                {isSelected && isRevealed && (
                  <div className="absolute inset-x-0 bottom-6 overflow-visible pointer-events-none">
                    {[0,1,2,3,4,5,6].map(j => (
                      <div
                        key={j}
                        className="absolute bottom-0 rounded-full"
                        style={{
                          left: `${12 + j * 11}%`,
                          width:  `${10 + j * 6}px`,
                          height: `${10 + j * 6}px`,
                          background: j % 3 === 0
                            ? 'rgba(251,191,36,0.55)'
                            : j % 3 === 1
                            ? 'rgba(245,158,11,0.38)'
                            : 'rgba(217,119,6,0.22)',
                          filter: `blur(${3 + j * 2}px)`,
                          animation: `ppSmoke ${1.0 + j * 0.22}s ease-out ${j * 0.15}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex-shrink-0 w-[calc(50vw-88px)] lg:hidden" aria-hidden />
        </div>
      </div>

      {/* Selected info */}
      <div className="relative z-10 flex-shrink-0 h-[76px] flex flex-col items-center justify-center px-8 text-center">
        {selectedLeg ? (
          <div key={selectedLeg.id} style={{ animation: 'ppFadeUp 0.25s ease-out' }}>
            <div className="text-white font-black text-lg leading-tight">{selectedLeg.name}</div>
            <div className="text-amber-400/55 text-xs mt-0.5 max-w-xs">{selectedLeg.bio}</div>
          </div>
        ) : (
          <p className="text-white/20 text-sm">Tap a card to select your {nextSlotPosition}</p>
        )}
      </div>

      {/* Actions */}
      <div className="relative z-10 flex-shrink-0 pb-12 pt-2 flex flex-col items-center gap-4 px-8">
        {confirming && selectedLeg ? (
          <>
            <p className="text-white/60 text-sm text-center">
              Lock in <span className="text-white font-black">{selectedLeg.name}</span>?<br />
              <span className="text-white/35 text-xs">Your collection resets. This can&apos;t be undone.</span>
            </p>
            <button
              onClick={() => { setConfirming(false); onConfirm() }}
              disabled={prestiging}
              className="w-full max-w-xs py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-black text-sm uppercase tracking-[0.25em] transition-colors"
            >
              {prestiging ? 'Locking In…' : 'Yes, Lock In'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-white/40 hover:text-white/70 text-sm transition-colors py-1"
            >
              Go back
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => selectedLegendId && setConfirming(true)}
              disabled={!selectedLegendId || prestiging}
              className="w-full max-w-xs py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-25 text-black font-black text-sm uppercase tracking-[0.25em] transition-colors"
              style={selectedLegendId && !prestiging ? { animation: 'ppBtn 2s ease-in-out infinite' } : undefined}
            >
              Lock In
            </button>
            <button
              onClick={onCancel}
              className="text-white/40 hover:text-white/70 text-sm transition-colors py-1"
            >
              Not yet
            </button>
          </>
        )}
      </div>
    </div>
  )
}
