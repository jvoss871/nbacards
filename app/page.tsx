'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LegendCard } from '@/components/LegendCard'
import type { LegendData } from '@/components/LegendCard'

// ── Types ─────────────────────────────────────────────────────────────────────

interface StartingFiveMember {
  slot: number
  position: string
  legend: LegendData & { id: string }
}

interface Inductee {
  id: string
  username: string
  inducted_at: string
  inductee_number: number
  starting_five: StartingFiveMember[]
}

// ── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    title: 'Daily Picks',
    description: 'Pick NBA game winners each day. Get it right, earn credits. Build your streak.',
    href: '/picks',
  },
  {
    title: 'Card Packs',
    description: 'Spend credits on packs. Pull Bronze, Silver, Gold, or Platinum player cards. Each tier carries a stat multiplier that boosts your trivia odds.',
    href: '/packs',
  },
  {
    title: 'NBA Trivia',
    description: 'Answer 15 questions across three difficulty tiers — Easy, Medium, and Hard. Each correct answer banks credits and raises the stakes. Cash out at any checkpoint or risk it all on the next question. Use player cards as lifelines: phone a card for a probability hint, eliminate wrong answers, or lock in a safety net so a wrong answer still pays out.',
    href: '/trivia',
  },
  {
    title: 'Prestige System',
    description: 'Complete your collection, then prestige. Choose one legend per position for your Starting Five.',
    href: '/collection',
  },
]

// ── Ordinal ───────────────────────────────────────────────────────────────────

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

// ── Landing Page ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [inductees, setInductees] = useState<Inductee[]>([])
  const [hofLoading, setHofLoading] = useState(true)
  const [expandedInducteeId, setExpandedInducteeId] = useState<string | null>(null)
  useEffect(() => {
    document.body.style.background = '#fafaf7'
    return () => { document.body.style.background = '' }
  }, [])

  useEffect(() => {
    fetch('/api/hall-of-fame')
      .then(r => r.json())
      .then(d => { setInductees(d.inductees ?? []); setHofLoading(false) })
      .catch(() => setHofLoading(false))
  }, [])


  return (
    <div className="-mx-4 -my-6 bg-[#fafaf7] text-[#1a1714]">
      <style>{`
        @keyframes landingShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes landingFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes landingPulse {
          0%,100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
      `}</style>

      {/* Warm gold glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_45%_at_50%_0%,rgba(251,191,36,0.13),transparent_65%)]" />
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section
        className="relative z-10 pt-20 pb-24 text-center px-6 max-w-3xl mx-auto"
        style={{ animation: 'landingFadeUp 0.6s ease-out both' }}
      >
        <h1 className="text-6xl sm:text-8xl font-black tracking-tight leading-none uppercase mb-6">
          <span
            style={{
              background: 'linear-gradient(90deg, #92400e, #d97706, #f59e0b, #d97706, #92400e)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'landingShimmer 5s linear infinite',
            }}
          >
            Card
          </span>
          <span className="text-[#1a1714]">Picks</span>
        </h1>

        <p className="text-xl sm:text-2xl text-[#1a1714]/50 font-medium leading-relaxed max-w-lg mx-auto mb-3">
          Predict games. Play Trivia. Open Packs. Build your{' '}
          <span className="text-[#1a1714]/80">All-Time Starting Five</span>.
        </p>
        <p className="text-sm text-[#1a1714]/35 max-w-sm mx-auto">
          The NBA card collecting and prediction game where your knowledge earns real rewards.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Link
            href="/picks"
            className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-colors shadow-lg shadow-amber-500/20"
          >
            Play Now →
          </Link>
        </div>
      </section>

      {/* ── Section divider ───────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center gap-6 max-w-4xl mx-auto px-6">
        <div className="flex-1 h-px bg-[#1a1714]/[0.06]" />
        <span className="text-[#1a1714]/25 text-xs uppercase tracking-widest">How it works</span>
        <div className="flex-1 h-px bg-[#1a1714]/[0.06]" />
      </div>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <Link
              key={f.title}
              href={f.href}
              className="group block p-6 rounded-2xl border border-[#1a1714]/[0.07] hover:border-amber-400/40 bg-white hover:bg-amber-50/50 transition-all shadow-sm"
              style={{ animation: `landingFadeUp 0.5s ease-out ${0.1 + i * 0.08}s both` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-base font-black text-[#1a1714] group-hover:text-amber-700 transition-colors">
                  {f.title}
                </h3>
                <span className="text-[#1a1714]/20 group-hover:text-amber-500/60 transition-colors text-sm">→</span>
              </div>
              <p className="text-sm text-[#1a1714]/45 leading-relaxed">{f.description}</p>
            </Link>
          ))}
        </div>

        {/* HoF feature callout */}
        <div
          className="mt-4 p-6 rounded-2xl border border-amber-400/30 bg-amber-50 text-center shadow-sm"
          style={{ animation: 'landingFadeUp 0.5s ease-out 0.45s both' }}
        >
          <div className="text-sm font-black text-amber-700 uppercase tracking-widest mb-1">
            Hall of Fame
          </div>
          <p className="text-sm text-[#1a1714]/45 max-w-sm mx-auto">
            Reach Prestige V — the fifth and final prestige — and your username and Starting Five
            are enshrined in the Hall of Fame forever.
          </p>
        </div>
      </section>

      {/* ── Hall of Fame ──────────────────────────────────────────────── */}
      <section className="relative z-10 py-16 px-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-5 mb-10">
          <div className="flex-1 h-px bg-[#1a1714]/[0.06]" />
          <div className="text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.5em] text-amber-600/50 mb-1">
              Prestige V
            </div>
            <div
              className="text-2xl font-black uppercase tracking-widest"
              style={{
                background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Hall of Fame
            </div>
          </div>
          <div className="flex-1 h-px bg-[#1a1714]/[0.06]" />
        </div>

        {hofLoading && (
          <div className="text-[#1a1714]/20 text-sm text-center py-8">Loading...</div>
        )}

        {!hofLoading && inductees.length === 0 && (
          <div className="text-center py-12 border border-dashed border-[#1a1714]/[0.08] rounded-2xl">
            <div className="text-[#1a1714]/30 font-black text-base uppercase tracking-widest mb-2">
              No Inductees Yet
            </div>
            <div className="text-[#1a1714]/20 text-sm">
              Complete your Starting Five to be the first enshrined.
            </div>
          </div>
        )}

        {!hofLoading && inductees.length > 0 && (
          <div className="divide-y divide-[#1a1714]/[0.06]">
            {inductees.map(inductee => {
              const isOpen = expandedInducteeId === inductee.id
              return (
                <div key={inductee.id}>
                  <button
                    onClick={() => setExpandedInducteeId(isOpen ? null : inductee.id)}
                    className="w-full flex items-center gap-4 py-4 px-2 text-left group hover:bg-amber-50/60 rounded-lg transition-colors"
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-600/40 w-6 text-right flex-shrink-0">
                      {ordinal(inductee.inductee_number)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span
                        className="font-black text-base tracking-tight"
                        style={{
                          background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {inductee.username}
                      </span>
                    </div>
                    <span className="text-[9px] text-[#1a1714]/30 uppercase tracking-wider flex-shrink-0">
                      {new Date(inductee.inducted_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </span>
                    <span
                      className="text-[#1a1714]/25 text-xs flex-shrink-0 transition-transform duration-200"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
                    >▾</span>
                  </button>

                  {isOpen && (
                    <div className="pb-6 px-2">
                      <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                        <div className="flex gap-3 pb-1" style={{ minWidth: 'max-content' }}>
                          {([1, 2, 3, 4, 5] as const).map(slot => {
                            const member = inductee.starting_five.find(m => m.slot === slot)
                            const posLabel = ['PG', 'SG', 'SF', 'PF', 'C'][slot - 1]
                            return (
                              <div key={slot} className="flex flex-col items-center gap-1.5">
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#1a1714]/25">
                                  {posLabel}
                                </span>
                                {member ? (
                                  <div className="w-24">
                                    <LegendCard legend={member.legend} prestigeNum={slot} />
                                  </div>
                                ) : (
                                  <div className="w-24 rounded-xl border border-[#1a1714]/[0.07] bg-[#1a1714]/[0.02]" style={{ aspectRatio: '5/7' }} />
                                )}
                                {member && (
                                  <div className="text-[7px] font-black text-amber-700/60 text-center max-w-[96px] truncate">
                                    {member.legend.name}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>


{/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-[#1a1714]/[0.06] py-8 px-6 text-center">
        <div className="text-[10px] text-[#1a1714]/25 uppercase tracking-widest">
          CardPicks · NBA Prediction Game · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
