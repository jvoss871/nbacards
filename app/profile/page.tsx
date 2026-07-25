'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUserId } from '@/lib/use-user-id'
import { authedFetch } from '@/lib/authed-fetch'
import { useCredits } from '@/lib/credits-context'
import { ProfileSkeleton } from '@/components/Skeleton'
import type { Prediction, Tier } from '@/lib/types'
import { PAYOUTS } from '@/lib/trivia-logic'
import { PrestigeAvatar, ROMAN } from '@/components/PrestigeAvatar'
import { CREDIT_PACKAGES } from '@/lib/stripe-packages'
import { LegendCard } from '@/components/LegendCard'
import { PrestigePicker, type LegendOption } from '@/components/PrestigePicker'
import { PrestigeReveal } from '@/components/PrestigeReveal'
import { useLockBodyScroll } from '@/lib/use-lock-body-scroll'

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

interface PredictionWithGame extends Prediction {
  game: { away_team_abbr: string; game_date: string } | null
}

interface EarnedLegend {
  prestige_number: number
  legend: LegendOption
}

interface PrestigeStatus {
  prestigeLevel: number
  ownedUnique: number
  totalPlayers: number
  canPrestige: boolean
  nextSlot: number
  nextSlotPosition: string
  nextSlotLabel: string
  nextSlotOptions: LegendOption[]
  earnedLegends: EarnedLegend[]
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
  underdogWins: number
  hasPerfectDay: boolean
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
  { id: 'sharp',         name: 'Sharp',          description: 'Get 25 correct picks',                          icon: '🎯', category: 'Picks',      difficulty: 'hard',      check: s => s.totalCorrectPicks >= 25,   progress: s => ({ current: Math.min(s.totalCorrectPicks, 25), total: 25 }) },
  { id: 'on_fire',       name: 'On Fire',        description: '5 correct picks in a row',                      icon: '🔥', category: 'Picks',      difficulty: 'hard',      check: s => s.pickStreak >= 5 },
  { id: 'precision',     name: 'Precision',      description: '70%+ win rate across 30+ settled picks',         icon: '📐', category: 'Picks',      difficulty: 'very_hard', check: s => s.settledPicks >= 30 && s.correctPickRate >= 0.70 },
  { id: 'centurion',     name: 'Centurion',      description: 'Make 100 total picks',                          icon: '⚔️', category: 'Picks',      difficulty: 'hard',      check: s => s.totalPicks >= 100,         progress: s => ({ current: Math.min(s.totalPicks, 100), total: 100 }) },
  { id: 'underdog',      name: 'Underdog',       description: 'Correctly pick 10 away team wins',              icon: '🐕', category: 'Picks',      difficulty: 'very_hard', check: s => s.underdogWins >= 10,        progress: s => ({ current: Math.min(s.underdogWins, 10), total: 10 }) },
  { id: 'perfect_day',   name: 'Perfect Day',    description: 'Go perfect on all picks in a single day (4+ games)', icon: '☀️', category: 'Picks', difficulty: 'very_hard', check: s => s.hasPerfectDay },
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
  const { userId } = useUserId()
  const { credits, setCredits } = useCredits()
  const searchParams = useSearchParams()
  const [purchasingPkg, setPurchasingPkg] = useState<string | null>(null)
  const [purchaseToast, setPurchaseToast] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<PredictionWithGame[]>([])
  const [cardCounts, setCardCounts] = useState<CardCount[]>([])
  const [cardRows, setCardRows] = useState<CardRow[]>([])
  const [triviaSessions, setTriviaSessions] = useState<TriviaSession[]>([])
  const [draftEarned, setDraftEarned] = useState(0)
  const [prestigeLevel, setPrestigeLevel] = useState(0)
  const [prestige, setPrestige] = useState<PrestigeStatus | null>(null)
  const [showPrestigeReveal, setShowPrestigeReveal] = useState(false)
  const [showPrestigeModal, setShowPrestigeModal] = useState(false)
  const [selectedLegendId, setSelectedLegendId] = useState<string | null>(null)
  const [prestiging, setPrestiging] = useState(false)
  const [prestigeResult, setPrestigeResult] = useState<{ legendName: string; newLevel: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(CATEGORIES)
  )
  const [persistedTrophies, setPersistedTrophies] = useState<Set<string>>(new Set())
  useLockBodyScroll(showPrestigeModal && !!prestige && !prestige.canPrestige)

  useEffect(() => {
    if (!userId) return
    async function load() {
      const [predsRes, cardsRes, triviaData, prestigeData, draftRes, trophiesRes] = await Promise.all([
        supabase.from('predictions').select('*, game:games(away_team_abbr, game_date)').eq('user_id', userId),
        supabase.from('user_cards').select('quantity, player:players(id, tier, team_abbr)').eq('user_id', userId),
        authedFetch('/api/trivia/history').then(r => r.json()),
        authedFetch('/api/prestige').then(r => r.json()),
        supabase.from('draft_boards').select('credits_earned').eq('user_id', userId).eq('status', 'scored'),
        supabase.from('user_trophies').select('trophy_id').eq('user_id', userId),
      ])

      setDraftEarned((draftRes.data ?? []).reduce((s, b) => s + (b.credits_earned ?? 0), 0))
      setPersistedTrophies(new Set((trophiesRes.data ?? []).map((r: { trophy_id: string }) => r.trophy_id)))
      setPredictions(predsRes.data ?? [])
      setTriviaSessions(Array.isArray(triviaData) ? triviaData : [])
      setPrestigeLevel(prestigeData.prestigeLevel ?? 0)
      setPrestige(prestigeData as PrestigeStatus)
      const uname = (prestigeData.username as string | null) ?? null
      setUsername(uname)

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
  }, [userId])

  useEffect(() => {
    if (!userId) return
    if (searchParams.get('purchase') === 'success') {
      setTimeout(async () => {
        const { data } = await supabase.from('user_state').select('credits').eq('user_id', userId).single()
        if (data) setCredits(data.credits)
        setPurchaseToast('Credits added!')
        setTimeout(() => setPurchaseToast(null), 3000)
      }, 1500)
      window.history.replaceState({}, '', '/profile')
    }
  }, [searchParams, setCredits, userId])

  async function handlePrestige(legendId: string | null) {
    if (!legendId) return
    setPrestiging(true)
    try {
      const res = await authedFetch('/api/prestige', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legendId }),
      })
      const data = await res.json()
      if (data.success) {
        setPrestigeResult({ legendName: data.legend?.name ?? 'Legend', newLevel: data.newPrestigeLevel })
        setPrestigeLevel(data.newPrestigeLevel)
        setPrestige(prev => {
          if (!prev) return null
          const chosen = prev.nextSlotOptions.find(l => l.id === legendId)
          return {
            ...prev,
            prestigeLevel: data.newPrestigeLevel,
            ownedUnique: 0,
            canPrestige: false,
            nextSlotOptions: [],
            earnedLegends: chosen
              ? [...prev.earnedLegends, { prestige_number: data.newPrestigeLevel, legend: chosen }]
              : prev.earnedLegends,
          }
        })
        setShowPrestigeModal(false)
        setSelectedLegendId(null)
      }
    } finally {
      setPrestiging(false)
    }
  }

  async function handleBuyCreditPackage(packageId: string) {
    if (!userId) return
    setPurchasingPkg(packageId)
    try {
      const res = await authedFetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, userId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setPurchasingPkg(null)
      }
    } catch {
      setPurchasingPkg(null)
    }
  }

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

  const prestigePct = prestige && prestige.totalPlayers > 0
    ? Math.min(100, Math.round((prestige.ownedUnique / prestige.totalPlayers) * 100))
    : 0

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

    // Underdog: correctly picked the away team
    const underdogWins = predictions.filter(p =>
      p.status === 'correct' &&
      p.game?.away_team_abbr &&
      p.predicted_winner === p.game.away_team_abbr
    ).length

    // Perfect Day: any game_date where all picks were correct and user picked 4+ games
    const byDate = new Map<string, { total: number; correct: number }>()
    for (const p of predictions) {
      const date = p.game?.game_date
      if (!date || p.status === 'pending') continue
      const entry = byDate.get(date) ?? { total: 0, correct: 0 }
      entry.total++
      if (p.status === 'correct') entry.correct++
      byDate.set(date, entry)
    }
    const hasPerfectDay = [...byDate.values()].some(d => d.total >= 4 && d.correct === d.total)

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
      underdogWins,
      hasPerfectDay,
      unlockedCount:     0,
    }
    const unlockedCount = ACHIEVEMENTS_BASE.filter(a => a.check(base)).length
    return { ...base, unlockedCount }
  }, [totalCards, teamPlayerSets, cardCounts, cardRows, correct, predictions, settled, triviaSessions, earned])

  // Persist any newly earned trophies so they survive prestige
  useEffect(() => {
    if (loading || !userId) return
    const newlyEarned = ACHIEVEMENTS.filter(
      a => a.check(trophyStats) && !persistedTrophies.has(a.id)
    )
    if (newlyEarned.length === 0) return
    const rows = newlyEarned.map(a => ({ user_id: userId, trophy_id: a.id }))
    supabase.from('user_trophies').upsert(rows, { onConflict: 'user_id,trophy_id' }).then(() => {
      setPersistedTrophies(prev => new Set([...prev, ...newlyEarned.map(a => a.id)]))
    })
  }, [trophyStats, loading, persistedTrophies, userId])

  const earnedCount = ACHIEVEMENTS.filter(a => a.check(trophyStats) || persistedTrophies.has(a.id)).length

  if (loading) return <ProfileSkeleton />

  return (
    <>

    {/* ── Identity header — avatar + username + credits ── */}
    <div className="flex items-stretch gap-4 mb-6">

      {/* Avatar + username */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <PrestigeAvatar level={prestigeLevel} />
        <div className="min-w-0">
          <h1 className="text-xl font-black text-[#1a1714] truncate">
            {username ?? '-'}
          </h1>
          <p className="text-[#a39890] text-sm">
            {prestigeLevel > 0 ? `Prestige ${ROMAN[prestigeLevel - 1]} · Your stats` : 'Your stats and trophies'}
          </p>
        </div>
      </div>

      {/* Credits block — fills remaining header width */}
      <div className="flex-1 bg-white border border-[#e2ddd6] rounded-2xl shadow-sm overflow-hidden min-w-0">
        <div className="flex h-full">
          {/* Balance */}
          <div className="px-5 py-3 flex flex-col justify-center flex-shrink-0">
            <div className="text-xs font-bold uppercase tracking-widest text-[#a39890] mb-0.5">Credits</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-amber-600 tabular-nums">
                {credits === null ? '-' : credits.toLocaleString()}
              </span>
              <span className="text-amber-500 text-sm font-semibold">cr</span>
            </div>
            <div className="text-[#a39890] text-xs mt-0.5">{earned.toLocaleString()} earned all-time</div>
          </div>

          {/* Divider */}
          <div className="w-px bg-[#f0ede8] self-stretch flex-shrink-0" />

          {/* Buy buttons */}
          <div className="flex-1 grid grid-cols-3 divide-x divide-[#f0ede8] min-w-0">
            {CREDIT_PACKAGES.map(pkg => (
              <button
                key={pkg.id}
                disabled={!!purchasingPkg}
                onClick={() => handleBuyCreditPackage(pkg.id)}
                className="flex flex-col items-center justify-center gap-0.5 px-2 py-3 hover:bg-[#faf9f6] transition-colors disabled:opacity-50"
              >
                {pkg.tag && (
                  <span className="text-[7px] font-black uppercase tracking-wider text-amber-500">
                    {pkg.tag}
                  </span>
                )}
                <span className="text-sm font-black text-[#1a1714] tabular-nums">{pkg.credits.toLocaleString()}</span>
                <span className="text-[9px] text-[#a39890]">credits</span>
                <span className="text-[10px] font-black text-[#6b6259] mt-0.5">
                  {purchasingPkg === pkg.id ? '…' : pkg.displayPrice}
                </span>
              </button>
            ))}
          </div>
        </div>
        {purchaseToast && (
          <div className="border-t border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 text-center">
            {purchaseToast}
          </div>
        )}
      </div>

    </div>

    {/* ── Prestige tracker (full width) + Starting Five below ── */}
    {prestige && prestige.totalPlayers > 0 && (
      <div className="mb-6 space-y-4">

        {/* Prestige tracker — full width */}
        <div className="relative overflow-hidden rounded-2xl bg-[#1a1714] border border-amber-500/[0.18] p-4">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_0%,rgba(251,191,36,0.10),transparent_70%)] pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

          <div className="relative flex items-center gap-6">
            {/* Level */}
            <div className="flex-shrink-0">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-400/70 mb-0.5">Prestige</p>
              <p className="text-white font-black text-3xl leading-none tracking-tight drop-shadow-sm">
                {prestige.prestigeLevel > 0 ? ROMAN[prestige.prestigeLevel - 1] : '-'}
              </p>
            </div>

            {/* Progress bar — fills remaining space */}
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-400/70">Collection</span>
                <span className="text-[10px] text-amber-400/80 tabular-nums font-bold">
                  {prestige.ownedUnique} / {prestige.totalPlayers}
                </span>
              </div>
              <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    prestige.canPrestige
                      ? 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                      : 'bg-white/25'
                  }`}
                  style={{ width: `${Math.max(2, prestigePct)}%` }}
                />
              </div>
              {!prestige.canPrestige && prestige.nextSlotLabel && (
                <p className="text-[10px] text-white/40 leading-relaxed">
                  Collect all players to unlock your{' '}
                  <span className="text-amber-400/70 font-semibold">{prestige.nextSlotLabel}</span>
                </p>
              )}
            </div>

            {/* Button */}
            <button
              onClick={() => prestige.canPrestige ? setShowPrestigeReveal(true) : setShowPrestigeModal(true)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                prestige.canPrestige
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.35)]'
                  : 'border border-amber-500/40 text-amber-400 hover:text-amber-300 hover:border-amber-400'
              }`}
            >
              {prestige.canPrestige ? 'Prestige Now →' : 'Prestige'}
            </button>
          </div>
        </div>

        {/* Starting Five — centered below */}
        {prestige.earnedLegends.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-[#e2ddd6]" />
              <h2 className="flex items-center gap-1.5 bg-[#1a1714] rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-widest whitespace-nowrap text-amber-400">
                Starting Five
                <span className="font-semibold normal-case tracking-normal text-white/40">{prestige.earnedLegends.length} / 5</span>
              </h2>
              <div className="flex-1 h-px bg-[#e2ddd6]" />
            </div>
            <div className="flex justify-center gap-3">
              {([1, 2, 3, 4, 5] as const).map(slot => {
                const earned = prestige.earnedLegends.find(ul => ul.prestige_number === slot)
                const posLabel = ['PG', 'SG', 'SF', 'PF', 'C'][slot - 1]
                return (
                  <div key={slot} className="w-28 flex-shrink-0">
                    {earned ? (
                      <LegendCard legend={earned.legend} prestigeNum={earned.prestige_number} />
                    ) : (
                      <div
                        className="rounded-xl border-2 border-dashed border-[#e2ddd6] flex items-center justify-center"
                        style={{ aspectRatio: '5/7' }}
                      >
                        <span className="text-[10px] font-black text-[#d4cfc9] uppercase tracking-widest">{posLabel}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    )}

    {/* ── Two-column layout — stats + trophies ── */}
    <div className="flex gap-6 items-start">

    {/* ── Left column — stats ── */}
    <div className="flex flex-col gap-6 w-72 flex-shrink-0">

      {/* Pick stats */}
      <div className="bg-white border border-[#e2ddd6] rounded-2xl p-5 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-widest text-[#a39890] mb-4">Picks</div>
        <div className="grid grid-cols-3 gap-3">
          <Stat value={predictions.length} label="Picked" />
          <Stat value={correct.length} label="Correct" />
          <Stat value={winRate !== null ? `${winRate}%` : '-'} label="Win Rate" highlight />
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
                      const isEarned = a.check(trophyStats) || persistedTrophies.has(a.id)
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

    {/* Prestige result banner */}
    {prestigeResult && (
      <div className="fixed inset-x-4 bottom-6 z-50 bg-amber-500 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
        <div>
          <div className="font-black text-sm">Prestige {ROMAN[(prestigeResult.newLevel - 1)] ?? prestigeResult.newLevel} unlocked</div>
          <div className="text-xs text-amber-100 mt-0.5">{prestigeResult.legendName} added to your Starting Five</div>
        </div>
        <button onClick={() => setPrestigeResult(null)} className="text-white/70 hover:text-white text-lg leading-none">×</button>
      </div>
    )}

    {/* Prestige intro reveal — runs before the picker opens */}
    {showPrestigeReveal && prestige?.canPrestige && (
      <PrestigeReveal
        prestigeLevel={prestige.prestigeLevel}
        nextSlotLabel={prestige.nextSlotLabel}
        nextSlotPosition={prestige.nextSlotPosition}
        onDone={() => {
          setShowPrestigeReveal(false)
          setShowPrestigeModal(true)
        }}
      />
    )}

    {/* Full-screen prestige picker */}
    {showPrestigeModal && prestige?.canPrestige && (
      <PrestigePicker
        prestigeLevel={prestige.prestigeLevel}
        nextSlotLabel={prestige.nextSlotLabel}
        nextSlotPosition={prestige.nextSlotPosition}
        options={prestige.nextSlotOptions}
        selectedLegendId={selectedLegendId}
        onSelect={setSelectedLegendId}
        onConfirm={() => handlePrestige(selectedLegendId)}
        onCancel={() => { setShowPrestigeModal(false); setSelectedLegendId(null) }}
        prestiging={prestiging}
      />
    )}

    {/* Not-yet info modal */}
    {showPrestigeModal && prestige && !prestige.canPrestige && (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4 sm:p-6">
        <div className="relative overflow-hidden rounded-3xl w-full max-w-sm shadow-2xl bg-gradient-to-b from-[#0d1321] to-[#080d16] border border-white/[0.07]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(251,191,36,0.08),transparent_70%)] pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

          <div className="relative p-6">
            <p className="text-[8px] font-black uppercase tracking-[0.35em] text-amber-400/40 mb-1">Prestige</p>
            <h2 className="text-xl font-black text-white mb-2 leading-tight">Build Your Starting Five</h2>
            <p className="text-white/40 text-sm leading-relaxed mb-5">
              Collect every player card to unlock Prestige. Your collection resets — and you choose one all-time legend to permanently lock into your{' '}
              <span className="text-white/65 font-semibold">Starting Five</span>.
            </p>

            {prestige.nextSlotPosition && (
              <div className="flex gap-4 items-center mb-5">
                <div className="flex-shrink-0 w-20 rounded-xl overflow-hidden bg-gradient-to-b from-[#0d1e3a] via-[#081428] to-[#030c18] border border-white/[0.07] shadow-xl">
                  <div className="aspect-[5/7] flex flex-col items-center justify-center gap-2 relative">
                    <div className="absolute inset-0 opacity-[0.025]"
                      style={{ backgroundImage: 'linear-gradient(#fbbf24 1px,transparent 1px),linear-gradient(90deg,#fbbf24 1px,transparent 1px)', backgroundSize: '14px 14px' }} />
                    <span className="text-amber-400/20 text-3xl font-black select-none relative z-10">?</span>
                    <span className="text-amber-400/45 text-[9px] font-black uppercase tracking-widest relative z-10">
                      {prestige.nextSlotPosition}
                    </span>
                  </div>
                  <div className="bg-[#0a1628] px-2 py-1 text-center">
                    <span className="text-[5px] font-black uppercase tracking-[0.3em] text-amber-400/15">· · ·</span>
                  </div>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-400/50 mb-1">Next slot</p>
                  <p className="text-white font-black text-base leading-tight">{prestige.nextSlotLabel}</p>
                  <p className="text-white/25 text-[11px] tabular-nums mt-1">
                    {prestige.ownedUnique} / {prestige.totalPlayers} players
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowPrestigeModal(false)}
              className="w-full py-2.5 rounded-xl border border-white/10 text-white/40 text-sm font-bold hover:border-white/20 hover:text-white/60 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    )}
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
