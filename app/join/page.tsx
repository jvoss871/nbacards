'use client'

import { useState } from 'react'

const TEASERS = [
  {
    label: 'Open Packs',
    body: 'Bronze to Platinum. Pull real NBA players, build a roster only you own.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2"/>
      </svg>
    ),
  },
  {
    label: 'Call Your Shot',
    body: 'Wager a card on real NBA games. Win, and its multiplier pays out. Lose, and you might lose the card.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    label: 'Prove It in Trivia',
    body: '15 questions, daily. Bank credits at checkpoints or push for the jackpot.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5"/>
      </svg>
    ),
  },
]

export default function JoinPage() {
  const [email, setEmail] = useState('')
  const [wantsBeta, setWantsBeta] = useState(true)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, wantsBeta }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong')
        setStatus('error')
        return
      }
      setStatus('done')
    } catch {
      setErrorMsg('Something went wrong')
      setStatus('error')
    }
  }

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
        .anim-1 { animation: fadeUp 0.55s ease-out 0.2s both; }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #03080f 0%, #050d1f 55%, #0a1428 100%)' }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_-10%,rgba(251,191,36,0.12),transparent_65%)] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(#fbbf24 1px, transparent 1px), linear-gradient(90deg, #fbbf24 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #FFD700 30%, #FFD700 70%, transparent)' }} />

        <div className="relative max-w-lg mx-auto px-6 pt-16 pb-20 text-center anim-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nba.png&h=200&w=200"
            alt="NBA"
            className="w-16 h-16 object-contain mx-auto mb-5 opacity-85"
          />

          <p className="text-[9px] font-black uppercase tracking-[0.45em] text-amber-500/60 mb-3">Before Tip-Off</p>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-none uppercase mb-4">
            <span style={{
              background: 'linear-gradient(90deg, #b8860b, #FFD700, #f59e0b, #FFD700, #b8860b)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 6s linear infinite',
            }}>Card</span>
            <span className="text-white">Picks</span>
          </h1>

          <p className="text-base sm:text-lg text-white/55 font-medium leading-relaxed max-w-sm mx-auto mb-9">
            The NBA card game where your knowledge builds your roster. Get in before the season does.
          </p>

          {status === 'done' ? (
            <div className="max-w-sm mx-auto rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-6 py-7">
              <p className="text-amber-300 font-black text-sm uppercase tracking-widest mb-1.5">You&apos;re on the list</p>
              <p className="text-white/45 text-xs leading-relaxed">We&apos;ll email you the second doors open. Tell a friend — bigger launch, better packs.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-sm mx-auto">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 px-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder-white/25 text-sm focus:outline-none focus:border-amber-400/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="px-6 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 whitespace-nowrap"
                  style={{ background: 'linear-gradient(90deg, #b8860b, #FFD700, #daa520)', color: '#1a1400', boxShadow: '0 0 24px rgba(251,191,36,0.25)' }}
                >
                  {status === 'loading' ? 'Joining…' : 'Join'}
                </button>
              </div>

              <label className="flex items-center justify-center gap-2 mt-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={wantsBeta}
                  onChange={e => setWantsBeta(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-amber-400"
                />
                <span className="text-white/40 text-xs">Count me in for early beta access</span>
              </label>

              {status === 'error' && (
                <p className="text-red-400 text-xs mt-3">{errorMsg}</p>
              )}
            </form>
          )}
        </div>
      </section>

      {/* ── WHAT'S COMING ────────────────────────────────────────────────── */}
      <section className="bg-[#fafaf7] px-6 py-14 max-w-4xl mx-auto anim-1">
        <div className="text-center mb-9">
          <p className="text-[9px] font-black uppercase tracking-[0.45em] text-amber-600/60 mb-2">What You&apos;re Getting Into</p>
          <h2 className="text-xl font-black text-[#1a1714]">Three ways to earn. One goal.</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TEASERS.map(t => (
            <div key={t.label} className="bg-white border border-[#e2ddd6] rounded-2xl p-5">
              <div className="w-8 h-8 rounded-xl bg-[#f0ede8] flex items-center justify-center text-amber-600 mb-3">
                {t.icon}
              </div>
              <h3 className="text-sm font-black text-[#1a1714] mb-1.5">{t.label}</h3>
              <p className="text-[11px] text-[#a39890] leading-relaxed">{t.body}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-[10px] text-[#a39890]/70 uppercase tracking-widest mt-10">
          No spam. One email when doors open.
        </p>
        <p className="text-center text-[10px] text-[#a39890]/50 mt-3">
          <a href="/terms" className="hover:text-[#a39890] transition-colors">Terms of Service</a>
        </p>
      </section>
    </div>
  )
}
