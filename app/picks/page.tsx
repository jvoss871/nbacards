'use client'

import { useEffect, useRef, useState } from 'react'
import { PicksSkeleton } from '@/components/Skeleton'
import { supabase, USER_ID } from '@/lib/supabase'
import type { Game, Player, Prediction, Tier, ActionCardType } from '@/lib/types'

interface UserActionCardWithType {
  id: string
  action_card_type_id: string
  used: boolean
  type: ActionCardType
}
import { calcCreditsEarned, availableCardsForTeam, TIER_LABEL } from '@/lib/game-logic'
import GameCard from '@/components/GameCard'
import { ActionCard } from '@/components/ActionCard'
import { useCredits } from '@/lib/credits-context'

function getLocalDateStr(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

const today = getLocalDateStr(0)
const weekDates = Array.from({ length: 7 }, (_, i) => getLocalDateStr(i))

function formatDayParts(dateStr: string): { label: string; date: string } {
  const d = new Date(dateStr + 'T12:00:00')
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December']
  const date = `${months[d.getMonth()]} ${d.getDate()}`
  if (dateStr === today) return { label: 'Today', date }
  if (dateStr === getLocalDateStr(1)) return { label: 'Tomorrow', date }
  return { label: days[d.getDay()], date }
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

// Card dimensions for the wager fan (px)
const FAN_W = 144
const FAN_H = Math.round(FAN_W * 7 / 5)  // 202
const FAN_LIFT = 33

// Distribute n cards evenly across a fan arc, wider spread for more cards
function fanRotations(n: number): number[] {
  if (n === 1) return [0]
  const halfSpread = Math.min(26, 10 + n * 3)
  return Array.from({ length: n }, (_, i) =>
    -halfSpread + (i / (n - 1)) * halfSpread * 2
  )
}

function WagerCard({ player, isSelected, rotation, zIndex, onSelect }: {
  player: Player
  isSelected: boolean
  rotation: number
  zIndex: number
  onSelect: () => void
}) {
  const s = CARD_STYLE[player.tier]
  const isPlatinum = player.tier === 'platinum'
  const initials = player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <button
      onClick={onSelect}
      style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        marginLeft: -FAN_W / 2,
        width: FAN_W,
        height: FAN_H,
        zIndex,
        transform: isSelected
          ? `rotate(0deg) scale(1.08) translateY(-${FAN_LIFT}px)`
          : `rotate(${rotation}deg)`,
        transformOrigin: 'bottom center',
        transition: 'transform 0.15s ease',
      }}
      className={`relative rounded-xl border-2 overflow-hidden bg-gradient-to-b ${s.gradient} ${s.border} ${s.glow} ${
        isSelected ? 'ring-2 ring-amber-400 ring-offset-2' : ''
      }`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${s.foil} pointer-events-none`} />
      <div className={`${s.foilClass} absolute inset-0`} />
      {isPlatinum && <div className="holo-overlay" />}
      <div className="absolute inset-[2px] rounded-[9px] border border-white/[0.07] pointer-events-none z-10" />

      {/* Top banner */}
      <div className="absolute top-0 inset-x-0 z-20 bg-black/50 flex items-center justify-between gap-1 px-1.5 py-1">
        <span className="text-[6px] font-bold text-white/30 uppercase tracking-[0.2em]">CardPicks</span>
        <span className={`rounded-full px-1.5 py-px text-[6px] font-black uppercase leading-none bg-white/15 ${s.label} ${isPlatinum ? 'platinum-shimmer' : ''}`}>
          {TIER_LABEL[player.tier]}
        </span>
      </div>

      <div className="absolute inset-x-0 top-[20px] bottom-8 overflow-hidden">
        {player.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.image_url}
            alt={player.name}
            className="w-full h-full object-cover object-top"
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl font-black text-white/15 select-none">{initials}</span>
          </div>
        )}
      </div>

      <div className={`absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t ${s.footer} to-transparent`} />

      <div className="absolute bottom-0 inset-x-0 px-1.5 pb-1.5 z-20">
        <div className="text-white font-black text-[8px] uppercase tracking-wide leading-tight truncate drop-shadow-lg">
          {player.name}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-white/50 text-[6px] uppercase">{player.team_abbr}</span>
          <span className={`text-[7px] font-black ${s.label}`}>{player.multiplier}×</span>
        </div>
      </div>

      {isSelected && (
        <div className="absolute inset-0 bg-amber-400/10 pointer-events-none z-30 rounded-xl" />
      )}
    </button>
  )
}

const TIER_SHORT: Record<Tier, string> = { platinum: 'PLT', gold: 'GLD', silver: 'SLV', bronze: 'BRZ' }
const TIER_REL_DEFAULT: Record<Tier, number> = { platinum: 90, gold: 75, silver: 60, bronze: 45 }

function CardFace({ player, isSelected, compact, reliability }: { player: Player; isSelected?: boolean; compact?: boolean; reliability?: number | null }) {
  const s = CARD_STYLE[player.tier]
  const isPlatinum = player.tier === 'platinum'
  const initials = player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className={`w-full h-full relative rounded-2xl border-2 overflow-hidden bg-gradient-to-b ${s.gradient} ${s.border} ${s.glow} ${isSelected ? 'ring-4 ring-amber-400 ring-offset-2' : ''}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${s.foil} pointer-events-none`} />
      <div className={`${s.foilClass} absolute inset-0`} />
      {isPlatinum && <div className="holo-overlay" />}
      <div className="absolute inset-[2px] rounded-[14px] border border-white/[0.07] pointer-events-none z-10" />

      {/* Top banner */}
      <div className={`absolute top-0 inset-x-0 z-20 bg-black/50 flex items-center px-1.5 py-1 justify-between`}>
        {compact ? (
          <span className="bg-white/25 rounded-full px-1 py-px text-[8px] font-black text-white leading-none">
            {reliability ?? TIER_REL_DEFAULT[player.tier]}%
          </span>
        ) : (
          <span className="text-[7px] font-bold text-white/30 uppercase tracking-[0.2em]">CardPicks</span>
        )}
        <span className={`rounded-full px-1.5 py-px font-black uppercase leading-none bg-white/15 ${compact ? 'text-[6px]' : 'text-[8px]'} ${s.label} ${isPlatinum ? 'platinum-shimmer' : ''}`}>
          {compact ? TIER_SHORT[player.tier] : TIER_LABEL[player.tier]}
        </span>
      </div>

      {/* Image — leaves room for bottom banner */}
      <div className={`absolute inset-x-0 overflow-hidden ${compact ? 'top-[16px] bottom-10' : 'top-[26px] bottom-12'}`}>
        {player.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.image_url} alt={player.name} className="w-full h-full object-cover object-top"
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className={`font-black text-white/15 select-none ${compact ? 'text-3xl' : 'text-5xl'}`}>{initials}</span>
          </div>
        )}
      </div>

      {/* Bottom banner — solid dark strip so name is always readable */}
      <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t ${s.footer} to-transparent ${compact ? 'h-12' : 'h-16'}`} />

      {/* Bottom text sits inside the banner */}
      <div className={`absolute bottom-0 inset-x-0 z-20 ${compact ? 'px-1.5 pb-1.5' : 'px-2.5 pb-2.5'}`}>
        <div className={`text-white font-black uppercase leading-tight drop-shadow-lg ${compact ? 'text-[7px] line-clamp-2 tracking-normal' : 'text-[11px] truncate tracking-wide'}`}>
          {player.name}
        </div>
        {compact ? (
          <span className={`text-[9px] font-black ${s.label}`}>{player.multiplier}×</span>
        ) : (
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-white/50 text-[9px] uppercase">{player.team_abbr}</span>
            <span className={`text-[10px] font-black ${s.label}`}>{player.multiplier}×</span>
          </div>
        )}
      </div>

      {isSelected && <div className="absolute inset-0 bg-amber-400/10 pointer-events-none z-30 rounded-2xl" />}
    </div>
  )
}

function cardSpreadSize(n: number): { w: number; h: number } {
  const w = n <= 2 ? 160 : n <= 4 ? 140 : n <= 8 ? 118 : n <= 14 ? 98 : 82
  return { w, h: Math.round(w * 7 / 5) }
}

function WagerOverlay({
  side, game, cards, reliabilityByPlayer, selectedCard, onSelect, onClose,
  insuranceCard, doubleDownCard, insuranceActive, doubleDownActive, onInsuranceToggle, onDoubleDownToggle,
}: {
  side: 'home' | 'away'
  game: Game
  cards: Player[]
  reliabilityByPlayer: Record<string, number | null>
  selectedCard: Player | null
  onSelect: (card: Player | null) => void
  onClose: () => void
  insuranceCard?: ActionCardType
  doubleDownCard?: ActionCardType
  insuranceActive?: boolean
  doubleDownActive?: boolean
  onInsuranceToggle?: () => void
  onDoubleDownToggle?: () => void
}) {
  const teamName = side === 'home' ? game.home_team : game.away_team
  const abbr     = side === 'home' ? game.home_team_abbr : game.away_team_abbr

  const { w: cardW, h: cardH } = cardSpreadSize(cards.length)
  const padding = 48
  const maxSpread = Math.min(
    typeof window !== 'undefined' ? window.innerWidth - padding : 360
  )
  const step = cards.length <= 1
    ? 0
    : Math.min(Math.round(cardW * 0.82), Math.floor((maxSpread - cardW) / (cards.length - 1)))
  const fanW = cards.length <= 1 ? cardW : step * (cards.length - 1) + cardW
  const liftPx = Math.round(cardH * 0.14)

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div className="px-5 pt-7 pb-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-0.5">{abbr}</p>
        <p className="text-white text-xl font-black leading-tight">{teamName}</p>
        {selectedCard ? (
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-white/50 text-xs">{selectedCard.name} · {selectedCard.multiplier}× wagered</span>
            <span className={`text-sm font-black tabular-nums ${doubleDownActive ? 'text-amber-400' : 'text-white/70'}`}>
              +{calcCreditsEarned(selectedCard.multiplier) * (doubleDownActive ? 2 : 1)} cr
              {doubleDownActive && <span className="text-[10px] ml-1 opacity-70">(2×)</span>}
            </span>
          </div>
        ) : (
          <p className="text-white/50 text-xs mt-1">Tap a card to wager — or play without one</p>
        )}
      </div>

      {/* Card spread */}
      <div className="flex-1 flex items-center justify-center" onClick={e => e.stopPropagation()}>
        {cards.length === 0 ? (
          <p className="text-white/40 text-sm">No cards for this team.</p>
        ) : (
          <div style={{ position: 'relative', width: fanW, height: cardH + liftPx }}>
            {cards.map((player, i) => {
              const isSelected = selectedCard?.id === player.id
              return (
                <button
                  key={`${player.id}-${i}`}
                  style={{
                    position: 'absolute',
                    left: step * i,
                    top: 0,
                    width: cardW,
                    height: cardH,
                    zIndex: isSelected ? cards.length + 10 : i + 1,
                    transform: isSelected
                      ? `translateY(-${liftPx}px) scale(1.04)`
                      : 'translateY(0) scale(1)',
                    transition: 'transform 0.15s ease',
                  }}
                  onClick={() => onSelect(isSelected ? null : player)}
                >
                  <CardFace player={player} isSelected={isSelected} compact reliability={reliabilityByPlayer[player.id] ?? null} />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pb-10 pt-4 flex-shrink-0 flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
        {/* Action card modifiers */}
        {selectedCard && (insuranceCard || doubleDownCard) && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-4 items-end">
              {insuranceCard && (
                <ActionCard
                  cardType={insuranceCard}
                  active={!!insuranceActive}
                  onClick={onInsuranceToggle}
                />
              )}
              {doubleDownCard && (
                <ActionCard
                  cardType={doubleDownCard}
                  active={!!doubleDownActive}
                  onClick={onDoubleDownToggle}
                />
              )}
            </div>
            {(insuranceActive || doubleDownActive) && (
              <p className="text-white/40 text-[10px] text-center max-w-[220px] leading-relaxed">
                {insuranceActive
                  ? insuranceCard?.description
                  : doubleDownCard?.description}
              </p>
            )}
          </div>
        )}
        <button
          onClick={onClose}
          disabled={!selectedCard}
          className={`w-64 py-3 rounded-xl text-sm font-black transition-all ${
            selectedCard
              ? 'bg-white text-[#1a1714] hover:bg-white/90'
              : 'bg-white/10 text-white/25 cursor-not-allowed'
          }`}
        >
          {selectedCard ? `Wager ${selectedCard.name}` : 'Select a Card'}
        </button>
        <button
          onClick={() => { onSelect(null); onClose() }}
          className="text-white/40 text-xs font-semibold hover:text-white/60 transition-colors"
        >
          Play Without a Card
        </button>
      </div>
    </div>
  )
}

export default function PredictionsPage() {
  const [games, setGames] = useState<Game[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [ownedCards, setOwnedCards] = useState<{ player: Player; quantity: number; reliability: number[] | null }[]>([])
  const { credits, setCredits } = useCredits()
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [selectedDate, setSelectedDate] = useState(today)
  const [picksActionCards, setPicksActionCards] = useState<UserActionCardWithType[]>([])
  const [wagerInsurance, setWagerInsurance] = useState<Record<string, boolean>>({})
  const [wagerDoubleDown, setWagerDoubleDown] = useState<Record<string, boolean>>({})
const [draftPicks, setDraftPicks] = useState<Record<string, 'home' | 'away'>>({})
  const [wagerCards, setWagerCards] = useState<Record<string, Player | null>>({})
  const hasAutoSettled = useRef(false)
  const [activeWagerGameId, setActiveWagerGameId] = useState<string | null>(null)
  const [forcingWinner, setForcingWinner] = useState<string | null>(null)

  useEffect(() => {
    syncThenLoad()
  }, [])

  async function syncThenLoad() {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: weekDates }),
      })
    } catch {
      // Non-fatal
    }
    loadAll()
  }

  async function loadAll() {
    const [gamesRes, predsRes, cardsRes, actionRes] = await Promise.all([
      supabase.from('games').select('*').order('game_date').order('game_time'),
      supabase.from('predictions').select('*').eq('user_id', USER_ID),
      supabase.from('user_cards').select('*, player:players(*)').eq('user_id', USER_ID),
      supabase.from('user_action_cards').select('*, type:action_card_types(*)').eq('user_id', USER_ID).eq('used', false),
    ])

    setGames(gamesRes.data ?? [])
    setPredictions(predsRes.data ?? [])
    setOwnedCards(
      (cardsRes.data ?? []).map((c: { player: unknown; quantity: number; reliability: number[] | null }) => ({
        player: c.player as Player,
        quantity: c.quantity,
        reliability: c.reliability,
      }))
    )
    const allAction = (actionRes.data ?? []) as UserActionCardWithType[]
    setPicksActionCards(allAction.filter(c => c.type?.context === 'picks'))
    setLoading(false)
  }

  function getPrediction(gameId: string) {
    return predictions.find(p => p.game_id === gameId)
  }

  function handlePredict(game: Game, side: 'home' | 'away') {
    if (getPrediction(game.id)) return
    const currentPick = draftPicks[game.id]
    if (currentPick === side) {
      setDraftPicks(prev => { const n = { ...prev }; delete n[game.id]; return n })
      setActiveWagerGameId(prev => prev === game.id ? null : prev)
    } else {
      setDraftPicks(prev => ({ ...prev, [game.id]: side }))
      const abbr = side === 'away' ? game.away_team_abbr : game.home_team_abbr
      const hasCards = availableCardsForTeam(abbr, ownedCards, pendingWagerIds).length > 0
      if (hasCards) setActiveWagerGameId(game.id)
    }
    setWagerCards(prev => { const n = { ...prev }; delete n[game.id]; return n })
  }

  // All games for the selected date (scheduled + final) — used for display
  const allSelectedDateGames = games.filter(g => g.game_date === selectedDate)
  // Only scheduled games — used for lock/unlock/draft logic
  const selectedDateGames = allSelectedDateGames.filter(g => g.status === 'scheduled')

  async function handleLockIn() {
    const gamesToLock = selectedDateGames.filter(
      g => draftPicks[g.id] !== undefined && !getPrediction(g.id)
    )
    if (gamesToLock.length === 0) return

    const insuranceCard = picksActionCards.find(c => c.type.id === 'insurance')
    const doubleDownCard = picksActionCards.find(c => c.type.id === 'double_down')

    const inserts = gamesToLock.map(game => {
      const side = draftPicks[game.id]!
      const teamName = side === 'home' ? game.home_team : game.away_team
      const wagered = wagerCards[game.id] ?? null
      const useIns = !!(wagerInsurance[game.id] && insuranceCard && wagered)
      const useDbl = !!(wagerDoubleDown[game.id] && doubleDownCard)
      return {
        user_id: USER_ID,
        game_id: game.id,
        predicted_winner: side,
        predicted_team: teamName,
        multiplier_applied: wagered?.multiplier ?? 1.0,
        card_used_id: wagered?.id ?? null,
        insurance_card_id: useIns ? insuranceCard!.id : null,
        double_down_card_id: useDbl ? doubleDownCard!.id : null,
        status: 'pending' as const,
        credits_earned: null,
      }
    })

    // Mark consumed action cards as used immediately on lock
    const usedActionIds = new Set<string>()
    if (insuranceCard && gamesToLock.some(g => wagerInsurance[g.id] && wagerCards[g.id])) usedActionIds.add(insuranceCard.id)
    if (doubleDownCard && gamesToLock.some(g => wagerDoubleDown[g.id])) usedActionIds.add(doubleDownCard.id)
    for (const id of usedActionIds) {
      await supabase.from('user_action_cards').update({ used: true }).eq('id', id)
    }
    if (usedActionIds.size > 0) {
      setPicksActionCards(prev => prev.filter(c => !usedActionIds.has(c.id)))
    }

    const { data, error } = await supabase.from('predictions').insert(inserts).select()

    if (!error && data) {
      // Merge locally-known insurance/double_down values into the DB response in case
      // PostgREST schema cache omits ALTER TABLE columns from the response.
      const merged = data.map((row, i) => ({
        ...row,
        insurance_card_id:   inserts[i]?.insurance_card_id   ?? row.insurance_card_id   ?? null,
        double_down_card_id: inserts[i]?.double_down_card_id ?? row.double_down_card_id ?? null,
      }))
      setPredictions(prev => [...prev, ...merged])
      setDraftPicks(prev => {
        const next = { ...prev }
        gamesToLock.forEach(g => delete next[g.id])
        return next
      })
      setWagerCards(prev => {
        const next = { ...prev }
        gamesToLock.forEach(g => delete next[g.id])
        return next
      })
      setActiveWagerGameId(null)
      showToast(`Locked in ${data.length} pick${data.length > 1 ? 's' : ''}`, true)
    }
  }

  async function handleUnlock() {
    const lockedIds = selectedDateGames
      .map(g => getPrediction(g.id)?.id)
      .filter(Boolean) as string[]
    if (!lockedIds.length) return
    await supabase.from('predictions').delete().in('id', lockedIds)
    setPredictions(prev => prev.filter(p => !lockedIds.includes(p.id)))
    showToast('Picks unlocked', true)
  }

  async function settlePrediction(game: Game): Promise<{ correct: boolean; msg: string } | null> {
    if (!game.winner || game.status !== 'final') return null
    const pred = getPrediction(game.id)
    if (!pred || pred.status !== 'pending') return null

    const correct = pred.predicted_winner === game.winner
    const hasInsurance = !!pred.insurance_card_id
    const hasDoubleDown = !!pred.double_down_card_id
    const baseEarned = correct ? calcCreditsEarned(pred.multiplier_applied) : 0
    const earned = correct && hasDoubleDown ? baseEarned * 2 : baseEarned
    const cardWagered = !!pred.card_used_id
    const cardProtected = !correct && hasInsurance

    // Read fresh credits from DB to avoid stale closure value in batch runs
    const { data: state } = await supabase
      .from('user_state').select('credits').eq('user_id', USER_ID).single()
    const currentCredits = state?.credits ?? 0

    await Promise.all([
      supabase
        .from('predictions')
        .update({ status: correct ? 'correct' : 'incorrect', credits_earned: earned })
        .eq('id', pred.id),
      correct
        ? supabase.from('user_state').update({ credits: currentCredits + earned }).eq('user_id', USER_ID)
        : Promise.resolve({ error: null }),
    ])

    if (!correct && pred.card_used_id && !cardProtected) {
      await consumeCard(pred.card_used_id)
      setOwnedCards(prev => {
        const idx = prev.findIndex(c => c.player.id === pred.card_used_id)
        if (idx === -1) return prev
        if (prev[idx].quantity <= 1) return prev.filter((_, i) => i !== idx)
        return prev.map((c, i) => i === idx ? { ...c, quantity: c.quantity - 1 } : c)
      })
    }

    if (correct) setCredits(c => (c ?? 0) + earned)
    setPredictions(prev =>
      prev.map(p =>
        p.id === pred.id
          ? { ...p, status: correct ? 'correct' : 'incorrect', credits_earned: earned }
          : p
      )
    )

    const winSuffix = hasDoubleDown ? ` (2×!)` : ''
    const lossSuffix = cardProtected ? ' Player card retained · Insurance burned.' : cardWagered ? ' Card lost.' : ''
    const msg = correct
      ? `${game.away_team_abbr} @ ${game.home_team_abbr}: +${earned} cr${winSuffix}`
      : `${game.away_team_abbr} @ ${game.home_team_abbr}: missed.${lossSuffix}`

    return { correct, msg }
  }

  async function handleSettle(game: Game) {
    setSettling(true)
    const result = await settlePrediction(game)
    if (result) showToast(result.msg, result.correct)
    setSettling(false)
  }

  async function handleSettleAll() {
    if (pendingSettlement.length === 0) return
    setSettling(true)
    const results = []
    for (const game of [...pendingSettlement]) {
      const r = await settlePrediction(game)
      if (r) results.push(r)
    }
    const wins = results.filter(r => r.correct).length
    showToast(`Settled ${results.length} picks — ${wins} correct`, wins > 0)
    setSettling(false)
  }

  async function forceWinner(game: Game, winner: 'home' | 'away') {
    setForcingWinner(game.id)
    await fetch('/api/dev/set-game-winner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: game.id, winner }),
    })
    // Settle with the now-final game state before reloading
    const result = await settlePrediction({ ...game, status: 'final', winner })
    if (result) showToast(result.msg, result.correct)
    await loadAll()
    setForcingWinner(null)
  }

  async function consumeCard(playerId: string) {
    const { data } = await supabase
      .from('user_cards')
      .select('id, quantity')
      .eq('user_id', USER_ID)
      .eq('player_id', playerId)
      .single()

    if (!data) return

    if (data.quantity <= 1) {
      await supabase.from('user_cards').delete().eq('id', data.id)
    } else {
      await supabase.from('user_cards').update({ quantity: data.quantity - 1 }).eq('id', data.id)
    }
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const finalGames = games.filter(g => g.status === 'final')
  const pendingSettlement = finalGames.filter(g => {
    const pred = getPrediction(g.id)
    return pred && pred.status === 'pending'
  })

  // Auto-settle any pending picks on final games when page loads
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (loading || hasAutoSettled.current || pendingSettlement.length === 0) return
    hasAutoSettled.current = true
    handleSettleAll()
  }, [loading, pendingSettlement.length])

  const selectedIdx = weekDates.indexOf(selectedDate)
  const draftCount = selectedDateGames.filter(
    g => draftPicks[g.id] !== undefined && !getPrediction(g.id)
  ).length

  const pendingWagerIds = new Set(
    predictions
      .filter(p => p.status === 'pending' && p.card_used_id)
      .map(p => p.card_used_id!)
  )

  const activeGame = activeWagerGameId
    ? selectedDateGames.find(g => g.id === activeWagerGameId) ?? null
    : null

  const activeSide = activeWagerGameId ? draftPicks[activeWagerGameId] : undefined

  const activeCards = activeGame && activeSide
    ? availableCardsForTeam(
        activeSide === 'away' ? activeGame.away_team_abbr : activeGame.home_team_abbr,
        ownedCards, pendingWagerIds
      )
    : []

  const reliabilityByPlayer: Record<string, number | null> = {}
  for (const c of ownedCards) {
    reliabilityByPlayer[c.player.id] = c.reliability?.[0] ?? null
  }


  if (loading) return <PicksSkeleton />

  return (
    <div className="space-y-8">
      {toast && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg ${
            toast.ok ? 'bg-[#1a1714] text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {settling && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
          <p className="text-emerald-800 text-sm font-semibold">Settling picks...</p>
        </div>
      )}

      <section>
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 bg-white border border-[#e2ddd6] rounded-2xl px-2 py-2 shadow-sm">
            <button
              onClick={() => setSelectedDate(weekDates[selectedIdx - 1])}
              disabled={selectedIdx === 0}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-[#a39890] hover:text-[#1a1714] hover:bg-[#1a1714]/[0.06] disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-sm leading-none"
            >
              ←
            </button>
            <div className="text-center px-4 min-w-[130px]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#a39890]">
                {formatDayParts(selectedDate).label}
              </div>
              <div className="text-sm font-black text-[#1a1714] leading-tight mt-0.5">
                {formatDayParts(selectedDate).date}
              </div>
            </div>
            <button
              onClick={() => setSelectedDate(weekDates[selectedIdx + 1])}
              disabled={selectedIdx === weekDates.length - 1}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-[#a39890] hover:text-[#1a1714] hover:bg-[#1a1714]/[0.06] disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-sm leading-none"
            >
              →
            </button>
          </div>
        </div>

<div className="flex gap-2 mb-3">
          {draftCount > 0 && (
            <button
              onClick={handleLockIn}
              className="flex-1 py-2.5 rounded-xl bg-[#1a1714] hover:bg-[#2c2825] active:bg-[#1a1714] text-white text-sm font-bold transition-colors shadow-sm"
            >
              Lock In {draftCount} Pick{draftCount > 1 ? 's' : ''}
            </button>
          )}
          {selectedDateGames.some(g => getPrediction(g.id)) && (
            <button
              onClick={handleUnlock}
              className="px-3 py-2.5 rounded-xl border border-dashed border-[#c8c2b8] text-[#a39890] hover:border-red-300 hover:text-red-500 text-xs font-medium transition-colors"
            >
              Unlock
            </button>
          )}
        </div>

        {allSelectedDateGames.length === 0 ? (
          <p className="text-[#a39890] text-sm">No scheduled games this day.</p>
        ) : (
          <div className="space-y-3">
            {allSelectedDateGames.map(game => {
              const pred = getPrediction(game.id)
              const lockedWagerPlayer = pred?.card_used_id
                ? ownedCards.find(c => c.player.id === pred.card_used_id)?.player ?? null
                : null
              const effectiveWagerCard = wagerCards[game.id] ?? lockedWagerPlayer
              return (
                <div key={game.id} className="space-y-1">
                  <GameCard
                    game={game}
                    prediction={pred}
                    draftPick={draftPicks[game.id]}
                    wagerCard={effectiveWagerCard}
                    doubleDown={!!wagerDoubleDown[game.id]}
                    onPredict={handlePredict}
                  />
                  {game.status === 'scheduled' && (
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#c8c2b8]">Force</span>
                      <button
                        disabled={forcingWinner === game.id}
                        onClick={() => forceWinner(game, 'away')}
                        className="px-2 py-0.5 text-[9px] font-black rounded border border-[#e2ddd6] bg-white text-[#a39890] hover:border-[#1a1714]/30 hover:text-[#1a1714] disabled:opacity-40 transition-colors"
                      >
                        {game.away_team_abbr}
                      </button>
                      <button
                        disabled={forcingWinner === game.id}
                        onClick={() => forceWinner(game, 'home')}
                        className="px-2 py-0.5 text-[9px] font-black rounded border border-[#e2ddd6] bg-white text-[#a39890] hover:border-[#1a1714]/30 hover:text-[#1a1714] disabled:opacity-40 transition-colors"
                      >
                        {game.home_team_abbr}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {activeGame && activeSide && (
          <WagerOverlay
            side={activeSide}
            game={activeGame}
            cards={activeCards}
            reliabilityByPlayer={reliabilityByPlayer}
            selectedCard={activeWagerGameId ? wagerCards[activeWagerGameId] ?? null : null}
            onSelect={(card) => activeWagerGameId && setWagerCards(prev => ({ ...prev, [activeWagerGameId]: card }))}
            onClose={() => setActiveWagerGameId(null)}
            insuranceCard={picksActionCards.find(c => c.type.id === 'insurance')?.type}
            doubleDownCard={picksActionCards.find(c => c.type.id === 'double_down')?.type}
            insuranceActive={!!(activeWagerGameId && wagerInsurance[activeWagerGameId])}
            doubleDownActive={!!(activeWagerGameId && wagerDoubleDown[activeWagerGameId])}
            onInsuranceToggle={() => {
              if (!activeWagerGameId) return
              const next = !wagerInsurance[activeWagerGameId]
              setWagerInsurance(prev => ({ ...prev, [activeWagerGameId]: next }))
              if (next) setWagerDoubleDown(prev => ({ ...prev, [activeWagerGameId]: false }))
            }}
            onDoubleDownToggle={() => {
              if (!activeWagerGameId) return
              const next = !wagerDoubleDown[activeWagerGameId]
              setWagerDoubleDown(prev => ({ ...prev, [activeWagerGameId]: next }))
              if (next) setWagerInsurance(prev => ({ ...prev, [activeWagerGameId]: false }))
            }}
          />
        )}
      </section>

    </div>
  )
}
