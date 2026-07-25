'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LegendCard } from '@/components/LegendCard'
import type { LegendData } from '@/components/LegendCard'
import { supabase } from '@/lib/supabase'

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

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

const MODES = [
  {
    label: 'Daily Picks',
    tag: 'Free to play',
    body: 'Pick NBA game winners every day. Build a streak, earn credits, watch your accuracy rating climb.',
    href: '/picks',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    label: 'Pack Store',
    tag: 'Spend credits',
    body: 'Open Bronze, Silver, Gold, and Platinum packs. Each tier unlocks higher stat multipliers for your lifelines.',
    href: '/packs',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2"/>
      </svg>
    ),
  },
  {
    label: 'NBA Trivia',
    tag: 'Daily jackpot',
    body: '15 questions, three difficulty tiers. Bank credits at each checkpoint or push for the 1,000-credit jackpot.',
    href: '/trivia',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5"/>
      </svg>
    ),
  },
]

const PRESTIGE_STEPS = [
  { roman: 'I',   pos: 'PG', label: 'Point Guard' },
  { roman: 'II',  pos: 'SG', label: 'Shooting Guard' },
  { roman: 'III', pos: 'SF', label: 'Small Forward' },
  { roman: 'IV',  pos: 'PF', label: 'Power Forward' },
  { roman: 'V',   pos: 'C',  label: 'Center · Hall of Fame' },
]

export default function LandingPage() {
  const [inductees, setInductees] = useState<Inductee[]>([])
  const [hofLoading, setHofLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isSignedIn, setIsSignedIn] = useState(false)

  useEffect(() => {
    fetch('/api/hall-of-fame')
      .then(r => r.json())
      .then(d => { setInductees(d.inductees ?? []); setHofLoading(false) })
      .catch(() => setHofLoading(false))
    supabase.auth.getSession().then(({ data }) => setIsSignedIn(!!data.session))
  }, [])

  return (
    <div className="-mx-4 -my-6 text-[#1a1714]">
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-0 { animation: fadeUp 0.55s ease-out 0.05s both; }
        .anim-1 { animation: fadeUp 0.55s ease-out 0.15s both; }
        .anim-2 { animation: fadeUp 0.55s ease-out 0.25s both; }
        .anim-3 { animation: fadeUp 0.55s ease-out 0.35s both; }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #03080f 0%, #050d1f 55%, #0a1428 100%)' }}>
        {/* Radial gold glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_-10%,rgba(251,191,36,0.12),transparent_65%)] pointer-events-none" />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(#fbbf24 1px, transparent 1px), linear-gradient(90deg, #fbbf24 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        {/* Gold top line */}
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #FFD700 30%, #FFD700 70%, transparent)' }} />

        <div className="relative max-w-3xl mx-auto px-6 pt-20 pb-24 text-center anim-0">
          {/* NBA logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nba.png&h=200&w=200"
            alt="NBA"
            className="w-24 h-24 object-contain mx-auto mb-6 opacity-85"
          />

          <h1 className="text-7xl sm:text-9xl font-black tracking-tight leading-none uppercase mb-5">
            <span style={{
              background: 'linear-gradient(90deg, #b8860b, #FFD700, #f59e0b, #FFD700, #b8860b)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 6s linear infinite',
            }}>Card</span>
            <span className="text-white">Picks</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/50 font-medium leading-relaxed max-w-md mx-auto mb-10">
            The NBA card game where <span className="text-white/80">your knowledge</span> builds your roster.
          </p>
          <Link
            href={isSignedIn ? '/trivia' : '/signin'}
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all hover:brightness-110 active:scale-95"
            style={{ background: 'linear-gradient(90deg, #b8860b, #FFD700, #daa520)', color: '#1a1400', boxShadow: '0 0 32px rgba(251,191,36,0.30), 0 4px 16px rgba(0,0,0,0.5)' }}
          >
            Play Now
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M5 3l14 9-14 9V3z"/></svg>
          </Link>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="bg-[#fafaf7] px-6 py-16 max-w-4xl mx-auto">
        <div className="text-center mb-10 anim-1">
          <p className="text-[9px] font-black uppercase tracking-[0.45em] text-amber-600/60 mb-2">How It Works</p>
          <h2 className="text-2xl font-black text-[#1a1714]">Three ways to earn. One goal.</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 anim-1">
          {MODES.map(m => (
            <Link
              key={m.label}
              href={m.href}
              className="group relative overflow-hidden bg-white border border-[#e2ddd6] rounded-2xl p-5 hover:border-amber-400/50 hover:shadow-md transition-all"
            >
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-8 h-8 rounded-xl bg-[#f0ede8] flex items-center justify-center text-amber-600 mb-3 group-hover:bg-amber-50 transition-colors">
                {m.icon}
              </div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-amber-600/60 mb-1">{m.tag}</p>
              <h3 className="text-sm font-black text-[#1a1714] mb-1.5 group-hover:text-amber-700 transition-colors">{m.label}</h3>
              <p className="text-[11px] text-[#a39890] leading-relaxed">{m.body}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── PRESTIGE PATH ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-16 px-6" style={{ background: 'linear-gradient(180deg, #050d1f 0%, #03080f 100%)' }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(251,191,36,0.06),transparent_70%)] pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent)' }} />

        <div className="relative max-w-3xl mx-auto anim-2">
          <div className="text-center mb-10">
            <p className="text-[9px] font-black uppercase tracking-[0.45em] text-amber-500/50 mb-2">The Endgame</p>
            <h2 className="text-2xl font-black text-white">Prestige. Five times.</h2>
            <p className="text-sm text-white/35 mt-2 max-w-sm mx-auto">Complete your collection, prestige, and choose one NBA legend for your Starting Five. Do it five times to reach the Hall of Fame.</p>
          </div>

          <div className="flex items-stretch gap-0">
            {PRESTIGE_STEPS.map((s, i) => {
              const isLast = i === PRESTIGE_STEPS.length - 1
              return (
                <div key={s.roman} className={`flex-1 flex flex-col items-center text-center ${i < PRESTIGE_STEPS.length - 1 ? 'border-r border-white/[0.06]' : ''}`}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black mb-2 mx-auto"
                    style={isLast
                      ? { background: 'linear-gradient(135deg,#b8860b,#FFD700,#daa520)', color: '#1a1400', boxShadow: '0 0 16px rgba(251,191,36,0.4)' }
                      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(251,191,36,0.7)', border: '1px solid rgba(251,191,36,0.2)' }}
                  >
                    {s.roman}
                  </div>
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-0.5">{s.pos}</p>
                  <p className="text-[8px] text-white/20 leading-tight px-1">{s.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── HALL OF FAME ─────────────────────────────────────────────────── */}
      <section className="bg-[#fafaf7] px-6 py-16 max-w-4xl mx-auto anim-3">
        <div className="flex items-center gap-5 mb-10">
          <div className="flex-1 h-px bg-[#1a1714]/[0.06]" />
          <div className="text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.5em] text-amber-600/50 mb-1">Prestige V</p>
            <h2
              className="text-xl font-black uppercase tracking-widest"
              style={{ background: 'linear-gradient(135deg,#b8860b,#FFD700,#daa520)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Hall of Fame
            </h2>
          </div>
          <div className="flex-1 h-px bg-[#1a1714]/[0.06]" />
        </div>

        {hofLoading && (
          <div className="text-[#1a1714]/20 text-sm text-center py-8">Loading...</div>
        )}

        {!hofLoading && inductees.length === 0 && (
          <div className="text-center py-14 border-2 border-dashed border-[#1a1714]/[0.07] rounded-2xl">
            <div
              className="text-4xl font-black uppercase tracking-widest mb-2"
              style={{ background: 'linear-gradient(135deg,#b8860b,#FFD700,#daa520)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', opacity: 0.25 }}
            >
              ♛
            </div>
            <p className="text-[#1a1714]/30 font-black text-xs uppercase tracking-widest mb-1">No Inductees Yet</p>
            <p className="text-[#1a1714]/20 text-xs">Be the first to complete your Starting Five.</p>
          </div>
        )}

        {!hofLoading && inductees.length > 0 && (
          <div className="divide-y divide-[#1a1714]/[0.05]">
            {inductees.map(inductee => {
              const isOpen = expandedId === inductee.id
              return (
                <div key={inductee.id}>
                  <button
                    onClick={() => setExpandedId(isOpen ? null : inductee.id)}
                    className="w-full flex items-center gap-4 py-4 px-3 text-left group hover:bg-amber-50/50 rounded-xl transition-colors"
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#1a1714]/20 w-6 text-right flex-shrink-0">
                      {ordinal(inductee.inductee_number)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span
                        className="font-black text-base tracking-tight"
                        style={{ background: 'linear-gradient(135deg,#b8860b,#daa520)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                      >
                        {inductee.username}
                      </span>
                    </div>
                    <span className="text-[9px] text-[#1a1714]/25 uppercase tracking-wider flex-shrink-0">
                      {new Date(inductee.inducted_at).toLocaleDateString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[#1a1714]/20 text-xs flex-shrink-0 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </button>

                  {isOpen && (
                    <div className="pb-6 px-3">
                      <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                        <div className="flex gap-3 pb-1" style={{ minWidth: 'max-content' }}>
                          {([1, 2, 3, 4, 5] as const).map(slot => {
                            const member = inductee.starting_five.find(m => m.slot === slot)
                            const posLabel = ['PG', 'SG', 'SF', 'PF', 'C'][slot - 1]
                            return (
                              <div key={slot} className="flex flex-col items-center gap-1.5">
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#1a1714]/25">{posLabel}</span>
                                {member ? (
                                  <div className="w-24">
                                    <LegendCard legend={member.legend} prestigeNum={slot} />
                                  </div>
                                ) : (
                                  <div className="w-24 rounded-xl border border-[#1a1714]/[0.07] bg-[#1a1714]/[0.02]" style={{ aspectRatio: '5/7' }} />
                                )}
                                {member && (
                                  <p className="text-[7px] font-black text-amber-700/60 text-center max-w-[96px] truncate">{member.legend.name}</p>
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

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1a1714]/[0.06] py-8 px-6 text-center bg-[#fafaf7] space-y-2">
        <p className="text-[10px] text-[#1a1714]/20 uppercase tracking-widest">
          CardPicks · NBA Prediction Game · {new Date().getFullYear()}
        </p>
        <p className="text-[10px] text-[#1a1714]/30">
          <Link href="/terms" className="hover:text-[#1a1714]/60 transition-colors">Terms of Service</Link>
        </p>
      </footer>
    </div>
  )
}
