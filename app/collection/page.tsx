'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useUserId } from '@/lib/use-user-id'
import { CollectionSkeleton } from '@/components/Skeleton'
import { ActionCard } from '@/components/ActionCard'
import { useLockBodyScroll } from '@/lib/use-lock-body-scroll'
import type { Player, Tier, ActionCardType } from '@/lib/types'

interface UserActionCardWithType {
  id: string
  used: boolean
  action_card_type_id: string
  type: ActionCardType
}
import { TIER_COLORS, TIER_LABEL } from '@/lib/game-logic'
import { teamLogoUrl } from '@/lib/team-logo'
import { lastNameFontSize, GOLD_HEX_BG, splitName } from '@/lib/card-utils'
import Link from 'next/link'

interface OwnedCard {
  id: string
  player: Player
  quantity: number
  reliability: number[] | null
}

const TIER_ORDER: Tier[] = ['platinum', 'gold', 'silver', 'bronze']

export default function CollectionPage() {
  const { userId } = useUserId()
  const [cards, setCards] = useState<OwnedCard[]>([])
  const [totalByTier, setTotalByTier] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [rarityFilter, setRarityFilter] = useState<Tier | 'all'>('all')
  const [teamFilter, setTeamFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [selectedCard, setSelectedCard] = useState<OwnedCard | null>(null)
  const [selectedActionCard, setSelectedActionCard] = useState<{ ac: UserActionCardWithType; count: number } | null>(null)
  const [actionCards, setActionCards] = useState<UserActionCardWithType[]>([])

  useEffect(() => {
    if (!userId) return
    Promise.all([
      supabase
        .from('user_cards')
        .select('id, quantity, reliability, player:players(*)')
        .eq('user_id', userId)
        .order('acquired_at', { ascending: false }),
      supabase
        .from('players')
        .select('tier'),
      supabase
        .from('user_action_cards')
        .select('*, type:action_card_types(*)')
        .eq('user_id', userId)
        .eq('used', false)
        .order('acquired_at', { ascending: false }),
    ]).then(([ownedRes, allRes, actionRes]) => {
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
      setActionCards((actionRes.data ?? []) as UserActionCardWithType[])
      setLoading(false)
    })
  }, [userId])

  const totalCards    = cards.reduce((s, c) => s + c.quantity, 0)
  const uniquePlayers = new Set(cards.map(c => c.player.id)).size

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
      </div>

      {/* Action Cards */}
      {actionCards.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="flex items-center gap-1.5 bg-[#1a1714] rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-widest whitespace-nowrap text-white/60">
              Action Cards
              <span className="font-semibold normal-case tracking-normal text-white">{actionCards.length}</span>
            </h2>
            <div className="flex-1 h-px bg-[#e2ddd6]" />
          </div>
          {(() => {
            const grouped = new Map<string, { ac: typeof actionCards[0]; count: number }>()
            for (const ac of actionCards) {
              const key = ac.action_card_type_id
              const existing = grouped.get(key)
              if (existing) existing.count++
              else grouped.set(key, { ac, count: 1 })
            }
            return (
              <div className="flex flex-wrap gap-1.5">
                {Array.from(grouped.values()).map(({ ac, count }) => (
                  <div
                    key={ac.action_card_type_id}
                    className="relative flex-shrink-0 cursor-pointer"
                    onClick={() => setSelectedActionCard({ ac, count })}
                  >
                    <ActionCard cardType={ac.type} size="sm" />
                    {count > 1 && (
                      <div className="absolute top-6 right-1 z-30 w-5 h-5 rounded-full bg-black/70 border border-white/20 flex items-center justify-center pointer-events-none">
                        <span className="text-[9px] font-black text-white leading-none">×{count}</span>
                      </div>
                    )}
                  </div>
                ))}
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
                        <span className="font-semibold normal-case tracking-normal text-white">
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

      {/* Action card lightbox */}
      {selectedActionCard && (
        <ActionCardLightbox
          ac={selectedActionCard.ac}
          count={selectedActionCard.count}
          onClose={() => setSelectedActionCard(null)}
        />
      )}

    </div>
  )
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

function PlayerBinder({ card, reliability, onClick }: { card: OwnedCard; reliability: number | null; onClick?: () => void }) {
  const { player } = card
  const s = CARD_STYLE[player.tier]
  const isPlatinum = player.tier === 'platinum'
  const isGold = player.tier === 'gold'
  const initials = player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const { first, last } = splitName(player.name)

  return (
    <div
      onClick={onClick}
      className={`relative w-full aspect-[5/7] rounded-xl border-2 overflow-hidden bg-gradient-to-b ${s.gradient} ${s.border} ${s.glow} ${onClick ? 'cursor-pointer' : ''}`}
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
        <span className={`text-[7px] font-black ${s.label} ${isPlatinum ? 'platinum-shimmer' : ''}`}>
          {player.multiplier}×
        </span>
      </div>

      <div className="absolute inset-x-0 top-[22px] bottom-10 overflow-hidden">
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
            <span className="text-3xl font-black text-white/15 select-none">{initials}</span>
          </div>
        )}
      </div>

      {card.quantity > 1 && (
        <div className="absolute top-6 right-1 z-30 w-8 h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center">
          <span className="text-[10px] font-black text-white leading-none">×{card.quantity}</span>
        </div>
      )}

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
          {first && (
            <div className="text-white/70 text-[8px] font-bold uppercase tracking-wider leading-none drop-shadow">
              {first}
            </div>
          )}
          <div className="text-white font-black uppercase tracking-wide leading-tight drop-shadow-lg" style={{ fontSize: lastNameFontSize(last, 14) }}>
            {last}
          </div>
        </div>
      </div>
    </div>
  )
}

const CARD_W = 160
const CARD_H = Math.round(CARD_W * 7 / 5)

function CardLightbox({ card, onClose }: { card: OwnedCard; onClose: () => void }) {
  useLockBodyScroll()
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

const CONTEXT_HOW_TO: Record<string, string> = {
  trivia: 'Activate from the lifelines panel during a Trivia game.',
  picks:  'Activate from your picks board before locking in your selections.',
  packs:  'Activate when opening a pack on the Packs page.',
}

const CONTEXT_LABEL: Record<string, string> = {
  trivia: 'Trivia',
  picks:  'Pick\'em',
  packs:  'Packs',
}

function ActionCardLightbox({ ac, count, onClose }: { ac: UserActionCardWithType; count: number; onClose: () => void }) {
  useLockBodyScroll()
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center px-6" onClick={onClose}>
      <div className="flex flex-col items-center gap-6 max-w-xs w-full" onClick={e => e.stopPropagation()}>

        {/* Card */}
        <div className="relative">
          <ActionCard cardType={ac.type} size="lg" />
          {count > 1 && (
            <div className="absolute top-8 right-1.5 z-30 w-6 h-6 rounded-full bg-black/70 border border-white/20 flex items-center justify-center">
              <span className="text-[10px] font-black text-white leading-none">×{count}</span>
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="w-full bg-[#1a1714] border border-white/10 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-white font-black text-lg leading-tight">{ac.type.name}</p>
                <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest mt-0.5">
                  {CONTEXT_LABEL[ac.type.context] ?? ac.type.context}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold">Owned</p>
                <p className="text-white font-black text-xl leading-tight">{count}</p>
              </div>
            </div>
          </div>

          {/* What it does */}
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1.5">What it does</p>
            <p className="text-white/80 text-sm leading-relaxed">{ac.type.description}</p>
          </div>

          {/* How to use */}
          <div className="px-5 py-4">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1.5">How to use</p>
            <p className="text-white/60 text-sm leading-relaxed">
              {CONTEXT_HOW_TO[ac.type.context] ?? 'Activate from the relevant game screen.'}
            </p>
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={onClose}
          className="text-white/40 text-sm font-semibold hover:text-white/60 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}
