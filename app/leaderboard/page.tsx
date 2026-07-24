'use client'

import { useEffect, useState } from 'react'
import { PrestigeAvatar, ROMAN } from '@/components/PrestigeAvatar'
import { LegendCard } from '@/components/LegendCard'
import { useLockBodyScroll } from '@/lib/use-lock-body-scroll'

interface Entry {
  userId: string
  username: string
  prestigeLevel: number
  totalCorrect: number
  sessions: number
  perfectGames: number
}

interface ProfileData {
  username: string
  prestigeLevel: number
  earnedLegends: { prestige_number: number; legend: { name: string; era: string; position: string; image_url?: string | null; bio: string } }[]
  trophyIds: string[]
  allTime: {
    picks: number
    correctPicks: number
    settledPicks: number
    triviaSessions: number
    triviaWins: number
    triviaCorrect: number
  }
}

const TROPHY_META: Record<string, { name: string; icon: string }> = {
  platinum_club:  { name: 'Platinum Club',  icon: '💎' },
  vaulted:        { name: 'Vaulted',         icon: '🔐' },
  century:        { name: 'Century',         icon: '📦' },
  all30:          { name: 'All 30',          icon: '🌍' },
  obsessed:       { name: 'Obsessed',        icon: '🪞' },
  deep_run:       { name: 'Deep Run',        icon: '📈' },
  perfect:        { name: 'Perfect Game',    icon: '🏆' },
  pure:           { name: 'Purist',          icon: '⚡' },
  legend:         { name: 'Legend',          icon: '👑' },
  encyclopedic:   { name: 'Encyclopedic',    icon: '🧠' },
  sharp:          { name: 'Sharp',           icon: '🎯' },
  on_fire:        { name: 'On Fire',         icon: '🔥' },
  precision:      { name: 'Precision',       icon: '📐' },
  centurion:      { name: 'Centurion',       icon: '⚔️' },
  underdog:       { name: 'Underdog',        icon: '🐕' },
  perfect_day:    { name: 'Perfect Day',     icon: '☀️' },
  mogul:          { name: 'Mogul',           icon: '💰' },
  dynasty:        { name: 'Dynasty',         icon: '🏛️' },
  completionist:  { name: 'Completionist',   icon: '🎖️' },
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'long', year: 'numeric' })
}

function nowET(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
}

function resetLabel() {
  const now = nowET()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const diff = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return `${diff} day${diff === 1 ? '' : 's'} left`
}

function ProfileModal({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  useLockBodyScroll()
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/profile/${entry.userId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [entry.userId])

  const winRate = data && data.allTime.settledPicks > 0
    ? Math.round((data.allTime.correctPicks / data.allTime.settledPicks) * 100)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
        style={{ background: 'linear-gradient(180deg, #0d1321 0%, #080d18 100%)', border: '1px solid rgba(251,191,36,0.12)' }}>

        {/* Gold top line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

        {/* Header */}
        <div className="flex items-center gap-4 px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <PrestigeAvatar level={entry.prestigeLevel} />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-white truncate">{entry.username}</h2>
            <p className="text-xs text-white/60">
              {entry.prestigeLevel > 0 ? `Prestige ${ROMAN[entry.prestigeLevel - 1]}` : 'Rookie'}
            </p>
          </div>
          <button onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* This month */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400/50 mb-3">This Month</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-black text-amber-400 tabular-nums">{entry.totalCorrect}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mt-0.5">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-black text-white tabular-nums">{entry.sessions}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mt-0.5">Games</div>
              </div>
              <div>
                <div className="text-2xl font-black tabular-nums">
                  {entry.perfectGames > 0
                    ? <span className="text-amber-400">{entry.perfectGames}</span>
                    : <span className="text-white/30">0</span>}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mt-0.5">Perfect</div>
              </div>
            </div>
          </div>

          {loading && (
            <div className="py-8 text-center text-white/50 text-sm">Loading...</div>
          )}

          {!loading && data && (
            <>
              {/* All-time stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-3">Trivia</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Games',   val: data.allTime.triviaSessions },
                      { label: 'Wins',    val: data.allTime.triviaWins,    gold: true },
                      { label: 'Correct', val: data.allTime.triviaCorrect },
                    ].map(({ label, val, gold }) => (
                      <div key={label} className="flex justify-between items-baseline">
                        <span className="text-[10px] text-white/30">{label}</span>
                        <span className={`text-sm font-black tabular-nums ${gold ? 'text-amber-400' : 'text-white/80'}`}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-3">Picks</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Total',    val: data.allTime.picks },
                      { label: 'Correct',  val: data.allTime.correctPicks, gold: true },
                      { label: 'Win Rate', val: winRate !== null ? `${winRate}%` : '-' },
                    ].map(({ label, val, gold }) => (
                      <div key={label} className="flex justify-between items-baseline">
                        <span className="text-[10px] text-white/30">{label}</span>
                        <span className={`text-sm font-black tabular-nums ${gold ? 'text-amber-400' : 'text-white/80'}`}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Starting Five */}
              {data.earnedLegends.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-3">
                    Starting Five
                    <span className="ml-2 text-white/15 font-semibold normal-case tracking-normal">{data.earnedLegends.length} / 5</span>
                  </p>
                  <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    <div className="flex gap-3 pb-1" style={{ minWidth: 'max-content' }}>
                      {data.earnedLegends.map(ul => (
                        <div key={ul.prestige_number} className="w-24 flex-shrink-0">
                          <LegendCard legend={ul.legend} prestigeNum={ul.prestige_number} className="w-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Trophies */}
              {data.trophyIds.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-3">
                    Trophies
                    <span className="ml-2 text-white/15 font-semibold normal-case tracking-normal">{data.trophyIds.length} earned</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.trophyIds.map(id => {
                      const meta = TROPHY_META[id]
                      if (!meta) return null
                      return (
                        <div key={id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
                          <span className="text-sm leading-none">{meta.icon}</span>
                          <span className="text-[10px] font-black text-amber-300/70">{meta.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}


export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [month, setMonth] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => {
        setEntries(d.entries ?? [])
        setMonth(d.month ?? '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])


  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <style>{`
        @keyframes lbShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes lbFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Hero */}
      <div className="text-center pt-6 pb-2">
        <p className="text-[9px] font-black uppercase tracking-[0.6em] text-amber-600/60 mb-3">
          CardPicks · Monthly
        </p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none uppercase"
          style={{
            background: 'linear-gradient(90deg, #78350f, #fbbf24, #f59e0b, #fbbf24, #78350f)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'lbShimmer 4s linear infinite',
          }}>
          Leaderboard
        </h1>

        {month && (
          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="text-xs text-[#6b6259]">{monthLabel(month)}</span>
            <span className="w-px h-3 bg-[#d4cfc9]" />
            <span className="text-xs text-[#a39890]">{resetLabel()}</span>
          </div>
        )}

        {/* Prize strip */}
        <div className="flex items-center justify-center gap-8 mt-5">
          {[
            { place: '1st', amt: '5,000 cr', color: 'text-amber-600' },
            { place: '2nd', amt: '2,500 cr', color: 'text-[#6b6259]' },
            { place: '3rd', amt: '1,000 cr', color: 'text-orange-500' },
          ].map(p => (
            <div key={p.place} className="text-center">
              <div className={`text-[10px] font-black uppercase tracking-widest ${p.color}`}>{p.place}</div>
              <div className="text-xs font-black text-[#1a1714] mt-0.5">{p.amt}</div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 max-w-xs mx-auto mt-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-400/30" />
          <span className="text-amber-500/50 text-[10px]">★</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-400/30" />
        </div>
      </div>

      {loading && (
        <div className="text-[#a39890] text-sm text-center py-16">Loading...</div>
      )}

      {!loading && entries.length === 0 && (
        <div className="text-center py-16">
          <div className="text-[#1a1714]/20 font-black text-xl uppercase tracking-widest mb-2">No entries yet</div>
          <div className="text-[#c8c2b8] text-sm">Play trivia to get on the board.</div>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="bg-white border border-[#e2ddd6] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-2.5 flex items-center justify-between border-b border-[#f0ede8]">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#a39890]">Rankings</p>
            <p className="text-[9px] text-[#1a1714]">Total correct answers</p>
          </div>
          <div className="divide-y divide-[#f0ede8]">
            {entries.map((e, i) => {
              const place = i + 1
              const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : null
              const usernameColor = place === 1 ? 'text-amber-600' : 'text-[#1a1714]'
              const scoreColor = place === 1 ? 'text-amber-600' : 'text-[#1a1714]'
              return (
                <button
                  key={e.userId}
                  onClick={() => setSelectedEntry(e)}
                  style={{ animation: `lbFadeUp 0.35s ease-out ${i * 0.04}s both` }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-[#faf9f6] transition-colors"
                >
                  <div className="w-6 text-center flex-shrink-0">
                    {medal
                      ? <span className="text-base leading-none">{medal}</span>
                      : <span className="text-[10px] font-black text-[#c8c2b8] tabular-nums">{place}</span>}
                  </div>
                  <PrestigeAvatar level={e.prestigeLevel} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-black truncate ${usernameColor}`}>{e.username}</p>
                    <p className="text-[10px] text-[#a39890]">
                      {e.sessions} game{e.sessions !== 1 ? 's' : ''}
                      {e.perfectGames > 0 && (
                        <span className="text-amber-600 font-black ml-1.5">· {e.perfectGames} perfect</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-black tabular-nums ${scoreColor}`}>{e.totalCorrect}</p>
                    <p className="text-[8px] text-[#1a1714] uppercase tracking-widest">correct</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selectedEntry && (
        <ProfileModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  )
}
