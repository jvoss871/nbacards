'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase, USER_ID } from '@/lib/supabase'
import { CollectionSkeleton } from '@/components/Skeleton'
import type { Player, Tier, ActionCardType } from '@/lib/types'

interface UserActionCardWithType {
  id: string
  used: boolean
  action_card_type_id: string
  type: ActionCardType
}
import { TIER_COLORS, TIER_LABEL } from '@/lib/game-logic'
import Link from 'next/link'
import { LegendCard, type LegendData } from '@/components/LegendCard'
import { PrestigePicker, type LegendOption } from '@/components/PrestigePicker'

interface OwnedCard {
  id: string
  player: Player
  quantity: number
  reliability: number[] | null
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

const TIER_ORDER: Tier[] = ['platinum', 'gold', 'silver', 'bronze']
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

const TIER_DOT: Record<Tier, string> = {
  platinum: 'bg-blue-400',
  gold:     'bg-yellow-400',
  silver:   'bg-slate-400',
  bronze:   'bg-amber-500',
}

export default function CollectionPage() {
  const [cards, setCards] = useState<OwnedCard[]>([])
  const [totalByTier, setTotalByTier] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [rarityFilter, setRarityFilter] = useState<Tier | 'all'>('all')
  const [teamFilter, setTeamFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [selectedCard, setSelectedCard] = useState<OwnedCard | null>(null)
  const [prestige, setPrestige] = useState<PrestigeStatus | null>(null)
  const [showPrestigeModal, setShowPrestigeModal] = useState(false)
  const [selectedLegendId, setSelectedLegendId] = useState<string | null>(null)
  const [prestiging, setPrestiging] = useState(false)
  const [prestigeResult, setPrestigeResult] = useState<{ legendName: string; newLevel: number } | null>(null)
const [actionCards, setActionCards] = useState<UserActionCardWithType[]>([])

  useEffect(() => {
    Promise.all([
      supabase
        .from('user_cards')
        .select('id, quantity, reliability, player:players(*)')
        .eq('user_id', USER_ID)
        .order('acquired_at', { ascending: false }),
      supabase
        .from('players')
        .select('tier'),
      fetch('/api/prestige').then(r => r.json()),
      supabase
        .from('user_action_cards')
        .select('*, type:action_card_types(*)')
        .eq('user_id', USER_ID)
        .eq('used', false)
        .order('acquired_at', { ascending: false }),
    ]).then(([ownedRes, allRes, prestigeData, actionRes]) => {
      setCards(
        (ownedRes.data ?? []).map((c: { id: string; quantity: number; reliability: number[] | null; player: unknown }) => ({
          id: c.id,
          player: c.player as Player,
          quantity: c.quantity,
          reliability: c.reliability,
        }))
      )
      const counts: Record<string, number> = {}
      for (const p of (allRes.data ?? []) as { tier: string }[]) {
        counts[p.tier] = (counts[p.tier] ?? 0) + 1
      }
      setTotalByTier(counts)
      setPrestige(prestigeData)
      setActionCards((actionRes.data ?? []) as UserActionCardWithType[])
      setLoading(false)
    })
  }, [])

async function handlePrestige(legendId: string | null) {
    if (!legendId) return
    setPrestiging(true)
    try {
      const res = await fetch('/api/prestige', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legendId }),
      })
      const data = await res.json()
      if (data.success) {
        setPrestigeResult({ legendName: data.legend?.name ?? 'Legend', newLevel: data.newPrestigeLevel })
        setCards([])
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

  const totalCards    = cards.reduce((s, c) => s + c.quantity, 0)
  const uniquePlayers = new Set(cards.map(c => c.player.id)).size
  const totalPlayers  = Object.values(totalByTier).reduce((s, n) => s + n, 0)

  const tierCounts = useMemo(() =>
    Object.fromEntries(
      TIER_ORDER.map(t => [t, cards.filter(c => c.player.tier === t).length])
    ), [cards])

  const availableTeams = useMemo(
    () => [...new Set(cards.map(c => c.player.team))].filter(Boolean).sort(),
    [cards]
  )

  const filtered = useMemo(() => {
    let result = cards
    if (rarityFilter !== 'all') result = result.filter(c => c.player.tier === rarityFilter)
    if (teamFilter !== 'all') result = result.filter(c => c.player.team === teamFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(c => c.player.name.toLowerCase().includes(q))
    }
    return result
  }, [cards, rarityFilter, teamFilter, search])

  const groups = useMemo(() => {
    if (rarityFilter !== 'all' || teamFilter !== 'all' || search.trim()) {
      return [{ key: 'all', label: '', cards: filtered }]
    }
    return TIER_ORDER
      .map(tier => ({
        key: tier,
        label: TIER_LABEL[tier],
        accent: TIER_COLORS[tier].text,
        cards: filtered.filter(c => c.player.tier === tier),
      }))
      .filter(g => g.cards.length > 0)
  }, [filtered, rarityFilter, teamFilter, search])

  if (loading) return <CollectionSkeleton />

  const isFiltered = rarityFilter !== 'all' || teamFilter !== 'all' || search.trim() !== ''
  const prestigePct = prestige && prestige.totalPlayers > 0
    ? Math.min(100, Math.round((prestige.ownedUnique / prestige.totalPlayers) * 100))
    : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#1a1714]">Collection</h1>
          {totalCards > 0 && (
            <p className="text-sm text-[#a39890] mt-0.5">
              {totalCards} cards &middot; {uniquePlayers} players
            </p>
          )}
        </div>
        {totalCards > 0 && (
          <div className="flex gap-2 flex-wrap justify-end pt-0.5">
            {TIER_ORDER.map(tier => {
              const owned = tierCounts[tier] ?? 0
              if (!owned) return null
              return (
                <span key={tier} className="flex items-center gap-1 text-[11px]">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TIER_DOT[tier]}`} />
                  <span className="font-semibold text-[#6b6259]">{owned} {TIER_LABEL[tier]}</span>
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Starting Five showcase */}
      {prestige && prestige.earnedLegends.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="flex items-center gap-1.5 bg-[#1a1714] rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-widest whitespace-nowrap text-amber-400">
              Starting Five
              <span className="font-semibold normal-case tracking-normal text-white/40">{prestige.earnedLegends.length} / 5</span>
            </h2>
            <div className="flex-1 h-px bg-[#e2ddd6]" />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {prestige.earnedLegends.map(ul => (
              <LegendCard
                key={ul.prestige_number}
                legend={ul.legend}
                prestigeNum={ul.prestige_number}
                className="w-32 flex-shrink-0"
              />
            ))}
          </div>
        </div>
      )}

      {/* Prestige progress */}
      {prestige && prestige.totalPlayers > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-[#1a1714] border border-amber-500/[0.18] p-4">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_0%,rgba(251,191,36,0.10),transparent_70%)] pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

          <div className="relative flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-2xl font-black uppercase tracking-[0.2em] text-amber-400/70 mb-1">Prestige</p>
              <p className="text-white font-black text-3xl leading-none tracking-tight drop-shadow-sm">
                {prestige.prestigeLevel > 0 ? ROMAN[prestige.prestigeLevel - 1] : '—'}
              </p>
            </div>
            <button
              onClick={() => setShowPrestigeModal(true)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                prestige.canPrestige
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.35)]'
                  : 'border border-amber-500/40 text-amber-400 hover:text-amber-300 hover:border-amber-400'
              }`}
            >
              {prestige.canPrestige ? 'Prestige Now →' : 'Prestige'}
            </button>
          </div>

          <div className="relative space-y-2">
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
              <p className="text-[10px] text-white/40 leading-relaxed pt-0.5">
                Collect all players to unlock your{' '}
                <span className="text-amber-400/70 font-semibold">{prestige.nextSlotLabel}</span>
              </p>
            )}
          </div>
        </div>
      )}


      {/* Action Cards */}
      {actionCards.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="flex items-center gap-1.5 bg-[#1a1714] rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-widest whitespace-nowrap text-white/60">
              Action Cards
              <span className="font-semibold normal-case tracking-normal text-white/40">{actionCards.length}</span>
            </h2>
            <div className="flex-1 h-px bg-[#e2ddd6]" />
          </div>
          {(() => {
            const ACTION_RARITY: Record<string, {
              gradient: string; border: string; foilClass: string
              iconColor: string; label: string; footer: string; glow: string
            }> = {
              common: {
                gradient:  'from-slate-400 via-slate-600 to-slate-900',
                border:    'border-slate-300/30',
                foilClass: 'foil-sweep',
                iconColor: 'text-slate-100',
                label:     'text-slate-300',
                footer:    'from-slate-900',
                glow:      '',
              },
              rare: {
                gradient:  'from-violet-500 via-violet-800 to-indigo-950',
                border:    'border-violet-400/40',
                foilClass: 'foil-sweep',
                iconColor: 'text-violet-100',
                label:     'text-violet-200',
                footer:    'from-indigo-950',
                glow:      'shadow-[0_0_18px_rgba(139,92,246,0.30)]',
              },
              elite: {
                gradient:  'from-amber-400 via-amber-700 to-stone-950',
                border:    'border-amber-400/50',
                foilClass: 'foil-sweep-gold',
                iconColor: 'text-amber-100',
                label:     'text-amber-300',
                footer:    'from-stone-950',
                glow:      'shadow-[0_0_22px_rgba(251,191,36,0.35)]',
              },
            }
            const contextLabel: Record<string, string> = {
              trivia: 'Trivia',
              picks:  'Pick\'em',
              packs:  'Packs',
            }
            const grouped = new Map<string, { ac: typeof actionCards[0]; count: number }>()
            for (const ac of actionCards) {
              const key = ac.action_card_type_id
              const existing = grouped.get(key)
              if (existing) existing.count++
              else grouped.set(key, { ac, count: 1 })
            }
            return (
              <div className="flex flex-wrap gap-1.5">
                {Array.from(grouped.values()).map(({ ac, count }) => {
                  const s = ACTION_RARITY[ac.type.rarity] ?? ACTION_RARITY.common
                  return (
                    <div
                      key={ac.action_card_type_id}
                      className={`relative w-14 aspect-[5/7] rounded-lg border-2 overflow-hidden bg-gradient-to-b ${s.gradient} ${s.border} ${s.glow} flex-shrink-0`}
                      title={`${ac.type.name} · ${ac.type.rarity}`}
                    >
                      <div className={`${s.foilClass} absolute inset-0`} />
                      <div className="absolute inset-[2px] rounded-[6px] border border-white/[0.07] pointer-events-none z-10" />

                      {/* Count badge */}
                      {count > 1 && (
                        <div className="absolute top-1 right-1 z-20 bg-black/50 rounded-full w-3.5 h-3.5 flex items-center justify-center">
                          <span className="text-[6px] font-black text-white leading-none">{count}</span>
                        </div>
                      )}

                      {/* Icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-xl ${s.iconColor} drop-shadow-lg select-none`}>
                          {ac.type.icon}
                        </span>
                      </div>

                      {/* Footer */}
                      <div className={`absolute bottom-0 inset-x-0 h-2/5 bg-gradient-to-t ${s.footer} to-transparent`} />
                      <div className="absolute bottom-0 inset-x-0 px-1 pb-1 z-20">
                        <div className="text-white font-black text-[6px] uppercase tracking-wide leading-tight truncate drop-shadow-lg">
                          {ac.type.name}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-[#6b6259] text-sm font-semibold">Nothing here yet.</p>
          <p className="text-[#a39890] text-xs mt-1 mb-5">Open a pack to start building.</p>
          <Link
            href="/packs"
            className="inline-block px-5 py-2 bg-[#1a1714] hover:bg-[#2c2825] rounded-xl text-white text-sm font-bold transition-colors shadow-sm"
          >
            Pack Store
          </Link>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            {(['all', ...TIER_ORDER] as const).map(tier => {
              const active = rarityFilter === tier && !search.trim() && teamFilter === 'all'
              const color = tier === 'all' ? '' : TIER_COLORS[tier].text
              return (
                <button
                  key={tier}
                  onClick={() => { setRarityFilter(tier); setTeamFilter('all'); setSearch('') }}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${
                    active
                      ? 'bg-[#1a1714] border-[#1a1714] text-white'
                      : `bg-white border-[#e2ddd6] ${color || 'text-[#6b6259]'} hover:border-[#c8c2b8]`
                  }`}
                >
                  {tier === 'all' ? 'All' : TIER_LABEL[tier]}
                </button>
              )
            })}

            <div className="flex-1 min-w-[120px]">
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={e => { setSearch(e.target.value); setRarityFilter('all'); setTeamFilter('all') }}
                className="w-full bg-white border border-[#e2ddd6] rounded-full px-3 py-1 text-[11px] text-[#1a1714] placeholder-[#c8c2b8] focus:outline-none focus:border-[#1a1714] transition-colors"
              />
            </div>

            <select
              value={teamFilter}
              onChange={e => { setTeamFilter(e.target.value); setRarityFilter('all'); setSearch('') }}
              className="bg-white border border-[#e2ddd6] rounded-full px-3 py-1 text-[11px] font-semibold text-[#6b6259] focus:outline-none focus:border-[#1a1714] transition-colors"
            >
              <option value="all">All Teams</option>
              {availableTeams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Card grid */}
          <div className="space-y-6">
            {groups.map(group => (
              <section key={group.key}>
                {group.label && (
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className={`flex items-center gap-1.5 bg-[#1a1714] rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${'accent' in group ? group.accent : 'text-white/60'}`}>
                      {group.label}
                      {group.key !== 'all' && totalByTier[group.key] != null && (
                        <span className="font-semibold normal-case tracking-normal text-white/40">
                          {tierCounts[group.key as Tier] ?? 0} / {totalByTier[group.key]}
                        </span>
                      )}
                    </h2>
                    <div className="flex-1 h-px bg-[#e2ddd6]" />
                  </div>
                )}
                {group.cards.length === 0 ? (
                  <p className="text-[#c8c2b8] text-xs py-6 text-center">
                    {isFiltered ? 'No cards match.' : 'None yet.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {group.cards.map(oc => (
                      <PlayerBinder
                        key={oc.id}
                        card={oc}
                        reliability={oc.quantity === 1 ? (oc.reliability?.[0] ?? null) : null}
                        onClick={() => setSelectedCard(oc)}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </>
      )}

      {/* Card lightbox */}
      {selectedCard && (
        <CardLightbox card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}

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
                  {/* Mystery card */}
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
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-400/50 mb-1">
                      Next slot
                    </p>
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
    </div>
  )
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

function PlayerBinder({ card, reliability, onClick }: { card: OwnedCard; reliability: number | null; onClick?: () => void }) {
  const { player } = card
  const s = CARD_STYLE[player.tier]
  const isPlatinum = player.tier === 'platinum'
  const initials = player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      onClick={onClick}
      className={`relative w-full aspect-[5/7] rounded-xl border-2 overflow-hidden bg-gradient-to-b ${s.gradient} ${s.border} ${s.glow} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${s.foil} pointer-events-none`} />
      <div className={`${s.foilClass} absolute inset-0`} />
      {isPlatinum && <div className="holo-overlay" />}
      <div className="absolute inset-[3px] rounded-[10px] border border-white/[0.07] pointer-events-none z-10" />

      {/* Top banner */}
      <div className="absolute top-0 inset-x-0 z-20 bg-black/50 flex items-center justify-between gap-1 px-1.5 py-1">
        {reliability != null ? (
          <span className="bg-white/25 rounded-full px-1.5 py-px text-[7px] font-black text-white leading-none">
            {reliability}%
          </span>
        ) : (
          <span />
        )}
        <span className={`rounded-full px-1.5 py-px text-[6px] font-black uppercase leading-none bg-white/15 ${s.label} ${isPlatinum ? 'platinum-shimmer' : ''}`}>
          {TIER_LABEL[player.tier]}
        </span>
      </div>

      <div className="absolute inset-x-0 top-[22px] bottom-10 overflow-hidden">
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
            <span className="text-3xl font-black text-white/15 select-none">{initials}</span>
          </div>
        )}
      </div>

      {card.quantity > 1 && (
        <div className="absolute bottom-10 right-1 z-30 w-8 h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center">
          <span className="text-[10px] font-black text-white leading-none">×{card.quantity}</span>
        </div>
      )}

      <div className={`absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t ${s.footer} to-transparent`} />

      <div className="absolute bottom-0 inset-x-0 px-1.5 pb-1.5 z-20">
        <div className="text-white font-black text-[8px] uppercase tracking-wide leading-tight truncate drop-shadow-lg">
          {player.name}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-white/50 text-[7px] uppercase">{player.team_abbr}</span>
          <span className={`text-[8px] font-black ${s.label}`}>{player.multiplier}x</span>
        </div>
      </div>
    </div>
  )
}

const CARD_W = 160
const CARD_H = Math.round(CARD_W * 7 / 5)

function CardLightbox({ card, onClose }: { card: OwnedCard; onClose: () => void }) {
  const { player } = card
  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div className="px-5 pt-10 pb-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-0.5">
          {player.team_abbr} · {TIER_LABEL[player.tier as Tier]}
        </p>
        <p className="text-white text-xl font-black leading-tight">{player.name}</p>
        <p className="text-white/50 text-xs mt-1">
          {card.quantity} {card.quantity === 1 ? 'copy' : 'copies'} in your collection
        </p>
      </div>

      {/* Cards */}
      <div
        className="flex-1 flex items-center justify-center gap-5 px-6 overflow-x-auto"
        onClick={e => e.stopPropagation()}
      >
        {Array.from({ length: card.quantity }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-3 flex-shrink-0">
            <div style={{ width: CARD_W, height: CARD_H }}>
              <PlayerBinder
                card={{ ...card, quantity: 1 }}
                reliability={card.reliability?.[i] ?? null}
              />
            </div>
            <p className="text-white/40 text-[10px] font-semibold tabular-nums">
              Copy {i + 1}{card.reliability?.[i] != null ? ` · ${card.reliability[i]}%` : ''}
            </p>
          </div>
        ))}
      </div>

      {/* Dismiss */}
      <div className="pb-10 pt-4 flex-shrink-0 flex justify-center" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl border border-white/20 text-white/50 text-sm font-bold hover:text-white/70 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}
