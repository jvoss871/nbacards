'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase, USER_ID } from '@/lib/supabase'
import type { PackType, Player, ActionCardType } from '@/lib/types'
import { Tooltip } from '@/components/Tooltip'
import { drawCard, drawActionCard } from '@/lib/game-logic'
import { rollReliability } from '@/lib/trivia-logic'
import ActionCardReveal from '@/components/ActionCardReveal'
import PlayerCardFlip from '@/components/PlayerCardFlip'
import { ActionCard } from '@/components/ActionCard'
import { PlatinumReveal } from '@/components/PlatinumReveal'
import { useCredits } from '@/lib/credits-context'

interface UserActionCardWithType {
  id: string
  action_card_type_id: string
  used: boolean
  type: ActionCardType
}

interface SavedCard {
  userCardId: string
  wasInserted: boolean
}

async function saveSingleCard(player: Player, reliability: number): Promise<SavedCard> {
  const { data: existing } = await supabase
    .from('user_cards')
    .select('id, quantity, reliability')
    .eq('user_id', USER_ID)
    .eq('player_id', player.id)
    .maybeSingle()

  if (existing) {
    const rolls = [...(existing.reliability ?? []), reliability]
    await supabase
      .from('user_cards')
      .update({ quantity: existing.quantity + 1, reliability: rolls })
      .eq('id', existing.id)
    return { userCardId: existing.id, wasInserted: false }
  } else {
    const { data: inserted } = await supabase
      .from('user_cards')
      .insert({ user_id: USER_ID, player_id: player.id, quantity: 1, reliability: [reliability] })
      .select('id')
      .single()
    return { userCardId: inserted!.id, wasInserted: true }
  }
}

async function undoSingleCard(sc: SavedCard): Promise<void> {
  if (sc.wasInserted) {
    await supabase.from('user_cards').delete().eq('id', sc.userCardId)
  } else {
    const { data: row } = await supabase
      .from('user_cards')
      .select('quantity, reliability')
      .eq('id', sc.userCardId)
      .single()
    if (row) {
      if (row.quantity <= 1) {
        await supabase.from('user_cards').delete().eq('id', sc.userCardId)
      } else {
        await supabase
          .from('user_cards')
          .update({
            quantity: row.quantity - 1,
            reliability: (row.reliability as number[]).slice(0, -1),
          })
          .eq('id', sc.userCardId)
      }
    }
  }
}

function PackOpenInner() {
  const params = useSearchParams()
  const router = useRouter()
  const packId = params.get('packId')
  const { setCredits } = useCredits()

  const hasLoaded = useRef(false)
  const [pack, setPack] = useState<PackType | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [drawnCards, setDrawnCards] = useState<{ player: Player; reliability: number }[]>([])
  const [flipped, setFlipped] = useState<boolean[]>([])
  const [bonusCard, setBonusCard] = useState<ActionCardType | null>(null)
  const [bonusFlipped, setBonusFlipped] = useState(false)
  const [savedCards, setSavedCards] = useState<SavedCard[]>([])
  const [savedBonusAcId, setSavedBonusAcId] = useState<string | null>(null)
  const [packsActionCards, setPacksActionCards] = useState<UserActionCardWithType[]>([])
  const [loading, setLoading] = useState(true)
  const [revealingAll, setRevealingAll] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)
  const [platinumReveal, setPlatinumReveal] = useState(false)

  useEffect(() => {
    if (!packId) { router.replace('/packs'); return }
    if (hasLoaded.current) return
    hasLoaded.current = true
    async function load() {
      // Deduct credits server-side before drawing cards — prevents free pack by direct URL
      const buyRes = await fetch('/api/packs/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: packId }),
      })
      if (!buyRes.ok) {
        const err = await buyRes.json().catch(() => ({}))
        if (buyRes.status === 402) { router.replace('/packs'); return }
        setOpenError(err.error ?? 'Failed to purchase pack')
        setLoading(false)
        return
      }
      const buyData = await buyRes.json()
      const newCredits: number = buyData.credits
      setCredits(newCredits)

      const [packRes, playersRes] = await Promise.all([
        supabase.from('pack_types').select('*').eq('id', packId).single(),
        supabase.from('players').select('*').eq('in_pool', true),
      ])
      if (!packRes.data) { router.replace('/packs'); return }
      const loadedPack = packRes.data
      setPack(loadedPack)

      const players = playersRes.data ?? []
      setAllPlayers(players)

      const fail = async (msg: string) => {
        // Refund on draw failure — credits were already deducted server-side
        const { data: state } = await supabase
          .from('user_state')
          .select('credits')
          .eq('user_id', USER_ID)
          .single()
        if (state) {
          const refunded = state.credits + loadedPack.credit_cost
          await supabase
            .from('user_state')
            .update({ credits: refunded })
            .eq('user_id', USER_ID)
          setCredits(refunded)
        }
        setOpenError(msg)
        setLoading(false)
      }

      if (players.length === 0) {
        await fail('No players in the card pool yet. Sync the roster first.')
        return
      }

      try {
        const cards: { player: Player; reliability: number }[] = []
        let platinumDrawn = 0
        const guaranteedSlot = Math.floor(Math.random() * loadedPack.card_count)
        for (let i = 0; i < loadedPack.card_count; i++) {
          let card = drawCard(loadedPack, players, i === guaranteedSlot)
          if (card.tier === 'platinum' && platinumDrawn >= 1) {
            const cappedOdds = { ...loadedPack.odds, platinum: 0 }
            card = drawCard({ ...loadedPack, odds: cappedOdds }, players, i === guaranteedSlot)
          }
          if (card.tier === 'platinum') platinumDrawn++
          cards.push({ player: card, reliability: rollReliability(card.tier) })
        }
        setDrawnCards(cards)
        setFlipped(new Array(cards.length).fill(false))

        // Bonus action card
        const bonusChance = loadedPack.action_bonus_chance ?? 0
        const pool = loadedPack.action_card_pool ?? {}
        const drawnActionId = drawActionCard(bonusChance, pool)
        let drawnBonusCard: ActionCardType | null = null
        if (drawnActionId) {
          const { data: actionTypes } = await supabase
            .from('action_card_types')
            .select('*')
            .eq('id', drawnActionId)
            .single()
          if (actionTypes) {
            drawnBonusCard = actionTypes as ActionCardType
            setBonusCard(drawnBonusCard)
          }
        }

        // Load packs-context action cards
        const { data: actionData } = await supabase
          .from('user_action_cards')
          .select('*, type:action_card_types(*)')
          .eq('user_id', USER_ID)
          .eq('used', false)
        const allAction = (actionData ?? []) as UserActionCardWithType[]
        setPacksActionCards(allAction.filter(c => c.type?.context === 'packs'))

        // Credits are spent — save cards immediately so navigation can't lose them
        const savedList: SavedCard[] = []
        for (const { player, reliability } of cards) {
          savedList.push(await saveSingleCard(player, reliability))
        }
        setSavedCards(savedList)

        // Log the pack open with full card list now that we know what was pulled
        fetch('/api/packs/log-open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pack_name: loadedPack.name,
            cost: buyData.cost,
            previous_balance: buyData.previous_balance,
            new_balance: newCredits,
            cards: cards.map(({ player }) => ({ name: player.name, tier: player.tier })),
          }),
        })

        // Save bonus action card if drawn
        let bonusAcRowId: string | null = null
        if (drawnBonusCard) {
          const { data: acRow } = await supabase
            .from('user_action_cards')
            .insert({ user_id: USER_ID, action_card_type_id: drawnBonusCard.id, used: false })
            .select('id')
            .single()
          bonusAcRowId = acRow?.id ?? null
        }
        setSavedBonusAcId(bonusAcRowId)

        setLoading(false)
      } catch (e) {
        await fail(`Failed to draw cards: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    load()
  }, [packId, router, setCredits])

  const allPlayerCardsRevealed = flipped.length > 0 && flipped.every(Boolean) && drawnCards.length > 0
  const allRevealed = allPlayerCardsRevealed && (bonusCard ? bonusFlipped : true)

  async function handleReroll(idx: number) {
    if (!pack || allPlayers.length === 0) return
    const card = packsActionCards.find(c => c.type.id === 'reroll')
    if (!card) return

    // Undo the save for the card being replaced
    const sc = savedCards[idx]
    if (sc) await undoSingleCard(sc)

    // Draw replacement
    const cappedOdds = drawnCards[idx].player.tier === 'platinum'
      ? { ...pack.odds, platinum: 0 }
      : pack.odds
    const newPlayer = drawCard({ ...pack, odds: cappedOdds }, allPlayers, false)
    const newReliability = rollReliability(newPlayer.tier)
    setDrawnCards(prev => prev.map((c, i) => i === idx ? { player: newPlayer, reliability: newReliability } : c))
    setFlipped(prev => prev.map((v, i) => (i === idx ? false : v)))

    // Save replacement and update record for this slot
    const newSc = await saveSingleCard(newPlayer, newReliability)
    setSavedCards(prev => prev.map((c, i) => i === idx ? newSc : c))

    await supabase.from('user_action_cards').update({ used: true }).eq('id', card.id)
    setPacksActionCards(prev => prev.filter(c => c.id !== card.id))
  }

  async function handleRepack() {
    if (!pack || allPlayers.length === 0) return
    const card = packsActionCards.find(c => c.type.id === 'repack')
    if (!card) return

    // Undo all currently saved cards and bonus
    for (const sc of savedCards) await undoSingleCard(sc)
    if (savedBonusAcId) {
      await supabase.from('user_action_cards').delete().eq('id', savedBonusAcId)
      setSavedBonusAcId(null)
    }

    // Draw new pack
    const cards: { player: Player; reliability: number }[] = []
    let platinumDrawn = 0
    const guaranteedSlot = Math.floor(Math.random() * pack.card_count)
    for (let i = 0; i < pack.card_count; i++) {
      let p = drawCard(pack, allPlayers, i === guaranteedSlot)
      if (p.tier === 'platinum' && platinumDrawn >= 1) {
        p = drawCard({ ...pack, odds: { ...pack.odds, platinum: 0 } }, allPlayers, i === guaranteedSlot)
      }
      if (p.tier === 'platinum') platinumDrawn++
      cards.push({ player: p, reliability: rollReliability(p.tier) })
    }
    setDrawnCards(cards)
    setFlipped(new Array(cards.length).fill(false))
    setBonusCard(null)
    setBonusFlipped(false)

    // Save new cards immediately
    const savedList: SavedCard[] = []
    for (const { player, reliability } of cards) {
      savedList.push(await saveSingleCard(player, reliability))
    }
    setSavedCards(savedList)

    await supabase.from('user_action_cards').update({ used: true }).eq('id', card.id)
    setPacksActionCards(prev => prev.filter(c => c.id !== card.id))
  }

  function flipCard(idx: number) {
    setFlipped(prev => prev.map((v, i) => (i === idx ? true : v)))
    if (drawnCards[idx]?.player.tier === 'platinum') {
      setPlatinumReveal(true)
    }
  }

  async function revealAll() {
    setRevealingAll(true)
    let triggeredPlatinum = false
    for (let i = 0; i < drawnCards.length; i++) {
      await new Promise(r => setTimeout(r, 220))
      setFlipped(prev => prev.map((v, j) => (j <= i ? true : v)))
      if (!triggeredPlatinum && drawnCards[i]?.player.tier === 'platinum') {
        triggeredPlatinum = true
        setPlatinumReveal(true)
        await new Promise(r => setTimeout(r, 3100))
      }
    }
    if (bonusCard) {
      await new Promise(r => setTimeout(r, 350))
      setBonusFlipped(true)
    }
    setRevealingAll(false)
  }

  if (loading) {
    return <div className="text-[#a39890] text-sm py-12 text-center">Drawing cards...</div>
  }

  if (openError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-red-400 font-semibold">{openError}</p>
        <p className="text-[#a39890] text-sm">Your credits have been refunded.</p>
        <button
          onClick={() => router.push('/packs')}
          className="px-5 py-2.5 bg-[#1a1714] text-white rounded-xl text-sm font-bold"
        >
          Back to Packs
        </button>
      </div>
    )
  }

  if (!pack) {
    return <div className="text-[#a39890] text-sm py-12 text-center">Drawing cards...</div>
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-black text-[#1a1714]">{pack.name}</h1>
        <p className="text-[#a39890] text-sm mt-1">
          {allRevealed ? 'All cards revealed' : 'Tap a card to reveal it'}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {drawnCards.map(({ player, reliability }, i) => {
          const rerollCard = packsActionCards.find(c => c.type.id === 'reroll')
          const canReroll = flipped[i] && !!rerollCard
          return (
            <div key={i} className="flex flex-col items-center gap-3">
              <PlayerCardFlip
                card={player}
                reliability={reliability}
                revealed={flipped[i]}
                onFlip={() => flipCard(i)}
              />
              {canReroll && (
                <Tooltip text={rerollCard.type.description ?? 'Redraws this card slot. Card is burned on use.'}>
                  <ActionCard
                    cardType={rerollCard.type}
                    size="sm"
                    onClick={() => handleReroll(i)}
                  />
                </Tooltip>
              )}
            </div>
          )
        })}
      </div>

      {bonusCard && allPlayerCardsRevealed && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-[9px] text-[#a39890] uppercase tracking-[0.25em] font-semibold">
            Bonus Slot
          </p>
          <ActionCardReveal
            card={bonusCard}
            revealed={bonusFlipped}
            onFlip={() => setBonusFlipped(true)}
          />
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <div className="flex justify-center gap-3">
          {!allRevealed && (
            <button
              onClick={revealAll}
              disabled={revealingAll}
              className="px-6 py-2.5 bg-[#1a1714] hover:bg-[#2c2825] border border-[#1a1714] rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 shadow-sm"
            >
              Reveal All
            </button>
          )}
          {allRevealed && (
            <>
              <button
                onClick={() => router.push('/collection')}
                className="px-5 py-2.5 bg-[#1a1714] hover:bg-[#2c2825] border border-[#1a1714] rounded-xl text-white text-sm font-bold transition-all shadow-sm"
              >
                View Collection
              </button>
              <button
                onClick={() => router.push('/packs')}
                className="px-5 py-2.5 bg-white hover:bg-[#faf9f6] border border-[#e2ddd6] rounded-xl text-[#1a1714] text-sm font-bold transition-all shadow-sm"
              >
                Open Another
              </button>
            </>
          )}
        </div>

        {allRevealed && (() => {
          const repackCard = packsActionCards.find(c => c.type.id === 'repack')
          return repackCard ? (
            <Tooltip text={repackCard.type.description ?? 'Scraps this pack and draws a new one. Card is burned on use.'}>
              <ActionCard
                cardType={repackCard.type}
                size="sm"
                onClick={handleRepack}
              />
            </Tooltip>
          ) : null
        })()}
      </div>
      {platinumReveal && <PlatinumReveal onDone={() => setPlatinumReveal(false)} />}
    </div>
  )
}

export default function PackOpenPage() {
  return (
    <Suspense fallback={<div className="text-[#a39890] text-sm py-12 text-center">Loading...</div>}>
      <PackOpenInner />
    </Suspense>
  )
}
