'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCredits } from '@/lib/credits-context'
import { supabase } from '@/lib/supabase'
import { useUserId } from '@/lib/use-user-id'
import { authedFetch } from '@/lib/authed-fetch'
import { PrestigeAvatar } from './PrestigeAvatar'

function Logo() {
  return (
    <span className="flex items-center gap-1">
      <img src="https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nba.png&h=200&w=200" alt="NBA" className="w-8 h-8 object-contain" />
      <span className="font-black text-lg tracking-tight text-[#1a1714]">
        <span className="text-amber-500">Card</span>Picks
      </span>
    </span>
  )
}

const BASE_NAV_LINKS: { href: string; label: string; main?: boolean }[] = [
  { href: '/picks',       label: 'Picks' },
  { href: '/trivia',      label: 'Trivia' },
  { href: '/packs',       label: 'Packs' },
  { href: '/collection',  label: 'Collection' },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const { userId } = useUserId()
  const { credits } = useCredits()
  const [prestigeLevel, setPrestigeLevel] = useState(0)
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null)
  const [draftEnabled, setDraftEnabled] = useState(false)
  const [picksEnabled, setPicksEnabled] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const isLanding = pathname === '/' || pathname === '/join' || pathname === '/terms'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsSignedIn(!!data.session)
    })
    authedFetch('/api/draft/settings')
      .then(r => r.json())
      .then(s => {
        setDraftEnabled(!!s.enabled)
        setPicksEnabled(s.picks_enabled !== false)
      })
      .catch(() => {})
    authedFetch('/api/admin/is-admin')
      .then(r => r.json())
      .then(d => setIsAdmin(!!d.isAdmin))
      .catch(() => {})
  }, [pathname])

  useEffect(() => {
    if (isLanding || !userId) return
    supabase
      .from('user_state')
      .select('prestige_level')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => setPrestigeLevel(data?.prestige_level ?? 0))
  }, [pathname, isLanding, userId])

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
          <Link href="/" className="hover:opacity-75 transition-opacity">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            {isSignedIn === null ? (
              <div className="w-20 h-8 rounded-lg bg-[#1a1714]/[0.06] animate-pulse" />
            ) : isSignedIn ? (
              <Link
                href="/trivia"
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

        <Link href="/trivia" className="hover:opacity-75 transition-opacity">
          <Logo />
        </Link>

        <div className="flex items-center gap-0.5">
          {[
            ...(draftEnabled ? [{ href: '/draft', label: 'Draft', main: true }] : []),
            ...(picksEnabled ? [{ href: '/picks', label: 'Picks' }] : []),
            ...BASE_NAV_LINKS.filter(l => l.href !== '/picks'),
          ].map(({ href, label, main }) => {
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
              {credits === null ? '-' : credits.toLocaleString()}
            </span>
          </div>

          <Link href="/profile" className="ml-2">
            <PrestigeAvatar level={prestigeLevel} size="sm" />
          </Link>

          <Link
            href="/help"
            className="ml-1 w-6 h-6 flex items-center justify-center rounded-full text-xs font-black text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            title="How to Play"
          >
            ?
          </Link>

          <button
            onClick={handleSignOut}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-[#a39890] hover:text-[#1a1714] hover:bg-[#f5f3f0] transition-colors"
            title="Sign out"
          >
            Logout
          </button>

          {isAdmin && (
            <Link
              href="/admin"
              className="ml-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[#c8c2b8] hover:text-[#1a1714] hover:bg-[#f5f3f0] transition-colors"
              title="Admin"
            >
              Admin
            </Link>
          )}
        </div>

      </div>
    </nav>
  )
}
