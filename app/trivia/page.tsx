'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, USER_ID } from '@/lib/supabase'
import { PAYOUTS, SAFETY_NET_STEPS, PHONE_RELIABILITY_DEFAULT } from '@/lib/trivia-logic'
import { useCredits } from '@/lib/credits-context'
import type { Player, Tier, ActionCardType } from '@/lib/types'
import { TIER_LABEL } from '@/lib/game-logic'
import { Tooltip } from '@/components/Tooltip'
import { ActionCard } from '@/components/ActionCard'

interface UserActionCardWithType {
  id: string
  action_card_type_id: string
  used: boolean
  type: ActionCardType
}

const CARD_STYLE: Record<Tier, {
  gradient: string; border: string; foil: string; foilClass: string
  label: string; footer: string; glow: string
}> = {
  bronze:   { gradient: 'from-amber-600 via-amber-900 to-stone-950',  border: 'border-amber-500/80',  foil: 'from-amber-500/25 to-transparent',  foilClass: 'foil-sweep',          label: 'text-amber-300',  footer: 'from-stone-950',   glow: 'glow-bronze' },
  silver:   { gradient: 'from-slate-300 via-slate-600 to-slate-900',  border: 'border-slate-300/70',  foil: 'from-slate-200/20 to-transparent',  foilClass: 'foil-sweep',          label: 'text-slate-200',  footer: 'from-slate-900',   glow: 'glow-silver' },
  gold:     { gradient: 'from-yellow-400 via-yellow-800 to-amber-950', border: 'border-yellow-400/80', foil: 'from-yellow-300/30 to-transparent', foilClass: 'foil-sweep-gold',     label: 'text-yellow-200', footer: 'from-amber-950',   glow: 'glow-gold' },
  platinum: { gradient: 'from-cyan-400 via-blue-700 to-indigo-950',   border: 'border-cyan-300/80',   foil: 'from-blue-200/25 to-transparent',   foilClass: 'foil-sweep-platinum', label: 'text-cyan-200',   footer: 'from-indigo-950',  glow: 'glow-platinum' },
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

export default function TriviaPage() {
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
    const res = await fetch('/api/trivia/session')
    if (res.status === 409) {
      setStatus('generating')
      await Promise.all([1, 2, 3].map(diff =>
        fetch('/api/trivia/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ difficulty: diff, count: 20 }),
        })
      ))
      const retry = await fetch('/api/trivia/session')
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
    loadSession()
    supabase
      .from('user_cards')
      .select('id, quantity, reliability, player:players(*)')
      .eq('user_id', USER_ID)
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
      .eq('user_id', USER_ID)
      .eq('used', false)
      .then(({ data }) => {
        const cards = (data ?? []) as UserActionCardWithType[]
        setTriviaActionCards(cards.filter(c => c.type?.context === 'trivia'))
      })
  }, [loadSession])

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
    fetch('/api/trivia/answer', {
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
        if ((data.credits_earned ?? 0) > 0) setCredits(c => (c ?? 0) + data.credits_earned)
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

    const res = await fetch('/api/trivia/answer', {
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
      if (data.status === 'won') {
        setCreditsEarned(PAYOUTS[15])
        setStatus('won')
        setCredits(c => (c ?? 0) + PAYOUTS[15])
      } else {
        if (SAFETY_NET_STEPS.has(done)) {
          setCredits(c => (c ?? 0) + PAYOUTS[done])
        }
        setStatus('correct_pause')
      }
    } else {
      setCreditsEarned(data.credits_floor ?? data.credits_earned)
      setStatus('lost')
      if (data.credits_earned > 0) setCredits(c => (c ?? 0) + data.credits_earned)
    }
    setAnswerLoading(false)
  }

  async function useLifeline(type: 'fifty' | 'phone' | 'audience', playerId?: string, reliability?: number | null) {
    if (!session || lifelineLoading) return
    setLifelineLoading(true)
    const res = await fetch('/api/trivia/lifeline', {
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
    const res = await fetch('/api/trivia/walkaway', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id }),
    })
    if (!res.ok) return
    const data = await res.json()
    if ((data.topUp ?? 0) > 0) setCredits(c => (c ?? 0) + data.topUp)
    setCreditsEarned(data.earned ?? 0)
    setStatus('walked_away')
  }

  async function useSkip() {
    if (!session || answerLoading || skipLoading) return
    const card = triviaActionCards.find(c => c.type.id === 'skip')
    if (!card) return
    setSkipLoading(true)
    const res = await fetch('/api/trivia/skip', {
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
    const res = await fetch('/api/trivia/safety-net', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, action_card_id: card.id }),
    })
    const data = await res.json()
    if (data.new_floor !== undefined) {
      setSession(s => s ? { ...s, credits_floor: data.new_floor } : s)
      if ((data.credits_awarded ?? 0) > 0) setCredits(c => (c ?? 0) + data.credits_awarded)
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
          onClick={async () => { await fetch('/api/trivia/session', { method: 'DELETE' }); window.location.reload() }}
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
          onClick={async () => { await fetch('/api/trivia/session', { method: 'DELETE' }); window.location.reload() }}
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

            {/* Jackpot headline */}
            <div className="text-center py-6">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#a39890] mb-2">Daily Jackpot</p>
              <p className="text-7xl font-black text-[#1a1714] leading-none tracking-tight">1,000</p>
              <p className="text-lg font-black text-amber-500 tracking-widest uppercase mt-1">credits</p>
              <p className="text-xs text-[#a39890] mt-3 max-w-xs mx-auto leading-relaxed">
                Answer all 15 correctly. A wrong answer ends the game — you keep what you&apos;ve locked in.
              </p>
            </div>

              {/* Lifelines — 3 individual boxes */}
              <p className="text-[9px] font-black uppercase tracking-widest text-[#a39890]">Lifelines</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: '50 / 50', desc: 'Eliminate two wrong answers' },
                  { name: 'Ask Coach', desc: 'See how the crowd would vote' },
                  { name: 'Phone a Player', desc: 'Your card guesses the answer' },
                ].map(l => (
                  <div key={l.name} className="bg-white border border-[#e2ddd6] rounded-xl p-3 shadow-sm">
                    <p className="text-[10px] font-black text-[#1a1714] leading-tight mb-1">{l.name}</p>
                    <p className="text-[9px] text-[#a39890] leading-tight">{l.desc}</p>
                  </div>
                ))}
              </div>

              {/* Phone-a-player card picker */}
              {ownedCards.length > 0 && (
                <div className="bg-[#faf9f6] border border-[#e2ddd6] rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#a39890] mb-1">Phone a Player</p>
                  <p className="text-[10px] text-[#6b6259] mb-2 leading-relaxed">
                    Pick a card as your lifeline. Higher tier = more reliable.
                    {selectedPhoneCard && <span className="text-red-500/70"> Burns if you lose after using it.</span>}
                  </p>
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
                </div>
              )}

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


      {/* ── Playing: two-column layout ── */}
      {(status === 'playing' || status === 'revealed' || status === 'correct_pause') && currentQ && (
        <div className="flex gap-3 items-start">

          {/* LEFT: question + answers — content pinned to bottom */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex-1" />

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
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-bold text-blue-700 mb-2">Coach&apos;s Read</p>
                <div className="space-y-1">
                  {OPTION_LABELS.map(key => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 w-4">{key.toUpperCase()}</span>
                      <div className="flex-1 bg-blue-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${audienceData[key]}%` }} />
                      </div>
                      <span className="text-xs text-blue-600 font-bold w-8 text-right">{audienceData[key]}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phone result */}
            {phoneResult && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <span className="font-bold text-amber-800">{phoneResult.name}</span>
                  <span className="text-amber-700"> says </span>
                  <span className="font-black text-amber-800">{phoneResult.hint.toUpperCase()}</span>
                </div>
                <span className="text-[10px] text-amber-500/60 capitalize flex-shrink-0">{phoneResult.tier}</span>
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

            {/* Beta: flag this question */}
            {(status === 'revealed' || status === 'correct_pause') && currentQ && (
              <div className="flex justify-end">
                {flagged.has(currentQ.id) ? (
                  <span className="text-[10px] text-[#a39890] font-bold">🚩 Flagged — thanks!</span>
                ) : (
                  <button
                    onClick={async () => {
                      setFlagging(true)
                      await fetch('/api/trivia/flag', {
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

          {/* RIGHT: lifelines + vertical money ladder */}
          <div className="w-36 flex-shrink-0 space-y-2">

            {/* Lifelines */}
            {status !== 'correct_pause' && (
              <div className="bg-white border border-[#e2ddd6] rounded-2xl p-2.5 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#a39890] text-center mb-2">Lifelines</p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => !session?.lifeline_fifty_used && useLifeline('fifty')}
                    disabled={!!session?.lifeline_fifty_used || lifelineLoading || status === 'revealed'}
                    className={lifelineUsed(session?.lifeline_fifty_used)}
                  >
                    50 / 50
                  </button>
                  <button
                    onClick={() => !session?.lifeline_audience_used && useLifeline('audience')}
                    disabled={!!session?.lifeline_audience_used || lifelineLoading || status === 'revealed'}
                    className={lifelineUsed(session?.lifeline_audience_used)}
                  >
                    Ask Coach
                  </button>
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        if (!session?.lifeline_phone_used && selectedPhoneCard && !lifelineLoading && status !== 'revealed') {
                          useLifeline('phone', selectedPhoneCard.player.id, selectedPhoneCard.reliability)
                        }
                      }}
                      disabled={!!session?.lifeline_phone_used || !selectedPhoneCard || lifelineLoading || status === 'revealed'}
                      className={lifelineUsed(session?.lifeline_phone_used, !selectedPhoneCard)}
                    >
                      📞 {selectedPhoneCard ? selectedPhoneCard.player.name.split(' ').slice(-1)[0] : 'Phone'}
                    </button>
                    {selectedPhoneCard && !session?.lifeline_phone_used && (
                      <p className="text-[8px] text-red-400/70 text-center leading-tight">burns if you lose</p>
                    )}
                  </div>
                </div>

                {/* Action cards — shown as proper cards */}
                {triviaActionCards.some(c => c.type.id === 'skip') && (
                  <div className="mt-2 pt-2 border-t border-[#e2ddd6]">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#a39890] text-center mb-2">Cards</p>
                    <div className="flex flex-wrap justify-center gap-1.5">
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
                  </div>
                )}
              </div>
            )}

            {/* Vertical money ladder — Q15 at top, Q1 at bottom */}
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
                      style={{ clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)' }}
                      className={`flex items-center justify-between px-5 py-[5px] transition-all ${
                        isCurrent
                          ? 'bg-amber-400'
                          : isSafetyNet
                            ? isPast ? 'bg-emerald-200' : 'bg-emerald-100'
                            : isPast
                              ? 'bg-[#ddd9d3]'
                              : 'bg-[#ede9e4]'
                      }`}
                    >
                      <span className={`text-[9px] font-bold tabular-nums ${
                        isCurrent ? 'text-amber-900' : isSafetyNet ? 'text-emerald-700' : isPast ? 'text-[#b8b2a8]' : 'text-[#a39890]'
                      }`}>
                        {q}
                      </span>
                      <span className={`text-[10px] font-black tabular-nums ${
                        isCurrent ? 'text-white' : isSafetyNet ? 'text-emerald-800' : isPast ? 'text-[#b8b2a8]' : 'text-[#1a1714]'
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
  const initials = player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className={`w-full h-full relative rounded-xl border-2 overflow-hidden bg-gradient-to-b ${s.gradient} ${s.border} ${s.glow} ${isSelected ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${s.foil} pointer-events-none`} />
      <div className={`${s.foilClass} absolute inset-0`} />
      {isPlatinum && <div className="holo-overlay" />}
      <div className="absolute inset-[2px] rounded-[9px] border border-white/[0.07] pointer-events-none z-10" />

      {/* Top banner */}
      <div className="absolute top-0 inset-x-0 z-20 bg-black/50 flex items-center justify-between gap-1 px-2 py-1.5">
        {reliability != null ? (
          <span className="bg-white/25 rounded-full px-2 py-px text-[8px] font-black text-white leading-none">
            {reliability}%
          </span>
        ) : (
          <span />
        )}
        <span className={`rounded-full px-2 py-px text-[7px] font-black uppercase leading-none bg-white/15 ${s.label} ${isPlatinum ? 'platinum-shimmer' : ''}`}>
          {TIER_LABEL[player.tier]}
        </span>
      </div>

      <div className="absolute inset-x-0 top-[26px] bottom-10 overflow-hidden">
        {player.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.image_url} alt={player.name} className="w-full h-full object-cover object-top"
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-black text-white/15 select-none">{initials}</span>
          </div>
        )}
      </div>

      <div className={`absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t ${s.footer} to-transparent`} />

      <div className="absolute bottom-0 inset-x-0 px-2 pb-2 z-20">
        <div className="text-white font-black text-[10px] uppercase tracking-wide leading-tight truncate drop-shadow-lg">
          {player.name}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-white/50 text-[8px] uppercase">{player.team_abbr}</span>
          <span className={`text-[9px] font-black ${s.label}`}>{player.multiplier}×</span>
        </div>
      </div>

      {isSelected && <div className="absolute inset-0 bg-amber-400/10 pointer-events-none z-30 rounded-xl" />}
    </div>
  )
}

type TierFilter = 'all' | Tier

function cardSpreadSize(n: number): { w: number; h: number } {
  const w = n <= 2 ? 160 : n <= 4 ? 140 : n <= 8 ? 118 : n <= 14 ? 98 : 82
  return { w, h: Math.round(w * 7 / 5) }
}

function PhoneCardOverlay({
  cards, selectedCard, onSelect, onClose,
}: {
  cards: { player: Player; reliability: number | null; copyKey: string }[]
  selectedCard: { player: Player; reliability: number | null; copyKey: string } | null
  onSelect: (card: { player: Player; reliability: number | null; copyKey: string } | null) => void
  onClose: () => void
}) {
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')

  const filteredCards = tierFilter === 'all' ? cards : cards.filter(c => c.player.tier === tierFilter)

  const { w: cardW, h: cardH } = cardSpreadSize(filteredCards.length)
  const padding = 48
  const maxSpread = typeof window !== 'undefined' ? window.innerWidth - padding : 360
  const step = filteredCards.length <= 1
    ? 0
    : Math.min(Math.round(cardW * 0.82), Math.floor((maxSpread - cardW) / (filteredCards.length - 1)))
  const fanW = filteredCards.length <= 1 ? cardW : step * (filteredCards.length - 1) + cardW
  const liftPx = Math.round(cardH * 0.14)

  const availableTiers = (['platinum', 'gold', 'silver', 'bronze'] as Tier[]).filter(t =>
    cards.some(c => c.player.tier === t)
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div className="px-5 pt-7 pb-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-0.5">Phone a Player</p>
        <p className="text-white text-xl font-black leading-tight">Choose Your Lifeline</p>
        <p className="text-white/50 text-xs mt-1">
          {selectedCard
            ? `${selectedCard.player.name} · ${selectedCard.reliability ?? RELIABILITY_FALLBACK[selectedCard.player.tier]}% reliable`
            : 'Tap a card — or play without one'}
        </p>

        {availableTiers.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-3">
            <button
              onClick={() => setTierFilter('all')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors ${
                tierFilter === 'all' ? 'bg-white text-[#1a1714] border-white' : 'text-white/50 border-white/20 hover:border-white/40'
              }`}
            >
              All ({cards.length})
            </button>
            {availableTiers.map(t => {
              const count = cards.filter(c => c.player.tier === t).length
              return (
                <button
                  key={t}
                  onClick={() => setTierFilter(t)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold capitalize transition-colors ${
                    tierFilter === t ? 'bg-white text-[#1a1714] border-white' : 'text-white/50 border-white/20 hover:border-white/40'
                  }`}
                >
                  {t === 'platinum' ? 'Plat' : t.charAt(0).toUpperCase() + t.slice(1)} ({count})
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Card spread */}
      <div className="flex-1 flex items-center justify-center" onClick={e => e.stopPropagation()}>
        {filteredCards.length === 0 ? (
          <p className="text-white/40 text-sm">No {tierFilter} cards.</p>
        ) : (
          <div style={{ position: 'relative', width: fanW, height: cardH + liftPx }}>
            {filteredCards.map((card, i) => {
              const isSelected = selectedCard?.copyKey === card.copyKey
              return (
                <button
                  key={`${card.player.id}-${i}`}
                  style={{
                    position: 'absolute',
                    left: step * i,
                    top: 0,
                    width: cardW,
                    height: cardH,
                    zIndex: isSelected ? filteredCards.length + 10 : i + 1,
                    transform: isSelected
                      ? `translateY(-${liftPx}px) scale(1.04)`
                      : 'translateY(0) scale(1)',
                    transition: 'transform 0.15s ease',
                  }}
                  onClick={() => onSelect(isSelected ? null : card)}
                >
                  <FullCard player={card.player} isSelected={isSelected} reliability={card.reliability} />
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
          className={`w-64 py-3 rounded-xl text-sm font-black transition-all ${
            selectedCard
              ? 'bg-white text-[#1a1714] hover:bg-white/90'
              : 'bg-white/10 text-white/25 cursor-not-allowed'
          }`}
        >
          {selectedCard ? `Phone ${selectedCard.player.name.split(' ').slice(-1)[0]}` : 'Select a Card'}
        </button>
        <button
          onClick={() => { onSelect(null); onClose() }}
          className="text-white/40 text-xs font-semibold hover:text-white/60 transition-colors"
        >
          Play Without Lifeline
        </button>
      </div>
    </div>
  )
}
