'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useUserId } from '@/lib/use-user-id'
import { authedFetch } from '@/lib/authed-fetch'
import type { Player, ActionCardType } from '@/lib/types'
import { Tooltip } from '@/components/Tooltip'
import ActionCardReveal from '@/components/ActionCardReveal'
import PlayerCardFlip from '@/components/PlayerCardFlip'
import { ActionCard } from '@/components/ActionCard'
import { PlatinumReveal } from '@/components/PlatinumReveal'
import { PackTearAnimation } from '@/components/PackTearAnimation'
import { OnboardingCallout } from '@/components/OnboardingCallout'
import { useCredits } from '@/lib/credits-context'
import { supabase } from '@/lib/supabase'

interface UserActionCardWithType {
  id: string
  action_card_type_id: string
  used: boolean
  type: ActionCardType
}

function PackOpenInner() {
  const params = useSearchParams()
  const router = useRouter()
  const packId = params.get('packId')
  const packNameParam = params.get('packName')
  const { userId } = useUserId()
  const { setCredits } = useCredits()

  const hasLoaded = useRef(false)
  const [packName, setPackName] = useState<string | null>(null)
  const [drawnCards, setDrawnCards] = useState<{ player: Player; reliability: number }[]>([])
  const [flipped, setFlipped] = useState<boolean[]>([])
  const [bonusCard, setBonusCard] = useState<ActionCardType | null>(null)
  const [bonusFlipped, setBonusFlipped] = useState(false)
  const [bonusActionCardId, setBonusActionCardId] = useState<string | null>(null)
  const [packsActionCards, setPacksActionCards] = useState<UserActionCardWithType[]>([])
  const [loading, setLoading] = useState(true)
  const [revealingAll, setRevealingAll] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)
  const [platinumReveal, setPlatinumReveal] = useState(false)
  const [showTear, setShowTear] = useState(true)

  useEffect(() => {
    if (!packId) { router.replace('/packs'); return }
    if (!userId) return
    if (hasLoaded.current) return
    hasLoaded.current = true

    async function load() {
      // Credits, card draw, and action-card rolls all happen server-side — the client
      // only ever renders whatever the server decided.
      const res = await authedFetch('/api/packs/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: packId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (res.status === 402) { router.replace('/packs'); return }
        setOpenError(err.error ?? 'Failed to open pack')
        setLoading(false)
        return
      }
      const data = await res.json()
      setCredits(data.credits)
      setPackName(data.pack_name)
      setDrawnCards(data.cards)
      setFlipped(new Array(data.cards.length).fill(false))
      setBonusCard(data.bonusCard ?? null)
      setBonusActionCardId(data.bonusActionCardId ?? null)

      const { data: actionData } = await supabase
        .from('user_action_cards')
        .select('*, type:action_card_types(*)')
        .eq('user_id', userId)
        .eq('used', false)
      const allAction = (actionData ?? []) as UserActionCardWithType[]
      setPacksActionCards(allAction.filter(c => c.type?.context === 'packs'))

      setLoading(false)
    }
    load()
  }, [packId, router, setCredits, userId])

  const allPlayerCardsRevealed = flipped.length > 0 && flipped.every(Boolean) && drawnCards.length > 0
  const allRevealed = allPlayerCardsRevealed && (bonusCard ? bonusFlipped : true)

  async function handleReroll(idx: number) {
    if (!packId) return
    const card = packsActionCards.find(c => c.type.id === 'reroll')
    if (!card) return

    const res = await authedFetch('/api/packs/reroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_card_id: card.id,
        pack_id: packId,
        replace_player_id: drawnCards[idx].player.id,
      }),
    })
    if (!res.ok) return
    const { player, reliability } = await res.json()
    setDrawnCards(prev => prev.map((c, i) => i === idx ? { player, reliability } : c))
    setFlipped(prev => prev.map((v, i) => (i === idx ? false : v)))
    setPacksActionCards(prev => prev.filter(c => c.id !== card.id))
  }

  async function handleRepack() {
    if (!packId) return
    const card = packsActionCards.find(c => c.type.id === 'repack')
    if (!card) return

    const res = await authedFetch('/api/packs/repack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_card_id: card.id,
        pack_id: packId,
        replace_player_ids: drawnCards.map(c => c.player.id),
        bonus_action_card_id: bonusActionCardId,
      }),
    })
    if (!res.ok) return
    const { cards } = await res.json()
    setDrawnCards(cards)
    setFlipped(new Array(cards.length).fill(false))
    setBonusCard(null)
    setBonusFlipped(false)
    setBonusActionCardId(null)
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

  if (openError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-red-400 font-semibold">{openError}</p>
        <p className="text-[#a39890] text-sm">Any deducted credits have been refunded.</p>
        <button
          onClick={() => router.push('/packs')}
          className="px-5 py-2.5 bg-[#1a1714] text-white rounded-xl text-sm font-bold"
        >
          Back to Packs
        </button>
      </div>
    )
  }

  // The tear plays immediately using the pack name carried over from the store — it doesn't
  // need to wait on the /api/packs/open response, which is drawing the actual cards in the
  // background during the same window.
  const tearPackName = packNameParam ?? packName
  if (showTear && tearPackName) {
    return <PackTearAnimation packName={tearPackName} onDone={() => setShowTear(false)} />
  }

  if (loading || !packName) {
    return <div className="text-[#a39890] text-sm py-12 text-center">Drawing cards...</div>
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-black text-[#1a1714]">{packName}</h1>
        <p className="text-[#a39890] text-sm mt-1">
          {allRevealed ? 'All cards revealed' : 'Tap a card to reveal it'}
        </p>
      </div>

      <OnboardingCallout id="pack_reveal" className="max-w-md mx-auto">
        Tap a card to flip it. Reroll and Repack can appear after you reveal — burn one to redraw.
      </OnboardingCallout>

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
