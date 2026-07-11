'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PacksSkeleton } from '@/components/Skeleton'
import { supabase, USER_ID } from '@/lib/supabase'
import type { PackType } from '@/lib/types'
import { TIER_COLORS, TIER_LABEL } from '@/lib/game-logic'
import { useCredits } from '@/lib/credits-context'
import { CREDIT_PACKAGES } from '@/lib/stripe-packages'

const PACK_THEMES: Record<string, {
  heroGradient: string
  sectionBg: string
  topStripe: string
  nameStripe: string
  nameStripeText: string
  starCount: number
  starColor: string
  pattern: string
  glow: string
  buyBtn: string
  buyBtnDisabled: string
}> = {
  Starter: {
    heroGradient:   'from-blue-950 via-[#0f1b3d] to-[#0a1128]',
    sectionBg:      'bg-[#060a18]',
    topStripe:      'bg-red-600',
    nameStripe:     'bg-red-600',
    nameStripeText: 'text-white',
    starCount:      1,
    starColor:      'text-red-400',
    pattern:        'repeating-linear-gradient(135deg,transparent,transparent 12px,rgba(255,255,255,0.02) 12px,rgba(255,255,255,0.02) 24px)',
    glow:           '0 0 40px rgba(59,130,246,0.20), 0 12px 48px rgba(0,0,0,0.90)',
    buyBtn:         'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black',
    buyBtnDisabled: 'bg-white/5 text-white/20 cursor-not-allowed',
  },
  Hardwood: {
    heroGradient:   'from-amber-950 via-[#1c1105] to-[#100b02]',
    sectionBg:      'bg-[#0c0802]',
    topStripe:      'bg-amber-500',
    nameStripe:     'bg-amber-500',
    nameStripeText: 'text-stone-950',
    starCount:      3,
    starColor:      'text-amber-400',
    pattern:        'repeating-linear-gradient(135deg,transparent,transparent 12px,rgba(255,255,255,0.02) 12px,rgba(255,255,255,0.02) 24px)',
    glow:           '0 0 40px rgba(217,119,6,0.20), 0 12px 48px rgba(0,0,0,0.90)',
    buyBtn:         'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black',
    buyBtnDisabled: 'bg-white/5 text-white/20 cursor-not-allowed',
  },
  Elite: {
    heroGradient:   'from-cyan-950 via-[#060d1f] to-[#02050f]',
    sectionBg:      'bg-[#020408]',
    topStripe:      'bg-cyan-400',
    nameStripe:     'bg-cyan-400',
    nameStripeText: 'text-cyan-950',
    starCount:      5,
    starColor:      'text-cyan-400',
    pattern:        'repeating-linear-gradient(135deg,transparent,transparent 12px,rgba(255,255,255,0.03) 12px,rgba(255,255,255,0.03) 24px)',
    glow:           '0 0 60px rgba(34,211,238,0.25), 0 12px 48px rgba(0,0,0,0.95)',
    buyBtn:         'bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-cyan-950 font-black',
    buyBtnDisabled: 'bg-white/5 text-white/20 cursor-not-allowed',
  },
}

const DEFAULT_THEME = PACK_THEMES.Starter

const TIER_BAR_COLOR: Record<string, string> = {
  platinum: 'bg-blue-200',
  gold:     'bg-yellow-400',
  silver:   'bg-slate-300',
  bronze:   'bg-amber-400',
}

export default function PackStorePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [packs, setPacks] = useState<PackType[]>([])
  const { credits, setCredits } = useCredits()
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [purchasingPkg, setPurchasingPkg] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [isNewUser, setIsNewUser] = useState(false)

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => {
    async function load() {
      const [packsRes, cardsRes] = await Promise.all([
        supabase.from('pack_types').select('*').order('credit_cost'),
        supabase.from('user_cards').select('id').eq('user_id', USER_ID).limit(1),
      ])
      setPacks(packsRes.data ?? [])
      setIsNewUser((cardsRes.data ?? []).length === 0)
      setLoading(false)
    }
    load()
  }, [])

  // Handle return from Stripe Checkout
  useEffect(() => {
    if (searchParams.get('purchase') === 'success') {
      // Webhook may take a moment — poll credits once after a short delay
      setTimeout(async () => {
        const { data } = await supabase
          .from('user_state')
          .select('credits')
          .eq('user_id', USER_ID)
          .single()
        if (data) setCredits(data.credits)
        showToast('Credits added to your account!', true)
      }, 1500)
      // Clean the URL without re-render
      window.history.replaceState({}, '', '/packs')
    }
  }, [searchParams, setCredits, showToast])

  async function handleBuyCreditPackage(packageId: string) {
    setPurchasingPkg(packageId)
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, userId: USER_ID }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        showToast(data.error ?? 'Something went wrong', false)
        setPurchasingPkg(null)
      }
    } catch {
      showToast('Something went wrong', false)
      setPurchasingPkg(null)
    }
  }

  async function handleBuy(pack: PackType) {
    if ((credits ?? 0) < pack.credit_cost) {
      showToast('Not enough credits', false)
      return
    }
    setBuying(pack.id)
    router.push(`/open?packId=${pack.id}`)
  }

  if (loading) return <PacksSkeleton />

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg ${
          toast.ok ? 'bg-[#1a1714] text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-xl font-black text-[#1a1714]">Pack Store</h1>
        <p className="text-[#a39890] text-sm mt-1">
          You have{' '}
          <span className="text-amber-700 font-bold">
            {credits === null ? '—' : credits.toLocaleString()} credits
          </span>
        </p>
      </div>

      {isNewUser && credits === 200 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm font-black text-amber-900">Welcome — you have 200 free credits.</p>
          <p className="text-xs text-amber-700 mt-0.5">Open a Starter pack to build your first lineup.</p>
        </div>
      )}

      {/* Buy Credits */}
      <div className="rounded-2xl border border-[#e2ddd6] bg-white shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-[#f0ede8]">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#a39890]">Top Up Credits</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[#f0ede8]">
          {CREDIT_PACKAGES.map(pkg => (
            <button
              key={pkg.id}
              disabled={purchasingPkg === pkg.id}
              onClick={() => handleBuyCreditPackage(pkg.id)}
              className="relative flex flex-col items-center gap-1.5 px-3 py-4 hover:bg-[#faf9f6] active:bg-[#f5f3f0] transition-colors disabled:opacity-50"
            >
              {pkg.tag && (
                <span className="absolute top-2 right-2 text-[7px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                  {pkg.tag}
                </span>
              )}
              <span className="text-base font-black text-[#1a1714] tabular-nums">
                {pkg.credits.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#a39890] font-semibold">credits</span>
              <span className="mt-1 text-xs font-black text-[#1a1714]">
                {purchasingPkg === pkg.id ? '…' : pkg.displayPrice}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {packs.map(pack => {
          const theme = PACK_THEMES[pack.name] ?? DEFAULT_THEME
          const canAfford = (credits ?? 0) >= pack.credit_cost
          const odds = pack.odds as Record<string, number>

          return (
            <div
              key={pack.id}
              className={`rounded-xl overflow-hidden border border-white/[0.07] flex flex-col ${theme.sectionBg}`}
              style={{ boxShadow: theme.glow }}
            >
              {/* ── Hero ── */}
              <div className={`relative bg-gradient-to-b ${theme.heroGradient} flex flex-col overflow-hidden`}>
                <div className="absolute inset-0 pointer-events-none" style={{ background: theme.pattern }} />
                <div className="pack-shine absolute inset-0" />

                {/* Top stripe */}
                <div className={`relative ${theme.topStripe} px-2 py-1 flex items-center justify-between`}>
                  <span className="text-white/90 text-[9px] font-black uppercase tracking-[0.15em]">CardPicks</span>
                  <span className="text-white/80 text-[9px] font-semibold">{pack.card_count} cards</span>
                </div>

                {/* Pack name */}
                <div className="relative flex flex-col items-center justify-center pt-5 pb-6 px-2 gap-3">
                  <div className={`w-full ${theme.nameStripe} py-3 px-2 text-center`}>
                    <div className={`${theme.nameStripeText} font-black text-2xl tracking-tight uppercase leading-none`}>
                      {pack.name}
                    </div>
                    <div className={`${theme.nameStripeText} opacity-60 text-[8px] tracking-[0.25em] uppercase mt-1 font-semibold`}>
                      Series
                    </div>
                  </div>
                  <div className={`text-base tracking-[0.5em] ${theme.starColor}`}>
                    {'★'.repeat(theme.starCount)}
                  </div>
                </div>
              </div>

              {/* ── Odds + Buy ── */}
              <div className={`${theme.sectionBg} px-3 pt-3 pb-3.5 flex flex-col gap-3`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] text-white/25 uppercase tracking-widest font-semibold">Odds per pack</span>
                </div>
                <div className="space-y-2">
                  {(['platinum', 'gold', 'silver', 'bronze'] as const).map(tier => {
                    const perSlot = odds[tier] ?? 0
                    if (perSlot === 0) return <div key={tier} className="h-[20px]" />
                    const isGuaranteed = pack.guaranteed_tier === tier
                    const packPct = isGuaranteed
                      ? 100
                      : Math.round((1 - Math.pow(1 - perSlot, pack.card_count)) * 100)
                    const barWidth = Math.min(packPct, 96)
                    const tc = TIER_COLORS[tier]
                    return (
                      <div key={tier} className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold w-11 shrink-0 ${tc.text}`}>{TIER_LABEL[tier]}</span>
                        <div className="flex-1 h-1 rounded-full bg-white/[0.07] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${TIER_BAR_COLOR[tier] ?? 'bg-white/40'}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-white/30 w-8 text-right tabular-nums font-medium shrink-0">
                          {isGuaranteed ? '100%' : `~${packPct}%`}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <button
                  onClick={() => handleBuy(pack)}
                  disabled={!canAfford || buying === pack.id}
                  className={`w-full py-2.5 rounded-lg text-xs font-black tracking-wide transition-all ${
                    buying === pack.id
                      ? `${theme.buyBtn} opacity-50`
                      : canAfford
                      ? theme.buyBtn
                      : theme.buyBtnDisabled
                  }`}
                >
                  {buying === pack.id
                    ? 'Opening...'
                    : canAfford
                    ? `${pack.credit_cost.toLocaleString()} cr`
                    : `Need ${(pack.credit_cost - (credits ?? 0)).toLocaleString()}`}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
