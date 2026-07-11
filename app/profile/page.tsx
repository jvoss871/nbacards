'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase, USER_ID } from '@/lib/supabase'
import { useCredits } from '@/lib/credits-context'
import { ProfileSkeleton } from '@/components/Skeleton'
import type { Prediction, Tier } from '@/lib/types'
import { PAYOUTS } from '@/lib/trivia-logic'
import { PrestigeAvatar, ROMAN } from '@/components/PrestigeAvatar'

// ── Local types ──────────────────────────────────────────────────────────────

interface CardCount { tier: Tier; count: number }
interface CardRow { quantity: number; player: { id: string; tier: Tier; team_abbr: string } | null }
interface TriviaSession {
  status: string
  current_step: number
  credits_floor: number
  lifeline_fifty_used: boolean
  lifeline_phone_used: boolean
  lifeline_audience_used: boolean
}

interface Legend {
  id: string
  name: string
  era: string
  position: string
  image_url: string | null
  prestige_required: number
  bio: string
}

interface UserLegend {
  prestige_number: number
  earned_at: string
  legend: Legend
}

interface TrophyStats {
  totalCards: number
  uniqueTeams: number
  platinumCount: number
  maxDuplicates: number
  totalCorrectPicks: number
  totalPicks: number
  settledPicks: number
  correctPickRate: number
  pickStreak: number
  triviaWins: number
  hasReachedQ10: boolean
  hasPureWin: boolean
  totalCorrectTrivia: number
  totalEarned: number
  unlockedCount: number
}

// ── Constants ────────────────────────────────────────────────────────────────

type Difficulty = 'hard' | 'very_hard' | 'prestige'


const DIFF_STYLE: Record<Difficulty, { earned: string; bar: string; label: string; labelColor: string }> = {
  hard:      { earned: 'bg-amber-50 border-amber-300',  bar: 'bg-amber-400',  label: 'Hard',      labelColor: 'text-amber-500' },
  very_hard: { earned: 'bg-indigo-50 border-indigo-300', bar: 'bg-indigo-400', label: 'Very Hard', labelColor: 'text-indigo-400' },
  prestige:  { earned: 'bg-cyan-50 border-cyan-300',    bar: 'bg-cyan-400',   label: 'Prestige',  labelColor: 'text-cyan-500' },
}

// ── Achievement definitions ──────────────────────────────────────────────────

interface AchievementDef {
  id: string
  name: string
  description: string
  icon: string
  category: 'Collection' | 'Trivia' | 'Picks' | 'Prestige'
  difficulty: Difficulty
  check: (s: TrophyStats) => boolean
  progress?: (s: TrophyStats) => { current: number; total: number }
}

const ACHIEVEMENTS_BASE: AchievementDef[] = [
  // Collection
  { id: 'platinum_club', name: 'Platinum Club',  description: 'Own your first Platinum card',           icon: '💎', category: 'Collection', difficulty: 'hard',      check: s => s.platinumCount >= 1,    progress: s => ({ current: Math.min(s.platinumCount, 1), total: 1 }) },
  { id: 'vaulted',       name: 'Vaulted',        description: 'Own 5 Platinum cards',                   icon: '🔐', category: 'Collection', difficulty: 'very_hard', check: s => s.platinumCount >= 5,    progress: s => ({ current: Math.min(s.platinumCount, 5), total: 5 }) },
  { id: 'century',       name: 'Century',        description: 'Own 100 cards',                          icon: '📦', category: 'Collection', difficulty: 'hard',      check: s => s.totalCards >= 100,     progress: s => ({ current: Math.min(s.totalCards, 100), total: 100 }) },
  { id: 'all30',         name: 'All 30',         description: 'Own a player from all 30 NBA teams',     icon: '🌍', category: 'Collection', difficulty: 'very_hard', check: s => s.uniqueTeams >= 30,     progress: s => ({ current: Math.min(s.uniqueTeams, 30), total: 30 }) },
  { id: 'obsessed',      name: 'Obsessed',       description: 'Own 5 copies of the same player',        icon: '🪞', category: 'Collection', difficulty: 'hard',      check: s => s.maxDuplicates >= 5 },
  // Trivia
  { id: 'deep_run',      name: 'Deep Run',       description: 'Reach question 10 in a trivia game',     icon: '📈', category: 'Trivia',     difficulty: 'hard',      check: s => s.hasReachedQ10 },
  { id: 'perfect',       name: 'Perfect Game',   description: 'Answer all 15 trivia questions correctly',icon: '🏆', category: 'Trivia',     difficulty: 'very_hard', check: s => s.triviaWins >= 1 },
  { id: 'pure',          name: 'Purist',         description: 'Win trivia without using any lifelines',  icon: '⚡', category: 'Trivia',     difficulty: 'very_hard', check: s => s.hasPureWin },
  { id: 'legend',        name: 'Legend',         description: 'Win trivia 5 times',                     icon: '👑', category: 'Trivia',     difficulty: 'prestige',  check: s => s.triviaWins >= 5,       progress: s => ({ current: Math.min(s.triviaWins, 5), total: 5 }) },
  { id: 'encyclopedic',  name: 'Encyclopedic',   description: 'Answer 100 trivia questions correctly',   icon: '🧠', category: 'Trivia',     difficulty: 'hard',      check: s => s.totalCorrectTrivia >= 100, progress: s => ({ current: Math.min(s.totalCorrectTrivia, 100), total: 100 }) },
  // Picks
  { id: 'sharp',         name: 'Sharp',          description: 'Get 25 correct picks',                   icon: '🎯', category: 'Picks',      difficulty: 'hard',      check: s => s.totalCorrectPicks >= 25, progress: s => ({ current: Math.min(s.totalCorrectPicks, 25), total: 25 }) },
  { id: 'on_fire',       name: 'On Fire',        description: '5 correct picks in a row',               icon: '🔥', category: 'Picks',      difficulty: 'hard',      check: s => s.pickStreak >= 5 },
  { id: 'precision',     name: 'Precision',      description: '70%+ win rate across 30+ settled picks',  icon: '📐', category: 'Picks',      difficulty: 'very_hard', check: s => s.settledPicks >= 30 && s.correctPickRate >= 0.70 },
  { id: 'centurion',     name: 'Centurion',      description: 'Make 100 total picks',                   icon: '⚔️', category: 'Picks',      difficulty: 'hard',      check: s => s.totalPicks >= 100,     progress: s => ({ current: Math.min(s.totalPicks, 100), total: 100 }) },
  // Prestige
  { id: 'mogul',         name: 'Mogul',          description: 'Earn 10,000 credits all-time',            icon: '💰', category: 'Prestige',   difficulty: 'very_hard', check: s => s.totalEarned >= 10000,  progress: s => ({ current: Math.min(s.totalEarned, 10000), total: 10000 }) },
  { id: 'dynasty',       name: 'Dynasty',        description: 'Own 5 Platinum cards and win trivia 3×', icon: '🏛️', category: 'Prestige',   difficulty: 'prestige',  check: s => s.platinumCount >= 5 && s.triviaWins >= 3 },
]

const ACHIEVEMENTS: AchievementDef[] = [
  ...ACHIEVEMENTS_BASE,
  { id: 'completionist', name: 'Completionist',  description: 'Unlock 10 other trophies',               icon: '🎖️', category: 'Prestige',   difficulty: 'prestige',  check: s => s.unlockedCount >= 10,   progress: s => ({ current: Math.min(s.unlockedCount, 10), total: 10 }) },
]

const CATEGORIES = ['Collection', 'Trivia', 'Picks', 'Prestige'] as const

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { credits } = useCredits()
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [cardCounts, setCardCounts] = useState<CardCount[]>([])
  const [cardRows, setCardRows] = useState<CardRow[]>([])
  const [triviaSessions, setTriviaSessions] = useState<TriviaSession[]>([])
  const [draftEarned, setDraftEarned] = useState(0)
  const [prestigeLevel, setPrestigeLevel] = useState(0)
  const [earnedLegends, setEarnedLegends] = useState<UserLegend[]>([])
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string | null>(null)
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(CATEGORIES)
  )

  async function saveUsername() {
    const name = usernameInput.trim()
    if (!name || name === username) { setEditingUsername(false); return }
    setSavingUsername(true)
    const res = await fetch('/api/user/username', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name }),
    })
    if (res.ok) setUsername(name)
    setEditingUsername(false)
    setSavingUsername(false)
  }

  useEffect(() => {
    async function load() {
      const [predsRes, cardsRes, triviaData, prestigeData, draftRes] = await Promise.all([
        supabase.from('predictions').select('*').eq('user_id', USER_ID),
        supabase.from('user_cards').select('quantity, player:players(id, tier, team_abbr)').eq('user_id', USER_ID),
        fetch('/api/trivia/history').then(r => r.json()),
        fetch('/api/prestige').then(r => r.json()),
        supabase.from('draft_boards').select('credits_earned').eq('user_id', USER_ID).eq('status', 'scored'),
      ])

      setDraftEarned((draftRes.data ?? []).reduce((s, b) => s + (b.credits_earned ?? 0), 0))
      setPredictions(predsRes.data ?? [])
      setTriviaSessions(Array.isArray(triviaData) ? triviaData : [])
      setPrestigeLevel(prestigeData.prestigeLevel ?? 0)
      setEarnedLegends((prestigeData.earnedLegends ?? []) as unknown as UserLegend[])
      const uname = (prestigeData.username as string | null) ?? null
      setUsername(uname)
      setUsernameInput(uname ?? '')

      const rows = (cardsRes.data ?? []) as unknown as CardRow[]
      setCardRows(rows)

      const counts: Record<string, number> = {}
      for (const row of rows) {
        const tier = row.player?.tier ?? 'bronze'
        counts[tier] = (counts[tier] ?? 0) + row.quantity
      }
      const order: Tier[] = ['platinum', 'gold', 'silver', 'bronze']
      setCardCounts(order.filter(t => counts[t]).map(t => ({ tier: t, count: counts[t] })))

      setLoading(false)
    }
    load()
  }, [])

  const settled  = predictions.filter(p => p.status !== 'pending')
  const correct  = predictions.filter(p => p.status === 'correct')
  const pending  = predictions.filter(p => p.status === 'pending')
  const winRate  = settled.length > 0 ? Math.round((correct.length / settled.length) * 100) : null
  const pickEarned   = correct.reduce((s, p) => s + (p.credits_earned ?? 0), 0)
  const triviaEarned = triviaSessions
    .filter(t => t.status !== 'active')
    .reduce((s, t) => {
      if (t.status === 'won') return s + PAYOUTS[15]
      return s + (t.credits_floor ?? 0)
    }, 0)
  const earned     = pickEarned + triviaEarned + draftEarned
  const totalCards = cardCounts.reduce((s, c) => s + c.count, 0)

  void pending

  const teamPlayerSets = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    for (const row of cardRows) {
      if (!row.player) continue
      const abbr = row.player.team_abbr
      if (!map[abbr]) map[abbr] = new Set()
      map[abbr].add(row.player.id)
    }
    return map
  }, [cardRows])

  const trophyStats = useMemo((): TrophyStats => {
    const settledSorted = [...predictions]
      .filter(p => p.status !== 'pending')
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
    let pickStreak = 0, cur = 0
    for (const p of settledSorted) {
      if (p.status === 'correct') { pickStreak = Math.max(pickStreak, ++cur) } else cur = 0
    }

    const base = {
      totalCards,
      uniqueTeams:       Object.keys(teamPlayerSets).length,
      platinumCount:     cardCounts.find(c => c.tier === 'platinum')?.count ?? 0,
      maxDuplicates:     Math.max(0, ...cardRows.map(r => r.quantity)),
      totalCorrectPicks: correct.length,
      totalPicks:        predictions.length,
      settledPicks:      settled.length,
      correctPickRate:   settled.length > 0 ? correct.length / settled.length : 0,
      pickStreak,
      triviaWins:        triviaSessions.filter(s => s.status === 'won').length,
      hasReachedQ10:     triviaSessions.some(s => s.current_step >= 10),
      hasPureWin:        triviaSessions.some(s =>
                           s.status === 'won' &&
                           !s.lifeline_fifty_used &&
                           !s.lifeline_phone_used &&
                           !s.lifeline_audience_used
                         ),
      totalCorrectTrivia: triviaSessions.reduce((sum, s) => sum + (s.current_step ?? 0), 0),
      totalEarned:       earned,
      unlockedCount:     0,
    }
    const unlockedCount = ACHIEVEMENTS_BASE.filter(a => a.check(base)).length
    return { ...base, unlockedCount }
  }, [totalCards, teamPlayerSets, cardCounts, cardRows, correct, predictions, settled, triviaSessions, earned])

  const earnedCount = ACHIEVEMENTS.filter(a => a.check(trophyStats)).length

  if (loading) return <ProfileSkeleton />

  return (
    <>

    {/* ── Identity header — full width above columns ── */}
    <div className="flex items-center gap-4 mb-6">
      <PrestigeAvatar level={prestigeLevel} />
      <div className="flex-1 min-w-0">
        {editingUsername ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={usernameInput}
              onChange={e => setUsernameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') setEditingUsername(false) }}
              onBlur={saveUsername}
              maxLength={32}
              className="text-lg font-black text-[#1a1714] bg-[#f0ede8] border border-[#e2ddd6] rounded-lg px-2 py-0.5 w-full focus:outline-none focus:border-amber-400"
              placeholder="Enter username"
            />
            {savingUsername && <span className="text-[#a39890] text-xs">Saving...</span>}
          </div>
        ) : (
          <button
            onClick={() => { setUsernameInput(username ?? ''); setEditingUsername(true) }}
            className="flex items-center gap-2 group text-left"
          >
            <h1 className="text-xl font-black text-[#1a1714] truncate">
              {username ?? 'Set username'}
            </h1>
            <span className="text-[#c8c2b8] group-hover:text-[#a39890] text-xs transition-colors flex-shrink-0">✎</span>
          </button>
        )}
        <p className="text-[#a39890] text-sm">
          {prestigeLevel > 0 ? `Prestige ${ROMAN[prestigeLevel - 1]} · Your stats` : 'Your stats and trophies'}
        </p>
      </div>
    </div>

    {/* ── Two-column layout — stats + trophies ── */}
    <div className="flex gap-6 items-start">

    {/* ── Left column — stats ── */}
    <div className="flex flex-col gap-6 w-72 flex-shrink-0">

      {/* Credits */}
      <div className="bg-white border border-[#e2ddd6] rounded-2xl p-5 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-widest text-[#a39890] mb-1">Credits</div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-black text-amber-600 tabular-nums">
            {credits === null ? '—' : credits.toLocaleString()}
          </span>
          <span className="text-amber-500 text-sm font-semibold">credits</span>
        </div>
        <div className="text-[#a39890] text-xs mt-1">{earned.toLocaleString()} earned all-time</div>
      </div>

      {/* Pick stats */}
      <div className="bg-white border border-[#e2ddd6] rounded-2xl p-5 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-widest text-[#a39890] mb-4">Picks</div>
        <div className="grid grid-cols-3 gap-3">
          <Stat value={predictions.length} label="Picked" />
          <Stat value={correct.length} label="Correct" />
          <Stat value={winRate !== null ? `${winRate}%` : '—'} label="Win Rate" highlight />
        </div>
      </div>

      {/* Trivia stats */}
      {(() => {
        const completed = triviaSessions.filter(s => s.status !== 'active')
        const triviaWins = completed.filter(s => s.status === 'won').length
        const totalCorrect = triviaSessions.reduce((sum, s) => sum + (s.current_step ?? 0), 0)
        return (
          <div className="bg-white border border-[#e2ddd6] rounded-2xl p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-widest text-[#a39890] mb-4">Trivia</div>
            <div className="grid grid-cols-3 gap-3">
              <Stat value={completed.length} label="Games" />
              <Stat value={triviaWins} label="Wins" highlight />
              <Stat value={totalCorrect} label="Correct" />
            </div>
          </div>
        )
      })()}

    </div>{/* end left column */}

    {/* ── Right column — trophies ── */}
    <div className="flex-1 min-w-0">
      <div className="bg-white border border-[#e2ddd6] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-black uppercase tracking-widest text-[#1a1714]">Trophies</div>
          <span className="text-xs font-semibold text-[#a39890]">{earnedCount} / {ACHIEVEMENTS.length}</span>
        </div>
        <p className="text-[11px] text-[#c8c2b8] mb-6">No participation trophies. You actually have to earn these.</p>

        <div className="space-y-1">
          {CATEGORIES.map(cat => {
            const catAchievements = ACHIEVEMENTS.filter(a => a.category === cat)
            const catEarned = catAchievements.filter(a => a.check(trophyStats)).length
            const isOpen = !collapsedCategories.has(cat)
            const toggle = () => setCollapsedCategories(prev => {
              const next = new Set(prev)
              if (next.has(cat)) next.delete(cat); else next.add(cat)
              return next
            })
            return (
              <div key={cat} className="border border-[#ece8e3] rounded-xl overflow-hidden">
                {/* Category header — full-width button */}
                <button
                  onClick={toggle}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f8f6f3] transition-colors group"
                >
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#a39890]">{cat}</span>
                  <div className="flex-1 h-px bg-[#ece8e3]" />
                  {catEarned > 0 && (
                    <span className="text-[9px] font-black text-amber-600 tabular-nums">{catEarned} earned</span>
                  )}
                  <span className="text-[9px] font-semibold text-[#c8c2b8] tabular-nums">{catEarned}/{catAchievements.length}</span>
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    className={`flex-shrink-0 text-[#c8c2b8] group-hover:text-[#a39890] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Collapsible grid */}
                {isOpen && (
                  <div className="grid grid-cols-2 gap-2 p-3 pt-1">
                    {catAchievements.map(a => {
                      const isEarned = a.check(trophyStats)
                      const prog = a.progress?.(trophyStats)
                      const diff = DIFF_STYLE[a.difficulty]
                      return (
                        <div
                          key={a.id}
                          className={`rounded-xl p-3 border transition-colors ${
                            isEarned
                              ? `${diff.earned} border-2`
                              : 'bg-[#f8f6f3] border-[#ece8e3]'
                          }`}
                        >
                          <div className={`text-2xl mb-2 leading-none select-none ${isEarned ? '' : 'grayscale opacity-20'}`}>
                            {a.icon}
                          </div>
                          <div className={`text-[11px] font-black leading-snug ${isEarned ? 'text-[#1a1714]' : 'text-[#b8b2aa]'}`}>
                            {a.name}
                          </div>
                          <div className={`text-[10px] mt-0.5 leading-snug ${isEarned ? 'text-[#6b6259]' : 'text-[#d4cfc9]'}`}>
                            {a.description}
                          </div>
                          {!isEarned && prog && (
                            <div className="mt-2.5">
                              <div className="flex justify-between mb-1">
                                <span className="text-[9px] font-semibold text-[#c8c2b8] tabular-nums">
                                  {prog.current.toLocaleString()} / {prog.total.toLocaleString()}
                                </span>
                              </div>
                              <div className="h-[3px] bg-[#e2ddd6] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${diff.bar} opacity-50`}
                                  style={{ width: `${Math.max(2, (prog.current / prog.total) * 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                          <div className={`text-[8px] font-black uppercase tracking-widest mt-2 ${isEarned ? diff.labelColor : 'text-[#d4cfc9]'}`}>
                            {diff.label}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>{/* end trophies card */}
    </div>{/* end right column */}
    </div>{/* end two-column layout */}
    </>
  )
}


function Stat({ value, label, highlight }: { value: string | number; label: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-black tabular-nums ${highlight ? 'text-[#1a1714]' : 'text-[#1a1714]'}`}>
        {value}
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#a39890] mt-0.5">{label}</div>
    </div>
  )
}
