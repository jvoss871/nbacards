'use client'

import { useEffect, useState } from 'react'
import { PicksSkeleton } from '@/components/Skeleton'
import { supabase } from '@/lib/supabase'
import { useUserId } from '@/lib/use-user-id'
import { authedFetch } from '@/lib/authed-fetch'
import type { Game, Player, Prediction, Tier, ActionCardType } from '@/lib/types'

interface UserActionCardWithType {
  id: string
  action_card_type_id: string
  used: boolean
  type: ActionCardType
}
import { calcCreditsEarned, availableCardsForTeam, TIER_LABEL } from '@/lib/game-logic'
import { teamLogoUrl } from '@/lib/team-logo'
import { lastNameFontSize, GOLD_HEX_BG, splitName } from '@/lib/card-utils'
import GameCard from '@/components/GameCard'
import { ActionCard } from '@/components/ActionCard'
import { OnboardingCallout } from '@/components/OnboardingCallout'
import { useLockBodyScroll } from '@/lib/use-lock-body-scroll'
import { useCredits } from '@/lib/credits-context'

function getETDateStr(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('sv-SE', { timeZone: 'America/New_York' })
}

const today = getETDateStr(0)
const weekDates = Array.from({ length: 7 }, (_, i) => getETDateStr(i))

function formatDayParts(dateStr: string): { label: string; date: string } {
  const d = new Date(dateStr + 'T12:00:00')
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December']
  const date = `${months[d.getMonth()]} ${d.getDate()}`
  if (dateStr === today) return { label: 'Today', date }
  if (dateStr === getETDateStr(1)) return { label: 'Tomorrow', date }
  return { label: days[d.getDay()], date }
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
  const isGold = player.tier === 'gold'
  const initials = player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const { first, last } = splitName(player.name)

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
        isSelected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black' : ''
      }`}
    >
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
      <div className="absolute inset-[2px] rounded-[9px] border border-white/[0.07] pointer-events-none z-10" />

      {/* Top banner */}
      <div className="absolute top-0 inset-x-0 z-20 bg-black/50 flex items-center justify-between gap-1 px-1.5 py-1">
        <span className="text-[6px] font-bold text-white/30 uppercase tracking-[0.2em]">CardPicks</span>
        <span className={`text-[7px] font-black ${s.label} ${isPlatinum ? 'platinum-shimmer' : ''}`}>
          {player.multiplier}×
        </span>
      </div>

      <div className="absolute inset-x-0 top-[20px] bottom-14 overflow-hidden">
        {player.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.image_url}
            alt={player.name}
            className="w-full h-full object-cover object-top"
            style={{ filter: `drop-shadow(0 0 4px ${s.photoGlow}) drop-shadow(0 0 10px ${s.photoGlow})` }}
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl font-black text-white/15 select-none">{initials}</span>
          </div>
        )}
      </div>

      <div className={`absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t ${s.footer} to-transparent`} />

      <div className="absolute bottom-0 inset-x-0 px-1.5 pb-0.5 z-20 flex items-end justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={teamLogoUrl(player.team_abbr)}
          alt={player.team_abbr}
          className="w-7 h-7 object-contain opacity-85 flex-shrink-0"
          style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.9)) drop-shadow(0 0 7px rgba(255,255,255,0.55))' }}
        />
        <div className="text-right min-w-0">
          {first && <div className="text-white/70 text-[8px] font-bold uppercase tracking-wider leading-none">{first}</div>}
          <div className="text-white font-black uppercase tracking-wide leading-tight drop-shadow-lg" style={{ fontSize: lastNameFontSize(last, 14) }}>{last}</div>
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
  const isGold = player.tier === 'gold'
  const initials = player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const { first, last } = splitName(player.name)
  return (
    <div className={`w-full h-full relative rounded-2xl border-2 overflow-hidden bg-gradient-to-b ${s.gradient} ${s.border} ${s.glow} ${isSelected ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-black' : ''}`}>
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
      <div className="absolute inset-[2px] rounded-[14px] border border-white/[0.07] pointer-events-none z-10" />

      {/* Top banner */}
      <div className="absolute top-0 inset-x-0 z-20 bg-black/50 flex items-center px-1.5 py-1 justify-between">
        {compact ? (
          <span className="bg-white/25 rounded-full px-1 py-px text-[8px] font-black text-white leading-none">
            {reliability ?? TIER_REL_DEFAULT[player.tier]}%
          </span>
        ) : (
          <span className="text-[7px] font-bold text-white/30 uppercase tracking-[0.2em]">CardPicks</span>
        )}
        <span className={`font-black ${compact ? 'text-[7px]' : 'text-[9px]'} ${s.label} ${isPlatinum ? 'platinum-shimmer' : ''}`}>
          {player.multiplier}×
        </span>
      </div>

      {/* Image */}
      <div className={`absolute inset-x-0 overflow-hidden ${compact ? 'top-[16px] bottom-12' : 'top-[26px] bottom-16'}`}>
        {player.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.image_url} alt={player.name} className="w-full h-full object-cover object-top"
            style={{ filter: `drop-shadow(0 0 4px ${s.photoGlow}) drop-shadow(0 0 10px ${s.photoGlow})` }}
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className={`font-black text-white/15 select-none ${compact ? 'text-3xl' : 'text-5xl'}`}>{initials}</span>
          </div>
        )}
      </div>

      <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t ${s.footer} to-transparent ${compact ? 'h-14' : 'h-20'}`} />

      <div className={`absolute bottom-0 inset-x-0 z-20 flex items-end justify-between ${compact ? 'px-1.5 pb-0.5' : 'px-2 pb-1'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={teamLogoUrl(player.team_abbr)}
          alt={player.team_abbr}
          className={`object-contain opacity-85 flex-shrink-0 ${compact ? 'w-7 h-7' : 'w-9 h-9'}`}
          style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.9)) drop-shadow(0 0 7px rgba(255,255,255,0.55))' }}
        />
        <div className="text-right min-w-0">
          {first && (
            <div className={`text-white/70 font-bold uppercase tracking-wider leading-none ${compact ? 'text-[8px]' : 'text-[10px]'}`}>
              {first}
            </div>
          )}
          <div className="text-white font-black uppercase leading-tight drop-shadow-lg" style={{ fontSize: lastNameFontSize(last, compact ? 14 : 19) }}>
            {last}
          </div>
        </div>
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
  useLockBodyScroll()
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
          <p className="text-white/50 text-xs mt-1">Tap a card to wager, or play without one</p>
        )}
        <OnboardingCallout id="wager_overlay" dark className="mt-3">
          Wagering a card multiplies your reward by its tier — but you lose it if the pick is wrong.
        </OnboardingCallout>
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
  const { userId } = useUserId()
  const [games, setGames] = useState<Game[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [ownedCards, setOwnedCards] = useState<{ player: Player; quantity: number; reliability: number[] | null }[]>([])
  const { credits, setCredits } = useCredits()
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [selectedDate, setSelectedDate] = useState(today)
  const [picksActionCards, setPicksActionCards] = useState<UserActionCardWithType[]>([])
  const [wagerInsurance, setWagerInsurance] = useState<Record<string, boolean>>({})
  const [wagerDoubleDown, setWagerDoubleDown] = useState<Record<string, boolean>>({})
const [draftPicks, setDraftPicks] = useState<Record<string, 'home' | 'away'>>({})
  const [wagerCards, setWagerCards] = useState<Record<string, Player | null>>({})
  const [activeWagerGameId, setActiveWagerGameId] = useState<string | null>(null)
  const [forcingWinner, setForcingWinner] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    syncThenLoad()
  }, [userId])

  async function syncThenLoad() {
    try {
      await authedFetch('/api/sync', {
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
    if (!userId) return
    const [gamesRes, predsRes, cardsRes, actionRes, stateRes] = await Promise.all([
      supabase.from('games').select('*').order('game_date').order('game_time'),
      supabase.from('predictions').select('*').eq('user_id', userId),
      supabase.from('user_cards').select('*, player:players(*)').eq('user_id', userId),
      supabase.from('user_action_cards').select('*, type:action_card_types(*)').eq('user_id', userId).eq('used', false),
      supabase.from('user_state').select('credits').eq('user_id', userId).single(),
    ])
    if (stateRes.data) setCredits(stateRes.data.credits)

    // Settlement happens server-side (via /api/sync on every load, or the dev force-winner
    // route) — diff against what we had locally so a pick that just resolved still gets a toast.
    const freshPreds: Prediction[] = predsRes.data ?? []
    const prevById = new Map(predictions.map(p => [p.id, p]))
    const newlySettled = freshPreds.filter(p => {
      const prev = prevById.get(p.id)
      return prev && prev.status === 'pending' && p.status !== 'pending'
    })
    if (newlySettled.length === 1) {
      const p = newlySettled[0]
      const game = (gamesRes.data ?? []).find((g: Game) => g.id === p.game_id)
      const correct = p.status === 'correct'
      const label = game ? `${game.away_team_abbr} @ ${game.home_team_abbr}` : 'Pick'
      showToast(correct ? `${label}: +${p.credits_earned ?? 0} cr` : `${label}: missed.`, correct)
    } else if (newlySettled.length > 1) {
      const wins = newlySettled.filter(p => p.status === 'correct').length
      showToast(`Settled ${newlySettled.length} picks, ${wins} correct`, wins > 0)
    }

    setGames(gamesRes.data ?? [])
    setPredictions(freshPreds)
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
    if (!userId) return
    const gamesToLock = selectedDateGames.filter(
      g => draftPicks[g.id] !== undefined && !getPrediction(g.id)
    )
    if (gamesToLock.length === 0) return

    const picks = gamesToLock.map(game => {
      const wagered = wagerCards[game.id] ?? null
      return {
        game_id: game.id,
        side: draftPicks[game.id]!,
        card_player_id: wagered?.id ?? null,
        use_insurance: !!(wagerInsurance[game.id] && wagered),
        use_double_down: !!wagerDoubleDown[game.id],
      }
    })

    const res = await authedFetch('/api/picks/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ picks }),
    })

    if (res.ok) {
      const data = await res.json()
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
      showToast(`Locked in ${data.predictions.length} pick${data.predictions.length > 1 ? 's' : ''}`, true)
      await loadAll()
    } else {
      const err = await res.json().catch(() => ({}))
      showToast(err.error ?? 'Failed to lock in picks', false)
    }
  }

  async function handleUnlock() {
    const lockedGameIds = selectedDateGames
      .filter(g => getPrediction(g.id))
      .map(g => g.id)
    if (!lockedGameIds.length) return
    const res = await authedFetch('/api/picks/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_ids: lockedGameIds }),
    })
    if (res.ok) {
      showToast('Picks unlocked', true)
      await loadAll()
    }
  }

  async function forceWinner(game: Game, winner: 'home' | 'away') {
    setForcingWinner(game.id)
    // Settlement (credits, card consumption) happens server-side inside this route now.
    await authedFetch('/api/dev/set-game-winner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: game.id, winner }),
    })
    await loadAll()
    setForcingWinner(null)
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

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
