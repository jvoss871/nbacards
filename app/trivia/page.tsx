'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useUserId } from '@/lib/use-user-id'
import { authedFetch } from '@/lib/authed-fetch'
import { PAYOUTS, SAFETY_NET_STEPS, PHONE_RELIABILITY_DEFAULT } from '@/lib/trivia-logic'
import { useCredits } from '@/lib/credits-context'
import type { Player, Tier, ActionCardType } from '@/lib/types'
import { TIER_LABEL } from '@/lib/game-logic'
import { teamLogoUrl } from '@/lib/team-logo'
import { lastNameFontSize, GOLD_HEX_BG, splitName } from '@/lib/card-utils'
import { Tooltip } from '@/components/Tooltip'
import { ActionCard } from '@/components/ActionCard'
import { useLockBodyScroll } from '@/lib/use-lock-body-scroll'

interface UserActionCardWithType {
  id: string
  action_card_type_id: string
  used: boolean
  type: ActionCardType
}

const CARD_STYLE: Record<Tier, {
  gradient: string; border: string; foil: string; foilClass: string
  label: string; footer: string; glow: string; photoGlow: string
}> = {
  bronze:   { gradient: 'from-amber-600 via-amber-900 to-stone-950',  border: 'border-amber-500/80',  foil: 'from-amber-500/25 to-transparent',  foilClass: '',                    label: 'text-amber-300',  footer: 'from-stone-950',   glow: 'shadow-sm', photoGlow: 'rgba(217,119,6,0.45)' },
  silver:   { gradient: 'from-slate-300 via-slate-600 to-slate-900',  border: 'border-slate-300/70',  foil: 'from-slate-200/20 to-transparent',  foilClass: 'foil-sweep',          label: 'text-slate-200',  footer: 'from-slate-900',   glow: 'glow-silver', photoGlow: 'rgba(226,232,240,0.45)' },
  gold:     { gradient: 'from-yellow-400 via-yellow-800 to-amber-950', border: 'border-yellow-400/80', foil: 'from-yellow-300/30 to-transparent', foilClass: 'foil-sweep-gold',     label: 'text-yellow-200', footer: 'from-amber-950',   glow: 'glow-gold', photoGlow: 'rgba(250,204,21,0.45)' },
  platinum: { gradient: 'from-cyan-400 via-blue-700 to-indigo-950',   border: 'border-cyan-300/80',   foil: 'from-blue-200/25 to-transparent',   foilClass: 'foil-sweep-platinum', label: 'text-cyan-200',   footer: 'from-indigo-950',  glow: 'glow-platinum', photoGlow: 'rgba(34,211,238,0.45)' },
}

// Fallback display reliability when card has no rolled value (pre-feature cards)
const RELIABILITY_FALLBACK = PHONE_RELIABILITY_DEFAULT

interface TriviaQuestion {
  id: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  difficulty: number
  category: string
  audience_a: number
  audience_b: number
  audience_c: number
  audience_d: number
}

interface TriviaSession {
  id: string
  current_step: number
  credits_floor: number
  status: string
  lifeline_fifty_used: boolean
  lifeline_phone_used: boolean
  lifeline_audience_used: boolean
  eliminated_options: string[]
}

type AnswerKey = 'a' | 'b' | 'c' | 'd'
type GameStatus = 'loading' | 'generating' | 'idle' | 'playing' | 'revealed' | 'correct_pause' | 'won' | 'lost' | 'walked_away'

const OPTION_LABELS: AnswerKey[] = ['a', 'b', 'c', 'd']
const OPTION_LETTERS: Record<AnswerKey, string> = { a: 'A', b: 'B', c: 'C', d: 'D' }

const MEDALS = ['🥇', '🥈', '🥉']

function LeaderboardCallout() {
  const [top3, setTop3] = useState<{ username: string; totalCorrect: number }[]>([])

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => setTop3((d.entries ?? []).slice(0, 3)))
      .catch(() => {})
  }, [])

  return (
    <a
      href="/leaderboard"
      className="block bg-white border border-[#e2ddd6] rounded-xl shadow-sm hover:border-amber-400/50 hover:bg-amber-50/30 transition-all group"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-600/60 mb-0.5">Monthly</p>
          <p className="text-xs font-black text-[#1a1714]">Trivia Leaderboard</p>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#c8c2b8] group-hover:text-amber-500 transition-colors">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
      {top3.length > 0 && (
        <div className="flex items-center gap-3 px-4 pb-3 -mt-0.5">
          {top3.map((e, i) => (
            <div key={i} className="flex items-center gap-1 min-w-0">
              <span className="text-xs flex-shrink-0">{MEDALS[i]}</span>
              <span className="text-[10px] font-bold text-[#1a1714] truncate max-w-[64px]">{e.username}</span>
              <span className="text-[9px] text-[#a39890] flex-shrink-0">{e.totalCorrect}</span>
            </div>
          ))}
        </div>
      )}
    </a>
  )
}

export default function TriviaPage() {
  const { userId } = useUserId()
  const { setCredits } = useCredits()
  const [session, setSession]     = useState<TriviaSession | null>(null)
  const [questions, setQuestions] = useState<TriviaQuestion[]>([])
  const [step, setStep]           = useState(0)
  const [status, setStatus]       = useState<GameStatus>('loading')
  const [selected, setSelected]   = useState<AnswerKey | null>(null)
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null)
  const [creditsEarned, setCreditsEarned] = useState(0)
  const [eliminated, setEliminated]       = useState<string[]>([])
  const [audienceData, setAudienceData]   = useState<Record<AnswerKey, number> | null>(null)
  const [phoneResult, setPhoneResult]     = useState<{ hint: string; name: string; tier: string } | null>(null)
  const [selectedPhoneCard, setSelectedPhoneCard] = useState<{ player: Player; reliability: number | null; copyKey: string } | null>(null)
  const [showCardPicker, setShowCardPicker] = useState(false)
  const [ownedCards, setOwnedCards] = useState<{ player: Player; quantity: number; reliability: number[] | null }[]>([])
  const [lifelineLoading, setLifelineLoading] = useState(false)
  const [answerLoading, setAnswerLoading]     = useState(false)
  const [skipLoading, setSkipLoading]         = useState(false)
  const [completedStep, setCompletedStep]     = useState(0)
  const [timeLeft, setTimeLeft]               = useState<number | null>(null)
  const [timerKey, setTimerKey]               = useState(0)
  const [triviaActionCards, setTriviaActionCards] = useState<UserActionCardWithType[]>([])
  const [safetyNetPlayed, setSafetyNetPlayed] = useState(false)
  const [flagged, setFlagged] = useState<Set<string>>(new Set())
  const [flagging, setFlagging] = useState(false)

  const currentQ = questions[step - 1] ?? null

  const loadSession = useCallback(async () => {
    const res = await authedFetch('/api/trivia/session')
    if (res.status === 409) {
      setStatus('generating')
      await Promise.all([1, 2, 3].map(diff =>
        authedFetch('/api/trivia/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ difficulty: diff, count: 20 }),
        })
      ))
      const retry = await authedFetch('/api/trivia/session')
      const data = await retry.json()
      applySession(data)
    } else {
      const data = await res.json()
      applySession(data)
    }
  }, [])

  function applySession(data: { session: TriviaSession; questions: TriviaQuestion[] }) {
    if (!data.session) { setStatus('idle'); return }
    setSession(data.session)
    setQuestions(data.questions)
    setEliminated(data.session.eliminated_options ?? [])
    if (data.session.status !== 'active') {
      setStatus(data.session.status as GameStatus)
      setCreditsEarned(data.session.status === 'won' ? PAYOUTS[15] : data.session.credits_floor)
    } else {
      const s = data.session.current_step
      if (s === 0) {
        setStep(0)
        setStatus('idle')
      } else {
        // Distinguish mid-question from between rounds using the sessionStorage timer.
        // The timer is written only when the player clicks Continue and starts answering.
        // If no timer exists for step s+1, the player was in correct_pause, not playing.
        let wasMidQuestion = false
        try {
          const raw = sessionStorage.getItem('trivia-timer')
          if (raw) {
            const saved = JSON.parse(raw) as { s: number; id: string; t: number }
            if (saved.s === s + 1 && saved.id === data.session.id) wasMidQuestion = true
          }
        } catch { /* sessionStorage unavailable */ }

        if (wasMidQuestion) {
          setStep(s + 1)
          setStatus('playing')
        } else {
          setCompletedStep(s)
          setStep(s)
          setStatus('correct_pause')
        }
      }
    }
  }

  useEffect(() => {
    if (!userId) return
    loadSession()
    supabase
      .from('user_cards')
      .select('id, quantity, reliability, player:players(*)')
      .eq('user_id', userId)
      .then(({ data }) => {
        const TIER_RANK: Record<string, number> = { platinum: 0, gold: 1, silver: 2, bronze: 3 }
        setOwnedCards(
          (data ?? [])
            .map((c: { player: unknown; quantity: number; reliability: number[] | null }) => ({
              player: c.player as Player,
              quantity: c.quantity,
              reliability: c.reliability,
            }))
            .sort((a, b) => (TIER_RANK[a.player.tier] ?? 4) - (TIER_RANK[b.player.tier] ?? 4))
        )
      })
    supabase
      .from('user_action_cards')
      .select('*, type:action_card_types(*)')
      .eq('user_id', userId)
      .eq('used', false)
      .then(({ data }) => {
        const cards = (data ?? []) as UserActionCardWithType[]
        setTriviaActionCards(cards.filter(c => c.type?.context === 'trivia'))
      })
  }, [loadSession, userId])

  // Reset timer when a new question appears (step change or skip)
  useEffect(() => {
    if (status !== 'playing' || step <= 0) return
    let secs = 20
    let resumed = false
    try {
      const raw = sessionStorage.getItem('trivia-timer')
      if (raw) {
        const saved = JSON.parse(raw) as { s: number; id: string; t: number }
        if (saved.s === step && saved.id === (session?.id ?? '')) {
          secs = Math.max(0, 20 - (Date.now() - saved.t) / 1000)
          resumed = true
        }
      }
      if (!resumed) {
        sessionStorage.setItem('trivia-timer', JSON.stringify({ s: step, id: session?.id ?? '', t: Date.now() }))
      }
    } catch { /* sessionStorage unavailable */ }
    setTimeLeft(Math.round(secs))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, timerKey])

  // Stop timer when no longer actively playing
  useEffect(() => {
    if (status !== 'playing' || answerLoading) setTimeLeft(null)
  }, [status, answerLoading])

  // Countdown tick
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return
    const t = setTimeout(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000)
    return () => clearTimeout(t)
  }, [timeLeft])

  // Auto-submit on timeout
  useEffect(() => {
    if (timeLeft !== 0 || status !== 'playing' || answerLoading || !session) return
    setAnswerLoading(true)
    setSelected(null)
    authedFetch('/api/trivia/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, answer: 'timeout' }),
    })
      .then(r => r.json())
      .then(async data => {
        setCorrectAnswer(data.correct_answer)
        setStatus('revealed')
        await new Promise(r => setTimeout(r, 2500))
        setCreditsEarned(data.credits_earned ?? 0)
        if (data.credits !== undefined && data.credits !== null) setCredits(data.credits)
        setStatus('lost')
        setAnswerLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  function clearTimerStorage() {
    try { sessionStorage.removeItem('trivia-timer') } catch { /* ignore */ }
  }

  async function startGame() {
    clearTimerStorage()
    setStep(1)
    setStatus('playing')
  }

  function continueGame() {
    setStep(completedStep + 1)
    setSelected(null)
    setCorrectAnswer(null)
    setEliminated([])
    setAudienceData(null)
    setPhoneResult(null)
    setStatus('playing')
  }

  async function submitAnswer(answer: AnswerKey) {
    if (!session || answerLoading || status !== 'playing') return
    setSelected(answer)
    setAnswerLoading(true)
    clearTimerStorage()

    const res = await authedFetch('/api/trivia/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, answer }),
    })
    const data = await res.json()
    setCorrectAnswer(data.correct_answer)
    setStatus('revealed')

    await new Promise(r => setTimeout(r, 1800))

    if (data.correct) {
      const done = data.step
      setCompletedStep(done)
      setSession(s => s ? { ...s, current_step: done, credits_floor: data.credits_floor } : s)
      await new Promise(r => setTimeout(r, 900))
      if (data.credits !== undefined && data.credits !== null) setCredits(data.credits)
      if (data.status === 'won') {
        setCreditsEarned(PAYOUTS[15])
        setStatus('won')
      } else {
        setStatus('correct_pause')
      }
    } else {
      setCreditsEarned(data.credits_floor ?? data.credits_earned)
      setStatus('lost')
      if (data.credits !== undefined && data.credits !== null) setCredits(data.credits)
    }
    setAnswerLoading(false)
  }

  async function useLifeline(type: 'fifty' | 'phone' | 'audience', playerId?: string, reliability?: number | null) {
    if (!session || lifelineLoading) return
    setLifelineLoading(true)
    const res = await authedFetch('/api/trivia/lifeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, lifeline: type, player_id: playerId, reliability }),
    })
    const data = await res.json()
    setLifelineLoading(false)

    if (type === 'fifty') {
      setEliminated(data.eliminated ?? [])
      setSession(s => s ? { ...s, lifeline_fifty_used: true } : s)
    }
    if (type === 'phone') {
      setPhoneResult({ hint: data.hint, name: data.player_name, tier: data.player_tier })
      setSelectedPhoneCard(null)
      setSession(s => s ? { ...s, lifeline_phone_used: true } : s)
    }
    if (type === 'audience') {
      setAudienceData({ a: data.a, b: data.b, c: data.c, d: data.d })
      setSession(s => s ? { ...s, lifeline_audience_used: true } : s)
    }
  }

  async function walkAway() {
    if (!session) return
    const res = await authedFetch('/api/trivia/walkaway', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id }),
    })
    if (!res.ok) return
    const data = await res.json()
    if (data.credits !== undefined && data.credits !== null) setCredits(data.credits)
    setCreditsEarned(data.earned ?? 0)
    setStatus('walked_away')
  }

  async function useSkip() {
    if (!session || answerLoading || skipLoading) return
    const card = triviaActionCards.find(c => c.type.id === 'skip')
    if (!card) return
    setSkipLoading(true)
    const res = await authedFetch('/api/trivia/skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, action_card_id: card.id }),
    })
    const data = await res.json()
    if (data.question) {
      setQuestions(prev => prev.map((q, i) => i === step - 1 ? data.question : q))
      setSelected(null)
      setCorrectAnswer(null)
      setEliminated([])
      setAudienceData(null)
      setPhoneResult(null)
      setTriviaActionCards(prev => prev.filter(c => c.id !== card.id))
      setTimerKey(k => k + 1) // restart timer for the new question
    }
    setSkipLoading(false)
  }

  async function useSafetyNet() {
    if (!session || status !== 'correct_pause') return
    const card = triviaActionCards.find(c => c.type.id === 'safety_net')
    if (!card) return
    const newFloor = PAYOUTS[session.current_step] ?? 0
    if (newFloor <= (session.credits_floor ?? 0)) return
    setAnswerLoading(true)
    const res = await authedFetch('/api/trivia/safety-net', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, action_card_id: card.id }),
    })
    const data = await res.json()
    if (data.new_floor !== undefined) {
      setSession(s => s ? { ...s, credits_floor: data.new_floor } : s)
      if (data.credits !== undefined && data.credits !== null) setCredits(data.credits)
      setTriviaActionCards(prev => prev.filter(c => c.id !== card.id))
      setSafetyNetPlayed(true)
    }
    setAnswerLoading(false)
  }

  function optionClass(key: AnswerKey): string {
    const isEliminated = eliminated.includes(key)
    const isSelected = selected === key
    const isCorrect = correctAnswer === key
    const isWrong = isSelected && correctAnswer && key !== correctAnswer

    if (isEliminated) return 'opacity-20 cursor-not-allowed bg-[#f0ede8] border-[#e2ddd6] text-[#c8c2b8]'
    if (status === 'revealed' || status === 'correct_pause') {
      if (isCorrect) return 'bg-emerald-50 border-emerald-400 text-emerald-800'
      if (isWrong)   return 'bg-red-50 border-red-400 text-red-700'
      return 'bg-white border-[#e2ddd6] text-[#a39890]'
    }
    if (isSelected) return 'bg-amber-50 border-amber-400 text-amber-800'
    return 'bg-white border-[#e2ddd6] text-[#1a1714] hover:border-[#1a1714]/30 hover:bg-[#faf9f6] cursor-pointer'
  }

  function getOptionText(key: AnswerKey): string {
    return currentQ?.[`option_${key}` as keyof TriviaQuestion] as string ?? ''
  }

  if (status === 'loading' || status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-2 border-[#1a1714] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#a39890] text-sm">
          {status === 'generating' ? 'Setting up your questions...' : 'Loading...'}
        </p>
      </div>
    )
  }

  // End states
  if (status === 'won' || status === 'lost' || status === 'walked_away') {
    const title = status === 'won' ? 'Perfect Game.' : status === 'walked_away' ? 'Cashed Out.' : 'Game Over.'
    const msg = status === 'won'
      ? 'All 15. Flawless.'
      : status === 'walked_away'
        ? 'You took the money and ran.'
        : correctAnswer
          ? `Correct answer: ${correctAnswer.toUpperCase()}.`
          : ''
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <LeaderboardCallout />
        <h1 className="text-2xl font-black text-[#1a1714]">{title}</h1>
        <p className="text-[#6b6259] text-sm">{msg}</p>
        {creditsEarned > 0 && (
          <div className="bg-white border border-[#e2ddd6] rounded-2xl p-6 inline-block shadow-sm">
            <div className="text-3xl font-black text-amber-600">+{creditsEarned} cr</div>
          </div>
        )}
        <p className="text-xs text-[#c8c2b8]">One game per day.</p>
        {/* DEV ONLY */}
        <button
          onClick={async () => { await authedFetch('/api/trivia/session', { method: 'DELETE' }); window.location.reload() }}
          className="text-[10px] text-[#c8c2b8] hover:text-red-400 transition-colors"
        >
          reset for testing
        </button>
      </div>
    )
  }

  // ── Main game UI ──────────────────────────────────────────────────────────

  const lifelineUsed = (used: boolean | undefined, noCard = false) =>
    `w-full py-1.5 rounded-lg border text-[10px] font-black transition-all ${
      used || noCard
        ? 'opacity-25 cursor-not-allowed bg-[#f0ede8] border-[#e2ddd6] text-[#a39890]'
        : 'bg-white border-[#e2ddd6] text-[#1a1714] hover:bg-[#faf9f6]'
    }`

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {status !== 'idle' && (
            <p className="text-xs text-[#a39890]">Question {step} of 15</p>
          )}
        </div>
        {/* DEV ONLY */}
        <button
          onClick={async () => { await authedFetch('/api/trivia/session', { method: 'DELETE' }); window.location.reload() }}
          className="text-[10px] text-[#c8c2b8] hover:text-red-400 transition-colors"
        >
          reset
        </button>
      </div>

      {/* ── Idle: start ── */}
      {status === 'idle' && (
        <div className="flex gap-3 items-start">

          {/* LEFT: content */}
          <div className="flex-1 min-w-0 space-y-2.5">

            {/* Leaderboard callout */}
            <LeaderboardCallout />

            {/* Jackpot headline */}
            <div className="text-center py-6">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#a39890] mb-2">Daily Jackpot</p>
              <p className="text-7xl font-black text-[#1a1714] leading-none tracking-tight">1,000</p>
              <p className="text-lg font-black text-amber-500 tracking-widest uppercase mt-1">credits</p>
              <p className="text-xs text-[#a39890] mt-3 max-w-xs mx-auto leading-relaxed">
                Answer all 15 correctly. A wrong answer ends the game. You keep what you have locked in.
              </p>
            </div>

              {/* Lifelines — premium dark info cards */}
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a39890]">Lifelines</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  {
                    name: '50 / 50',
                    desc: 'Eliminate two wrong answers',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        <line x1="4" y1="12" x2="8" y2="12" strokeWidth="1.5" strokeDasharray="2 2"/>
                        <line x1="16" y1="12" x2="20" y2="12" strokeWidth="1.5" strokeDasharray="2 2"/>
                      </svg>
                    ),
                  },
                  {
                    name: 'Ask Coach',
                    desc: 'See how the crowd would vote',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                        <line x1="18" y1="20" x2="18" y2="10"/>
                        <line x1="12" y1="20" x2="12" y2="4"/>
                        <line x1="6"  y1="20" x2="6"  y2="14"/>
                      </svg>
                    ),
                  },
                  {
                    name: 'Phone a Player',
                    desc: 'Your card guesses the answer',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    ),
                  },
                ] as { name: string; desc: string; icon: React.ReactNode }[]).map(l => (
                  <div key={l.name} className="rounded-xl bg-white border-2 border-[#e2ddd6] p-3 shadow-sm">
                    <div className="w-5 h-5 text-amber-500 mb-2">{l.icon}</div>
                    <p className="text-[10px] font-black text-[#1a1714] leading-tight mb-1">{l.name}</p>
                    <p className="text-[8px] text-[#a39890] leading-snug">{l.desc}</p>
                  </div>
                ))}
              </div>

              {/* Phone-a-player card picker */}
              <div className="bg-[#faf9f6] border border-[#e2ddd6] rounded-xl p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#a39890] mb-1">Phone a Player</p>
                <p className="text-[10px] text-[#6b6259] mb-2 leading-relaxed">
                  Pick a card as your lifeline. Higher tier = more reliable.
                  {selectedPhoneCard && <span className="text-red-500/70"> Burns if you lose after using it.</span>}
                </p>
                {ownedCards.length === 0 ? (
                  <p className="text-[10px] text-[#c8c2b8] italic">No cards in your collection yet.</p>
                ) : (
                  <button
                    onClick={() => setShowCardPicker(true)}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-black transition-colors ${
                      selectedPhoneCard
                        ? 'bg-[#1a1714] border-[#1a1714] text-white'
                        : 'bg-white border-[#e2ddd6] text-[#1a1714] hover:bg-[#faf9f6]'
                    }`}
                  >
                    {selectedPhoneCard ? `📞 ${selectedPhoneCard.player.name}` : 'Choose a Card →'}
                  </button>
                )}
              </div>

              {/* Start */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={startGame}
                  className="px-10 py-3.5 bg-[#1a1714] hover:bg-[#2c2825] text-white font-black text-base rounded-2xl transition-colors shadow-sm tracking-wide"
                >
                  Start Trivia →
                </button>
              </div>

            </div>

            {/* RIGHT: money ladder */}
            <div className="w-36 flex-shrink-0">
              <div className="bg-white border border-[#e2ddd6] rounded-2xl p-2 shadow-sm space-y-0.5">
                {Array.from({ length: 15 }, (_, i) => 15 - i).map(q => {
                  const payout = PAYOUTS[q]
                  const isSafetyNet = SAFETY_NET_STEPS.has(q)
                  const isGroupTop = q === 10 || q === 5
                  return (
                    <div key={q} className={isGroupTop ? 'pt-2' : ''}>
                      {isSafetyNet && (
                        <div className="text-center text-[7px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">
                          floor
                        </div>
                      )}
                      <div
                        style={{ clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)' }}
                        className={`flex items-center justify-between px-5 py-[5px] ${
                          isSafetyNet ? 'bg-emerald-100' : 'bg-[#ede9e4]'
                        }`}
                      >
                        <span className={`text-[9px] font-bold tabular-nums ${isSafetyNet ? 'text-emerald-700' : 'text-[#a39890]'}`}>
                          {q}
                        </span>
                        <span className={`text-[10px] font-black tabular-nums ${isSafetyNet ? 'text-emerald-800' : 'text-[#1a1714]'}`}>
                          {payout.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
      )}


      {/* ── Playing ── */}
      {(status === 'playing' || status === 'revealed' || status === 'correct_pause') && currentQ && (
        <div className="flex gap-3 items-start">

          {/* LEFT */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">

            {/* Question card */}
            <div className="bg-white border border-[#e2ddd6] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#a39890]">
                    {currentQ.category}
                  </span>
                  <span className="text-[10px] text-[#c8c2b8]">·</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#a39890]">
                    {['', 'Easy', 'Medium', 'Hard'][currentQ.difficulty]}
                  </span>
                </div>
                {timeLeft !== null && (
                  <span className={`text-sm font-black tabular-nums px-2 py-0.5 rounded-lg ${
                    timeLeft > 10
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : timeLeft > 5
                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                        : 'bg-red-50 text-red-600 border border-red-300 animate-pulse'
                  }`}>
                    {timeLeft}s
                  </span>
                )}
              </div>
              <p className="text-[#1a1714] font-semibold leading-snug text-sm">{currentQ.question}</p>
            </div>

            {/* Timer bar */}
            {timeLeft !== null && (
              <div className="h-1.5 bg-[#f0ede8] rounded-full overflow-hidden -mt-1">
                <div
                  className={`h-full rounded-full ${
                    timeLeft > 10 ? 'bg-emerald-400' : timeLeft > 5 ? 'bg-amber-400' : 'bg-red-500'
                  }`}
                  style={{ width: `${(timeLeft / 20) * 100}%`, transition: 'width 1s linear' }}
                />
              </div>
            )}

            {/* Audience result */}
            {audienceData && (
              <div className="relative overflow-hidden rounded-xl bg-[#0b0f1a] border border-indigo-500/20 p-3.5">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(99,102,241,0.10),transparent_70%)] pointer-events-none" />
                <p className="relative text-[8px] font-black uppercase tracking-[0.35em] text-indigo-300 mb-2.5">Coach&apos;s Read</p>
                <div className="relative space-y-1.5">
                  {OPTION_LABELS.map(key => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-indigo-200 w-3">{key.toUpperCase()}</span>
                      <div className="flex-1 bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full rounded-full transition-all" style={{ width: `${audienceData[key]}%` }} />
                      </div>
                      <span className="text-[9px] text-indigo-200 font-black w-7 text-right tabular-nums">{audienceData[key]}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phone result */}
            {phoneResult && (
              <div className="relative overflow-hidden rounded-xl bg-[#0f0c08] border border-amber-500/25 p-3.5">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(251,191,36,0.08),transparent_70%)] pointer-events-none" />
                <p className="relative text-[8px] font-black uppercase tracking-[0.35em] text-amber-400 mb-1.5">Phone a Player</p>
                <div className="relative flex items-center justify-between gap-3">
                  <p className="text-sm leading-snug">
                    <span className="font-bold text-white">{phoneResult.name}</span>
                    <span className="text-white/60"> says </span>
                    <span className="font-black text-amber-300">{phoneResult.hint.toUpperCase()}</span>
                  </p>
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-500/50 flex-shrink-0">{phoneResult.tier}</span>
                </div>
              </div>
            )}

            {/* Answer options */}
            <div className="grid grid-cols-2 gap-2">
              {OPTION_LABELS.map(key => (
                <button
                  key={key}
                  onClick={() => {
                    if (eliminated.includes(key) || status === 'revealed' || answerLoading) return
                    if (status === 'playing') setSelected(prev => prev === key ? null : key)
                  }}
                  disabled={eliminated.includes(key) || status === 'revealed' || answerLoading}
                  className={`p-3 rounded-xl border-2 text-left transition-all text-xs font-semibold ${optionClass(key)}`}
                >
                  <span className="text-[10px] font-black mr-1.5 opacity-60">{OPTION_LETTERS[key]}</span>
                  {getOptionText(key)}
                </button>
              ))}
            </div>

            {/* Lifelines — horizontal strip */}
            {status !== 'correct_pause' && (
              <div className="flex gap-2">
                {/* 50/50 */}
                {(() => {
                  const used = !!session?.lifeline_fifty_used
                  const disabled = used || lifelineLoading || status === 'revealed'
                  return (
                    <button
                      onClick={() => !disabled && useLifeline('fifty')}
                      disabled={disabled}
                      className={`flex-1 flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl border-2 transition-all ${
                        used
                          ? 'opacity-30 cursor-not-allowed border-transparent bg-transparent'
                          : 'bg-white border-[#e2ddd6] hover:border-amber-400/50 hover:bg-amber-50/40 active:scale-[0.97] shadow-sm'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-amber-500">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      <span className={`text-[9px] font-black ${used ? 'text-[#1a1714]/30 line-through' : 'text-[#1a1714]'}`}>50 / 50</span>
                    </button>
                  )
                })()}
                {/* Ask Coach */}
                {(() => {
                  const used = !!session?.lifeline_audience_used
                  const disabled = used || lifelineLoading || status === 'revealed'
                  return (
                    <button
                      onClick={() => !disabled && useLifeline('audience')}
                      disabled={disabled}
                      className={`flex-1 flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl border-2 transition-all ${
                        used
                          ? 'opacity-30 cursor-not-allowed border-transparent bg-transparent'
                          : 'bg-white border-[#e2ddd6] hover:border-amber-400/50 hover:bg-amber-50/40 active:scale-[0.97] shadow-sm'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-amber-500">
                        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                      </svg>
                      <span className={`text-[9px] font-black ${used ? 'text-[#1a1714]/30 line-through' : 'text-[#1a1714]'}`}>Ask Coach</span>
                    </button>
                  )
                })()}
                {/* Phone a Player */}
                {(() => {
                  const used = !!session?.lifeline_phone_used
                  const noCard = !selectedPhoneCard
                  const canUse = !used && !noCard && !lifelineLoading && status !== 'revealed'
                  return (
                    <div className="flex-1 flex flex-col">
                      <button
                        onClick={() => {
                          if (used || lifelineLoading || status === 'revealed') return
                          if (noCard) { setShowCardPicker(true); return }
                          useLifeline('phone', selectedPhoneCard!.player.id, selectedPhoneCard!.reliability)
                        }}
                        disabled={used || lifelineLoading || status === 'revealed'}
                        className={`w-full flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl border-2 transition-all ${
                          used
                            ? 'opacity-30 cursor-not-allowed border-transparent bg-transparent'
                            : noCard
                              ? 'bg-white border-dashed border-[#e2ddd6] hover:border-amber-400/50 hover:bg-amber-50/40 active:scale-[0.97] shadow-sm'
                              : 'bg-white border-[#e2ddd6] hover:border-amber-400/50 hover:bg-amber-50/40 active:scale-[0.97] shadow-sm'
                        }`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${canUse ? 'text-amber-500' : noCard ? 'text-amber-400/50' : 'text-amber-500'}`}>
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                        <span className={`text-[9px] font-black truncate ${used ? 'text-[#1a1714]/30 line-through' : noCard ? 'text-[#a39890]' : 'text-[#1a1714]'}`}>
                          {used ? 'Phone' : noCard ? 'Pick card' : selectedPhoneCard!.player.name.split(' ').slice(-1)[0]}
                        </span>
                      </button>
                      {selectedPhoneCard && !used && (
                        <p className="text-[7px] text-red-500/60 text-center mt-0.5 leading-tight">burns if loss</p>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Skip action card — separate row */}
            {status !== 'correct_pause' && triviaActionCards.some(c => c.type.id === 'skip') && (
              <div className="flex justify-center">
                {triviaActionCards
                  .filter(c => c.type.id === 'skip')
                  .slice(0, 1)
                  .map(c => (
                    <Tooltip key={c.id} text={c.type.description}>
                      <ActionCard
                        cardType={c.type}
                        size="sm"
                        disabled={skipLoading || answerLoading || status === 'revealed'}
                        onClick={useSkip}
                      />
                    </Tooltip>
                  ))}
              </div>
            )}

            {/* Beta: flag this question */}
            {(status === 'revealed' || status === 'correct_pause') && currentQ && (
              <div className="flex justify-end">
                {flagged.has(currentQ.id) ? (
                  <span className="text-[10px] text-[#a39890] font-bold">🚩 Flagged. Thanks!</span>
                ) : (
                  <button
                    onClick={async () => {
                      setFlagging(true)
                      await authedFetch('/api/trivia/flag', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ question_id: currentQ.id, reason: '' }),
                      })
                      setFlagged(prev => new Set([...prev, currentQ.id]))
                      setFlagging(false)
                    }}
                    disabled={flagging}
                    className="flex items-center gap-1 text-[10px] text-[#c8c2b8] hover:text-amber-500 transition-colors disabled:opacity-40"
                  >
                    <span>🚩</span>
                    <span className="font-bold">Flag question</span>
                  </button>
                )}
              </div>
            )}

            {/* Lock in */}
            {status === 'playing' && selected && (
              <button
                onClick={() => submitAnswer(selected)}
                disabled={answerLoading}
                className="w-full py-2.5 bg-[#1a1714] hover:bg-[#2c2825] text-white text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {answerLoading ? 'Locking in...' : `Lock In ${OPTION_LETTERS[selected]}`}
              </button>
            )}

            {/* Correct pause: Continue or Cash Out */}
            {status === 'correct_pause' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={continueGame}
                    className="flex-1 py-2.5 bg-[#1a1714] hover:bg-[#2c2825] text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                  >
                    Continue to Q{completedStep + 1}
                  </button>
                  {PAYOUTS[completedStep] > 0 && (
                    <button
                      onClick={walkAway}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                    >
                      Cash Out {PAYOUTS[completedStep]} cr
                    </button>
                  )}
                </div>
                {(() => {
                  const snCard = triviaActionCards.find(c => c.type.id === 'safety_net')
                  return snCard && PAYOUTS[completedStep] > (session?.credits_floor ?? 0) ? (
                    <div className="flex justify-center pt-1">
                      <Tooltip text={snCard.type.description}>
                        <ActionCard
                          cardType={snCard.type}
                          size="sm"
                          onClick={useSafetyNet}
                        />
                      </Tooltip>
                    </div>
                  ) : null
                })()}
              </div>
            )}

            {/* Walk away (safety net floor) */}
            {(session?.credits_floor ?? 0) > 0 && status === 'playing' && !safetyNetPlayed && (
              <button
                onClick={walkAway}
                className="w-full py-1.5 text-xs text-[#a39890] hover:text-[#6b6259] transition-colors"
              >
                Walk away with {session?.credits_floor ?? 0} cr
              </button>
            )}
          </div>

          {/* RIGHT: money ladder */}
          <div className="w-36 flex-shrink-0">
            <div className="bg-white border border-[#e2ddd6] rounded-2xl p-2 shadow-sm space-y-0.5">
              {Array.from({ length: 15 }, (_, i) => 15 - i).map(q => {
                const payout = PAYOUTS[q]
                const isCurrent = q === step
                const isPast = q < step
                const isSafetyNet = SAFETY_NET_STEPS.has(q)
                const isGroupTop = q === 10 || q === 5
                return (
                  <div key={q} className={isGroupTop ? 'pt-2' : ''}>
                    {isSafetyNet && (
                      <div className="text-center text-[7px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">
                        floor
                      </div>
                    )}
                    <div
                      style={{
                        clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)',
                        background: q === 15
                          ? isCurrent
                            ? 'linear-gradient(90deg,#b8860b,#ffd700,#daa520)'
                            : isPast
                              ? 'linear-gradient(90deg,#9a7209,#c9a227,#b8860b)'
                              : 'linear-gradient(90deg,#92680a,#d4a017,#a67c10)'
                          : undefined,
                      }}
                      className={`flex items-center justify-between px-5 py-[5px] transition-all ${
                        q === 15
                          ? ''
                          : isCurrent
                            ? 'bg-amber-400'
                            : isSafetyNet
                              ? isPast ? 'bg-emerald-200' : 'bg-emerald-100'
                              : isPast
                                ? 'bg-[#ddd9d3]'
                                : 'bg-[#ede9e4]'
                      }`}
                    >
                      <span className={`text-[9px] font-bold tabular-nums ${
                        q === 15
                          ? 'text-yellow-100'
                          : isCurrent ? 'text-amber-900' : isSafetyNet ? 'text-emerald-700' : isPast ? 'text-[#b8b2a8]' : 'text-[#a39890]'
                      }`}>
                        {q}
                      </span>
                      <span className={`text-[10px] font-black tabular-nums ${
                        q === 15
                          ? 'text-white drop-shadow-sm'
                          : isCurrent ? 'text-white' : isSafetyNet ? 'text-emerald-800' : isPast ? 'text-[#b8b2a8]' : 'text-[#1a1714]'
                      }`}>
                        {payout.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {showCardPicker && (
        <PhoneCardOverlay
          cards={ownedCards.flatMap(c => Array.from({ length: c.quantity }, (_, i) => ({ player: c.player, reliability: c.reliability?.[i] ?? null, copyKey: `${c.player.id}-${i}` })))}
          selectedCard={selectedPhoneCard}
          onSelect={setSelectedPhoneCard}
          onClose={() => setShowCardPicker(false)}
        />
      )}
    </div>
  )
}

function FullCard({ player, isSelected, reliability }: { player: Player; isSelected: boolean; reliability?: number | null }) {
  const s = CARD_STYLE[player.tier]
  const isPlatinum = player.tier === 'platinum'
  const isGold = player.tier === 'gold'
  const { first, last } = splitName(player.name)
  const initials = player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className={`relative w-full aspect-[5/7] rounded-xl border-2 overflow-hidden bg-gradient-to-b ${s.gradient} ${s.border} ${s.glow} ${isSelected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black' : ''}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${s.foil} pointer-events-none`} />
      <div className={`${s.foilClass} absolute inset-0`} />
      {isPlatinum && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'repeating-conic-gradient(from 0deg at 50% 45%, rgba(180,230,255,0.10) 0deg 11deg, rgba(0,10,60,0.06) 11deg 22deg)',
              mixBlendMode: 'screen',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.22]"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
              backgroundSize: '200px 200px',
              mixBlendMode: 'overlay',
            }}
          />
          <div className="holo-overlay" />
        </>
      )}
      {isGold && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: GOLD_HEX_BG,
            backgroundSize: '10.4px 18px',
            mixBlendMode: 'overlay',
            opacity: 0.6,
          }}
        />
      )}
      <div className="absolute inset-[3px] rounded-[10px] border border-white/[0.07] pointer-events-none z-10" />

      {/* Top banner — matches PlayerBinder exactly */}
      <div className="absolute top-0 inset-x-0 z-20 bg-black/50 flex items-center justify-between gap-1 px-1.5 py-1">
        {reliability != null ? (
          <span className="bg-white/25 rounded-full px-1.5 py-px text-[7px] font-black text-white leading-none">
            {reliability}%
          </span>
        ) : (
          <span />
        )}
        <span className={`text-[7px] font-black ${s.label} ${isPlatinum ? 'platinum-shimmer' : ''}`}>
          {player.multiplier}×
        </span>
      </div>

      <div className="absolute inset-x-0 top-[22px] bottom-10 overflow-hidden">
        {player.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.image_url} alt={player.name} className="w-full h-full object-cover object-top"
            style={{ filter: `drop-shadow(0 0 4px ${s.photoGlow}) drop-shadow(0 0 10px ${s.photoGlow})` }}
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-black text-white/15 select-none">{initials}</span>
          </div>
        )}
      </div>

      <div className={`absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t ${s.footer} to-transparent`} />

      <div className="absolute bottom-0 inset-x-0 px-1.5 pb-0.5 z-20 flex items-end justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={teamLogoUrl(player.team_abbr)}
          alt={player.team_abbr}
          className="w-7 h-7 object-contain opacity-85 flex-shrink-0"
          style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.9)) drop-shadow(0 0 7px rgba(255,255,255,0.55))' }}
        />
        <div className="text-right min-w-0">
          {first && <div className="text-white/70 text-[8px] font-bold uppercase tracking-wider leading-none drop-shadow">{first}</div>}
          <div className="text-white font-black uppercase tracking-wide leading-tight drop-shadow-lg" style={{ fontSize: lastNameFontSize(last, 14) }}>{last}</div>
        </div>
      </div>

      {isSelected && <div className="absolute inset-0 bg-amber-400/10 pointer-events-none z-30 rounded-xl" />}
    </div>
  )
}

type TierFilter = 'all' | Tier

type PhoneCard = { player: Player; reliability: number | null; copyKey: string }

function PhoneCardOverlay({
  cards, selectedCard, onSelect, onClose,
}: {
  cards: PhoneCard[]
  selectedCard: PhoneCard | null
  onSelect: (card: PhoneCard | null) => void
  onClose: () => void
}) {
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)
  useLockBodyScroll()

  const filteredCards = tierFilter === 'all' ? cards : cards.filter(c => c.player.tier === tierFilter)

  // Dedupe by player — group copies together
  const grouped = useMemo(() => {
    const map = new Map<string, { player: Player; copies: { reliability: number | null; copyKey: string }[] }>()
    for (const card of filteredCards) {
      const entry = map.get(card.player.id) ?? { player: card.player, copies: [] }
      entry.copies.push({ reliability: card.reliability, copyKey: card.copyKey })
      map.set(card.player.id, entry)
    }
    return Array.from(map.values())
  }, [filteredCards])

  const availableTiers = (['platinum', 'gold', 'silver', 'bronze'] as Tier[]).filter(t =>
    cards.some(c => c.player.tier === t)
  )

  const expandedGroup = expandedPlayerId ? grouped.find(g => g.player.id === expandedPlayerId) ?? null : null

  function handleCardTap(group: { player: Player; copies: { reliability: number | null; copyKey: string }[] }) {
    if (group.copies.length === 1) {
      const copy = group.copies[0]
      const alreadySelected = selectedCard?.copyKey === copy.copyKey
      onSelect(alreadySelected ? null : { player: group.player, reliability: copy.reliability, copyKey: copy.copyKey })
    } else {
      setExpandedPlayerId(prev => prev === group.player.id ? null : group.player.id)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col" onClick={onClose}>
      {/* Header */}
      <div
        className="w-full flex-shrink-0 relative overflow-hidden"
        style={{ background: 'linear-gradient(to bottom, rgba(180,130,0,0.18) 0%, transparent 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Gold top accent line */}
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #FFD700, transparent)' }} />

        <div className="max-w-4xl mx-auto px-5 pt-7 pb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] mb-1" style={{ color: '#FFD700' }}>Phone a Player</p>
          <p className="text-white text-2xl font-black leading-tight">Choose Your Lifeline</p>
          <p className="text-white/60 text-xs mt-1.5">
            {selectedCard
              ? `${selectedCard.player.name} · ${selectedCard.reliability ?? RELIABILITY_FALLBACK[selectedCard.player.tier]}% reliable`
              : 'Tap a card, or play without one'}
          </p>

          {availableTiers.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-3">
              <button
                onClick={() => setTierFilter('all')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors ${
                  tierFilter === 'all' ? 'border-[#FFD700] text-[#FFD700]' : 'text-white/50 border-white/20 hover:border-white/40'
                }`}
              >
                All ({grouped.length})
              </button>
              {availableTiers.map(t => {
                const count = grouped.filter(g => g.player.tier === t).length
                return (
                  <button key={t} onClick={() => setTierFilter(t)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold capitalize transition-colors ${
                      tierFilter === t ? 'border-[#FFD700] text-[#FFD700]' : 'text-white/50 border-white/20 hover:border-white/40'
                    }`}
                  >
                    {t === 'platinum' ? 'Plat' : t.charAt(0).toUpperCase() + t.slice(1)} ({count})
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable card grid — same layout as collection */}
      <div className="flex-1 overflow-y-auto" onClick={e => e.stopPropagation()}>
        {grouped.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-8">No {tierFilter} cards.</p>
        ) : (
          <div className="max-w-4xl mx-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 px-4 py-2">
            {grouped.map(group => {
              const isSelected = selectedCard?.player.id === group.player.id
              const bestReliability = group.copies.reduce<number | null>((best, c) => {
                if (c.reliability === null) return best
                return best === null ? c.reliability : Math.max(best, c.reliability)
              }, null)
              return (
                <button
                  key={group.player.id}
                  onClick={() => handleCardTap(group)}
                  className="relative aspect-[5/7] rounded-xl overflow-hidden"
                >
                  <FullCard player={group.player} isSelected={isSelected} reliability={bestReliability} />
                  {group.copies.length > 1 && (
                    <div className="absolute top-6 right-1 z-30 w-8 h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-black text-white leading-none">×{group.copies.length}</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pb-10 pt-4 flex-shrink-0 flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          disabled={!selectedCard}
          style={selectedCard ? { background: 'linear-gradient(90deg,#b8860b,#ffd700,#daa520)', color: '#1a1400' } : undefined}
          className={`w-64 py-3 rounded-xl text-sm font-black transition-all shadow-lg ${
            selectedCard
              ? 'hover:brightness-110'
              : 'bg-white/10 text-white/25 cursor-not-allowed'
          }`}
        >
          {selectedCard ? `Phone ${selectedCard.player.name.split(' ').slice(-1)[0]}` : 'Select a Card'}
        </button>
        <button
          onClick={() => { onSelect(null); onClose() }}
          className="text-white/50 text-xs font-semibold hover:text-white/70 transition-colors"
        >
          Play Without Lifeline
        </button>
      </div>

      {/* Copy picker sheet */}
      {expandedGroup && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex flex-col justify-end"
          onClick={() => setExpandedPlayerId(null)}
        >
          <div
            className="bg-[#1a1714] rounded-t-3xl px-5 pt-5 pb-10"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-0.5">Choose Copy</p>
            <p className="text-white font-black text-lg mb-4">{expandedGroup.player.name}</p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {expandedGroup.copies.map((copy, i) => {
                const isSelected = selectedCard?.copyKey === copy.copyKey
                return (
                  <button
                    key={copy.copyKey}
                    onClick={() => {
                      onSelect(isSelected ? null : { player: expandedGroup.player, reliability: copy.reliability, copyKey: copy.copyKey })
                      setExpandedPlayerId(null)
                    }}
                    className="flex-shrink-0 flex flex-col items-center gap-1.5"
                  >
                    <div className="w-28 aspect-[5/7] rounded-xl overflow-hidden">
                      <FullCard player={expandedGroup.player} isSelected={isSelected} reliability={copy.reliability} />
                    </div>
                    <p className="text-white/50 text-[10px] font-semibold tabular-nums">
                      Copy {i + 1} · {copy.reliability ?? RELIABILITY_FALLBACK[expandedGroup.player.tier]}%
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
