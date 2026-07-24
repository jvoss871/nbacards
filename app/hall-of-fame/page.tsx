'use client'

import { useEffect, useState } from 'react'
import { LegendCard } from '@/components/LegendCard'
import type { LegendData } from '@/components/LegendCard'

interface StartingFiveMember {
  slot: number
  position: string
  legend: LegendData & { id: string; prestige_required: number }
}

interface Inductee {
  id: string
  user_id: string
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

const POS_SHORT: Record<number, string> = { 1: 'PG', 2: 'SG', 3: 'SF', 4: 'PF', 5: 'C' }

function InducteeList({ inductees }: { inductees: Inductee[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="divide-y divide-white/[0.04]">
      {inductees.map((inductee, idx) => {
        const isOpen = expandedId === inductee.id
        return (
          <div
            key={inductee.id}
            style={{ animation: `hofFadeUp 0.4s ease-out ${idx * 0.06}s both` }}
          >
            {/* Compact row */}
            <button
              onClick={() => setExpandedId(isOpen ? null : inductee.id)}
              className="w-full flex items-center gap-4 py-4 px-2 text-left group transition-colors hover:bg-white/[0.02] rounded-lg"
            >
              <span className="text-amber-400/20 text-[10px] font-black uppercase tracking-widest w-7 text-right flex-shrink-0">
                {ordinal(inductee.inductee_number)}
              </span>

              <div className="flex-1 min-w-0">
                <span
                  className="text-base font-black tracking-tight group-hover:opacity-100 transition-opacity"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    opacity: 0.85,
                  }}
                >
                  {inductee.username}
                </span>
              </div>

              <span className="text-[10px] text-white/20 uppercase tracking-wider flex-shrink-0">
                {new Date(inductee.inducted_at).toLocaleDateString('en-US', {
                  timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric',
                })}
              </span>

              <span
                className="text-white/20 text-xs transition-transform duration-200 flex-shrink-0"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
              >
                ▾
              </span>
            </button>

            {/* Expandable Starting Five */}
            {isOpen && (
              <div className="pb-6 px-2">
                <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  <div className="flex gap-3 pb-1" style={{ minWidth: 'max-content' }}>
                    {([1, 2, 3, 4, 5] as const).map(slot => {
                      const member = inductee.starting_five.find(m => m.slot === slot)
                      return (
                        <div key={slot} className="flex flex-col items-center gap-1.5">
                          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-amber-400/30">
                            {POS_SHORT[slot]}
                          </span>
                          {member ? (
                            <div className="w-24">
                              <LegendCard legend={member.legend} prestigeNum={slot} />
                            </div>
                          ) : (
                            <div className="w-24 aspect-[5/7] rounded-xl border border-amber-400/10 bg-white/[0.02] flex items-center justify-center">
                              <span className="text-amber-400/20 text-lg">?</span>
                            </div>
                          )}
                          {member && (
                            <div className="text-[7px] font-black text-amber-300/50 text-center max-w-[96px] truncate">
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
  )
}

export default function HallOfFamePage() {
  const [inductees, setInductees] = useState<Inductee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.body.style.background = '#040b15'
    return () => { document.body.style.background = '' }
  }, [])

  useEffect(() => {
    fetch('/api/hall-of-fame')
      .then(r => r.json())
      .then(d => { setInductees(d.inductees ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="-mx-4 -my-6 min-h-screen bg-[#040b15] text-white">
      <style>{`
        @keyframes hofAura {
          0%,100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes hofFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hofShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_20%,rgba(251,191,36,0.07),transparent_65%)]" />
        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Hero */}
      <div className="relative z-10 pt-16 pb-12 text-center px-4">
        <p className="text-[9px] font-black uppercase tracking-[0.6em] text-amber-400/30 mb-5">
          CardPicks · Prestige V
        </p>
        <h1
          className="text-5xl sm:text-7xl font-black tracking-tight leading-none uppercase"
          style={{
            background: 'linear-gradient(90deg, #78350f, #fbbf24, #f59e0b, #fbbf24, #78350f)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'hofShimmer 4s linear infinite',
          }}
        >
          Hall of Fame
        </h1>
        <p className="mt-5 text-white/25 text-sm font-medium max-w-sm mx-auto leading-relaxed">
          These players assembled a perfect Starting Five, one legend at each position, and achieved Prestige V.
        </p>

        {/* Decorative divider */}
        <div className="flex items-center gap-4 max-w-xs mx-auto mt-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-400/20" />
          <span className="text-amber-400/30 text-xs">★</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-400/20" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 pb-20">

        {loading && (
          <div className="text-white/20 text-sm text-center py-16">Loading...</div>
        )}

        {!loading && inductees.length === 0 && (
          <div className="text-center py-20">
            <div
              className="text-7xl mb-6 select-none"
              style={{ animation: 'hofAura 3s ease-in-out infinite' }}
            >
              🏆
            </div>
            <div className="text-white/30 font-black text-xl uppercase tracking-widest mb-3">
              Awaiting the First Inductee
            </div>
            <div className="text-white/15 text-sm max-w-xs mx-auto">
              Complete your Starting Five by reaching Prestige V to be enshrined forever.
            </div>
          </div>
        )}

        {!loading && inductees.length > 0 && (
          <InducteeList inductees={inductees} />
        )}
      </div>
    </div>
  )
}
