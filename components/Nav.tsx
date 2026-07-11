'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCredits } from '@/lib/credits-context'
import { supabase, USER_ID } from '@/lib/supabase'
import { PrestigeAvatar } from './PrestigeAvatar'

const BASE_NAV_LINKS: { href: string; label: string; main?: boolean }[] = [
  { href: '/picks',      label: 'Picks' },
  { href: '/trivia',     label: 'Trivia' },
  { href: '/packs',      label: 'Packs' },
  { href: '/collection', label: 'Collection' },
  { href: '/help',       label: 'How to Play' },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const { credits } = useCredits()
  const [prestigeLevel, setPrestigeLevel] = useState(0)
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null)
  const [draftEnabled, setDraftEnabled] = useState(false)
  const isLanding = pathname === '/'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsSignedIn(!!data.session)
    })
    fetch('/api/draft/settings')
      .then(r => r.json())
      .then(s => setDraftEnabled(!!s.enabled))
      .catch(() => {})
  }, [pathname])

  useEffect(() => {
    if (isLanding) return
    supabase
      .from('user_state')
      .select('prestige_level')
      .eq('user_id', USER_ID)
      .single()
      .then(({ data }) => setPrestigeLevel(data?.prestige_level ?? 0))
  }, [pathname, isLanding])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Landing nav: logo + How to Play + Sign In / Go to App
  if (isLanding) {
    return (
      <nav className="border-b border-[#1a1714]/[0.06] bg-[#fafaf7]/90 sticky top-0 z-50"
        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="font-black text-lg tracking-tight text-[#1a1714] hover:opacity-75 transition-opacity"
          >
            CardPicks
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/help"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#1a1714]/45 hover:text-[#1a1714] hover:bg-[#1a1714]/[0.04] transition-colors"
            >
              How to Play
            </Link>
            {isSignedIn === null ? (
              <div className="w-20 h-8 rounded-lg bg-[#1a1714]/[0.06] animate-pulse" />
            ) : isSignedIn ? (
              <Link
                href="/picks"
                className="px-4 py-1.5 rounded-lg text-sm font-black text-white bg-amber-500 hover:bg-amber-400 transition-colors"
              >
                Go to App →
              </Link>
            ) : (
              <Link
                href="/signin"
                className="px-4 py-1.5 rounded-lg text-sm font-black text-white bg-amber-500 hover:bg-amber-400 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>
    )
  }

  // App nav: full links + credits + profile + sign out
  return (
    <nav className="border-b border-[#e2ddd6] bg-white sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">

        <Link
          href="/"
          className="font-black text-lg tracking-tight text-[#1a1714] hover:opacity-75 transition-opacity"
        >
          CardPicks
        </Link>

        <div className="flex items-center gap-0.5">
          {[...(draftEnabled ? [{ href: '/draft', label: 'Draft', main: true }] : []), ...BASE_NAV_LINKS].map(({ href, label, main }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'text-[#1a1714] font-bold'
                    : main
                    ? 'text-amber-600 font-bold hover:text-amber-700 hover:bg-amber-50'
                    : 'text-[#a39890] font-medium hover:text-[#1a1714] hover:bg-[#f5f3f0]'
                }`}
              >
                {label}
              </Link>
            )
          })}

          <div className="w-px h-4 bg-[#e2ddd6] mx-2" />

          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            <span className="text-amber-500 text-xs leading-none">★</span>
            <span className="text-amber-700 font-bold text-sm tabular-nums">
              {credits === null ? '—' : credits.toLocaleString()}
            </span>
          </div>

          <Link href="/profile" className="ml-2">
            <PrestigeAvatar level={prestigeLevel} size="sm" />
          </Link>

          <Link
            href="/admin"
            className="ml-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[#c8c2b8] hover:text-[#1a1714] hover:bg-[#f5f3f0] transition-colors"
            title="Admin"
          >
            Admin
          </Link>

          <button
            onClick={handleSignOut}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-[#a39890] hover:text-[#1a1714] hover:bg-[#f5f3f0] transition-colors"
            title="Sign out"
          >
            Out
          </button>
        </div>

      </div>
    </nav>
  )
}
