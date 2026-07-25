'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PacksSkeleton } from '@/components/Skeleton'
import { supabase } from '@/lib/supabase'
import { useUserId } from '@/lib/use-user-id'
import type { PackType } from '@/lib/types'
import { TIER_COLORS, TIER_LABEL } from '@/lib/game-logic'
import { useCredits } from '@/lib/credits-context'

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
  const { userId } = useUserId()
  const [packs, setPacks] = useState<PackType[]>([])
  const { credits } = useCredits()
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [isNewUser, setIsNewUser] = useState(false)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!userId) return
    async function load() {
      const [packsRes, cardsRes] = await Promise.all([
        supabase.from('pack_types').select('*').order('credit_cost'),
        supabase.from('user_cards').select('id').eq('user_id', userId).limit(1),
      ])
      setPacks(packsRes.data ?? [])
      setIsNewUser((cardsRes.data ?? []).length === 0)
      setLoading(false)
    }
    load()
  }, [userId])

  async function handleBuy(pack: PackType) {
    if ((credits ?? 0) < pack.credit_cost) {
      showToast('Not enough credits', false)
      return
    }
    setBuying(pack.id)
    router.push(`/open?packId=${pack.id}&packName=${encodeURIComponent(pack.name)}`)
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
      </div>

      {isNewUser && credits === 200 && (
        <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#0c1428 0%,#111827 100%)' }}>
          <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,#FFD700,transparent)' }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_80%_at_20%_50%,rgba(251,191,36,0.09),transparent_70%)] pointer-events-none" />
          <div className="relative flex items-center gap-5 px-5 py-4">
            <div className="flex-shrink-0 text-center">
              <div className="text-5xl font-black leading-none tabular-nums" style={{ color: '#FFD700', textShadow: '0 0 32px rgba(251,191,36,0.45)' }}>200</div>
              <div className="text-[8px] font-black uppercase tracking-[0.3em] text-amber-400/60 mt-0.5">Credits</div>
            </div>
            <div className="w-px self-stretch bg-white/[0.08]" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400 mb-1">Welcome to CardPicks</p>
              <p className="text-white font-black text-sm leading-tight">Your starter credits are loaded.</p>
              <p className="text-white/45 text-[11px] mt-1 leading-snug">Open a Starter pack to build your first lineup.</p>
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-px bg-white/[0.05]" />
        </div>
      )}

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
                <div className="relative flex flex-col items-center justify-center pt-4 pb-6 px-2 gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nba.png&h=80&w=80"
                    alt="NBA"
                    className="w-10 h-10 object-contain drop-shadow-lg"
                  />
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
                  <span className="text-[9px] text-white/60 uppercase tracking-widest font-semibold">Odds per pack</span>
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
                        <span className="text-[10px] text-white/65 w-8 text-right tabular-nums font-medium shrink-0">
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
