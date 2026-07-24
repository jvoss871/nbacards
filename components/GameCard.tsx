'use client'

import type { CSSProperties } from 'react'
import type { Game, Player, Prediction } from '@/lib/types'
import { BASE_CREDITS_PER_WIN, calcCreditsEarned } from '@/lib/game-logic'
import { teamLogoUrl } from '@/lib/team-logo'

interface Props {
  game: Game
  prediction: Prediction | undefined
  draftPick: 'home' | 'away' | undefined
  wagerCard: Player | null
  doubleDown?: boolean
  onPredict: (game: Game, side: 'home' | 'away') => void
}

const TEAM_COLORS: Record<string, string> = {
  ATL: '#E03A3E', BOS: '#007A33', BKN: '#1A1A1A', CHA: '#1D1160',
  CHI: '#CE1141', CLE: '#860038', DAL: '#00538C', DEN: '#0E2240',
  DET: '#C8102E', GSW: '#1D428A', HOU: '#CE1141', IND: '#002D62',
  LAC: '#C8102E', LAL: '#552583', MEM: '#12173F', MIA: '#98002E',
  MIL: '#00471B', MIN: '#0C2340', NOP: '#0C2340', NYK: '#006BB6',
  OKC: '#007AC1', ORL: '#0077C0', PHI: '#006BB6', PHX: '#1D1160',
  POR: '#E03A3E', SAC: '#5A2D81', SAS: '#C0C0C0', TOR: '#CE1141',
  UTA: '#002B5C', WAS: '#002B5C',
}

const MINI_CARD_STYLE: Record<string, { gradient: string; border: string }> = {
  bronze:   { gradient: 'from-amber-600 via-amber-900 to-stone-950',   border: 'border-amber-500/60' },
  silver:   { gradient: 'from-slate-300 via-slate-600 to-slate-900',   border: 'border-slate-300/50' },
  gold:     { gradient: 'from-yellow-400 via-yellow-800 to-amber-950', border: 'border-yellow-400/60' },
  platinum: { gradient: 'from-cyan-400 via-blue-700 to-indigo-950',    border: 'border-cyan-300/60' },
}


function teamColor(abbr: string) {
  return TEAM_COLORS[abbr] ?? '#1a1714'
}

function MiniWagerCard({ player }: { player: Player }) {
  const s = MINI_CARD_STYLE[player.tier] ?? MINI_CARD_STYLE.bronze
  return (
    <div className={`relative aspect-[5/7] rounded-[5px] border overflow-hidden bg-gradient-to-b ${s.gradient} ${s.border}`}>
      {player.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.image_url}
          alt={player.name}
          className="w-full h-full object-cover object-top"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
      <div className="absolute bottom-0 inset-x-0 h-2/5 bg-gradient-to-t from-black/60 to-transparent" />
    </div>
  )
}

export default function GameCard({ game, prediction, draftPick, wagerCard, doubleDown, onPredict }: Props) {
  const isFinal  = game.status === 'final'
  const isLocked = !!prediction
  const isDraft  = !isLocked && draftPick !== undefined

  const pickedHome = isLocked ? prediction?.predicted_winner === 'home' : draftPick === 'home'
  const pickedAway = isLocked ? prediction?.predicted_winner === 'away' : draftPick === 'away'
  const cardWasWagered = !!(prediction?.card_used_id && prediction.multiplier_applied > 1)
  const cardInsured = isFinal && prediction?.status === 'incorrect' && cardWasWagered && !!prediction.insurance_card_id
  const cardLost    = isFinal && prediction?.status === 'incorrect' && cardWasWagered && !prediction.insurance_card_id && !wagerCard

  // Double down: from draft state (prop) or from locked prediction
  const isDoubleDown = doubleDown || !!prediction?.double_down_card_id

  const baseCr = wagerCard
    ? calcCreditsEarned(wagerCard.multiplier)
    : cardWasWagered
    ? calcCreditsEarned(prediction!.multiplier_applied)
    : BASE_CREDITS_PER_WIN
  const potentialCr = isDoubleDown ? baseCr * 2 : baseCr

  const isSettled = isFinal && prediction && prediction.status !== 'pending'
  const creditsEarned = prediction?.credits_earned ?? null

  function renderRow(side: 'home' | 'away') {
    const team  = side === 'home' ? game.home_team      : game.away_team
    const abbr  = side === 'home' ? game.home_team_abbr : game.away_team_abbr
    const score = side === 'home' ? game.home_score     : game.away_score
    const picked = side === 'home' ? pickedHome : pickedAway
    const won = isFinal && game.winner === side
    const color = teamColor(abbr)
    const isLockedPick = picked && isLocked

    let rowStyle: CSSProperties = {}
    let rowClass = ''

    if (isFinal) {
      if (won && picked)  rowClass = 'bg-emerald-50'
      else if (!won && picked) rowClass = 'bg-red-50/50 opacity-80'
      else if (!won)      rowClass = 'opacity-45'
    } else if (isLockedPick) {
      rowStyle = { backgroundColor: color }
    } else if (picked && isDraft) {
      rowStyle = { backgroundColor: color + '14' }
    } else if (!isFinal && !isLocked) {
      rowClass = 'hover:bg-[#faf9f6] cursor-pointer transition-colors'
    }

    const lockedNotFinal = isLockedPick && !isFinal
    const nameColor  = isFinal ? (won ? 'text-[#1a1714]' : 'text-[#6b6259]') : lockedNotFinal ? 'text-white' : 'text-[#1a1714]'
    const abbrColor  = lockedNotFinal ? 'text-white/55' : 'text-[#b0a89f]'
    const scoreColor = won ? (picked ? (lockedNotFinal ? 'text-white' : 'text-emerald-700') : 'text-[#1a1714]') : 'text-[#b0a89f]'

    return (
      <button
        onClick={() => !isFinal && !isLocked && onPredict(game, side)}
        disabled={isFinal || isLocked}
        style={rowStyle}
        className={`relative w-full flex items-center gap-3 px-4 py-3.5 disabled:cursor-default ${rowClass}`}
      >
        {picked && (
          <div
            className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full"
            style={{ backgroundColor: lockedNotFinal ? 'rgba(255,255,255,0.45)' : color }}
          />
        )}

        <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={teamLogoUrl(abbr)}
            alt={abbr}
            width={36}
            height={36}
            className={`w-9 h-9 object-contain ${isFinal && !won && !picked ? 'opacity-30' : ''}`}
            onError={e => {
              const img = e.target as HTMLImageElement
              img.style.display = 'none'
              const fallback = document.createElement('span')
              fallback.className = 'text-[10px] font-black text-[#a39890]'
              fallback.textContent = abbr
              img.parentElement?.appendChild(fallback)
            }}
          />
        </div>

        <div className="flex-1 min-w-0 text-left">
          <div className={`text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-0.5 ${abbrColor}`}>{abbr}</div>
          <div className={`text-sm font-bold leading-tight truncate ${nameColor}`}>{team}</div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          {isFinal && score !== null ? (
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black tabular-nums leading-none ${scoreColor}`}>{score}</span>
              {won && (
                <span className={`text-[8px] font-black uppercase tracking-widest ${picked ? (lockedNotFinal ? 'text-white/55' : 'text-emerald-500') : 'text-[#c8c2b8]'}`}>W</span>
              )}
            </div>
          ) : picked ? (
            <span className={`text-sm font-black tabular-nums ${isLockedPick ? 'text-white/85' : 'text-[#1a1714]'}`}>
              +{potentialCr} cr
            </span>
          ) : null}
        </div>
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-[#e2ddd6] bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#f0ede8]">
        <span className={`text-[10px] font-black uppercase tracking-widest ${isFinal ? 'text-[#1a1714]' : 'text-[#b0a89f]'}`}>
          {isFinal ? 'Final' : (game.game_time ?? 'TBD')}
        </span>
        <div className="flex items-center gap-1.5">
          {isSettled && creditsEarned !== null && creditsEarned > 0 && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full">
              +{creditsEarned} cr
            </span>
          )}
          {isSettled && prediction?.status === 'incorrect' && (
            <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[10px] font-semibold rounded-full">
              Missed
            </span>
          )}
          {isDraft && <span className="text-[10px] font-bold text-amber-500">Draft</span>}
          {isLocked && prediction?.status === 'pending' && !isFinal && (
            <span className="text-[10px] font-bold text-[#1a1714]">Locked</span>
          )}
          {!isLocked && !draftPick && !isFinal && (
            <span className="text-[10px] text-[#d4cfc9]">Pick a winner</span>
          )}
        </div>
      </div>

      {renderRow('away')}

      <div className="flex items-center gap-3 px-4">
        <div className="flex-1 h-px bg-[#f0ede8]" />
        <span className="text-[8px] font-black tracking-[0.25em] text-[#d4cfc9]">VS</span>
        <div className="flex-1 h-px bg-[#f0ede8]" />
      </div>

      {renderRow('home')}

      {/* Wager card strip */}
      {wagerCard && (
        <div className="flex items-center gap-2.5 px-3.5 py-2 border-t border-[#f0ede8] bg-[#f7f5f2]">
          <div className="w-8 flex-shrink-0">
            <MiniWagerCard player={wagerCard} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#b0a89f] leading-none mb-0.5">Wagered</div>
            <div className="text-[11px] font-bold text-[#1a1714] truncate leading-tight">{wagerCard.name}</div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] font-black text-[#6b6259]">{wagerCard.multiplier}×</span>
            {isDoubleDown && !isFinal && (
              <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest px-1.5 py-0.5 bg-amber-50 rounded-full">2×</span>
            )}
            {isFinal && prediction?.status === 'correct' && (
              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest px-1.5 py-0.5 bg-emerald-100 rounded-full">
                {isDoubleDown ? '2× Safe' : 'Safe'}
              </span>
            )}
            {cardInsured && (
              <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest px-1.5 py-0.5 bg-amber-50 rounded-full">Insured</span>
            )}
          </div>
        </div>
      )}

      {/* Card lost notice (card no longer in collection after loss) */}
      {cardLost && (
        <div className="flex items-center gap-2 px-3.5 py-2 border-t border-[#f0ede8] bg-[#f7f5f2]">
          <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Card lost</span>
        </div>
      )}
    </div>
  )
}
