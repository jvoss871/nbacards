'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const ACCOUNT_SECTIONS = [
  {
    href: '/admin/accounts',
    title: 'Account Lookup',
    description: 'Search users by email, view stats, adjust credits, and troubleshoot accounts.',
    icon: '👤',
  },
  {
    href: '/admin/waitlist',
    title: 'Waitlist',
    description: 'View and export emails from the pre-season signup page.',
    icon: '📧',
  },
]

const GAME_SECTIONS = [
  {
    href: '/admin/dev',
    title: 'Dev Tools',
    description: 'Add credits, unlock trivia, simulate prestige, sync roster & photos, reset account.',
    icon: '🛠',
  },
  {
    href: '/admin/picks',
    title: 'Pick’em',
    description: 'Sync the game schedule from BallDontLie and shift dates for testing.',
    icon: '📅',
  },
  {
    href: '/admin/trivia',
    title: 'Trivia Questions',
    description: 'Review flagged questions, edit correct answers, and search the question bank.',
    icon: '❓',
  },
  {
    href: '/admin/draft',
    title: 'Draft Controls',
    description: 'Manage the NBA Draft board, settings, prospects, lock time, and scoring.',
    icon: '🏀',
  },
]

interface Stats {
  userCount: number
  revenueCents: number
  revenueCents30d: number
  pendingFlags: number
}

function StatCard({ label, value, href, alert, subLabel, subValue }: {
  label: string; value: string; href?: string; alert?: boolean; subLabel?: string; subValue?: string
}) {
  const inner = (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
      href ? 'hover:shadow-md hover:border-[#1a1714]/20 cursor-pointer' : ''
    } ${alert ? 'border-amber-300' : 'border-[#e2ddd6]'}`}>
      <p className={`text-[10px] font-black uppercase tracking-widest ${alert ? 'text-amber-500' : 'text-[#a39890]'}`}>{label}</p>
      <p className={`text-2xl font-black mt-1 tabular-nums ${alert ? 'text-amber-600' : 'text-[#1a1714]'}`}>{value}</p>
      {subValue && (
        <p className="text-[10px] text-[#a39890] mt-2 pt-2 border-t border-[#f0ede8] tabular-nums">
          <span className="font-black text-[#6b6259]">{subValue}</span> {subLabel}
        </p>
      )}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function SectionCard({ href, title, description, icon }: { href: string; title: string; description: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 bg-white border border-[#e2ddd6] rounded-2xl p-5 shadow-sm hover:border-[#1a1714]/20 hover:shadow-md transition-all group"
    >
      <div className="text-3xl leading-none select-none">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-[#1a1714] group-hover:text-amber-600 transition-colors">{title}</p>
        <p className="text-xs text-[#a39890] mt-0.5">{description}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#c8c2b8] group-hover:text-amber-500 transition-colors flex-shrink-0">
        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </Link>
  )
}

function Toggle({
  label, desc, value, onChange, saving,
}: {
  label: string
  desc: string
  value: boolean
  onChange: (v: boolean) => void
  saving?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={() => onChange(!value)}
        disabled={saving}
        className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 ${
          value ? 'bg-amber-500' : 'bg-[#d4cfc9]'
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
          value ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </button>
      <div>
        <p className="text-xs font-black text-[#1a1714] leading-none">{label}</p>
        <p className="text-[10px] text-[#a39890] mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [draftEnabled, setDraftEnabled] = useState(false)
  const [picksEnabled, setPicksEnabled] = useState(true)
  const [savingToggles, setSavingToggles] = useState(false)
  const [toggleSaved, setToggleSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats).catch(() => {})
    fetch('/api/admin/draft/settings')
      .then(r => r.json())
      .then(d => {
        setDraftEnabled(d.draft_enabled === true)
        setPicksEnabled(d.picks_enabled !== false)
      })
      .catch(() => {})
  }, [])

  async function saveToggles(draft: boolean, picks: boolean) {
    setSavingToggles(true)
    setToggleSaved(false)
    await fetch('/api/admin/draft/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { key: 'draft_enabled', value: draft },
        { key: 'picks_enabled', value: picks },
      ]),
    })
    setSavingToggles(false)
    setToggleSaved(true)
    setTimeout(() => setToggleSaved(false), 2000)
  }

  const fmtCents = (cents: number) =>
    `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const revenue     = stats ? fmtCents(stats.revenueCents) : '-'
  const revenue30d  = stats ? fmtCents(stats.revenueCents30d) : '-'
  const users    = stats ? stats.userCount.toLocaleString() : '-'
  const flags    = stats ? stats.pendingFlags.toLocaleString() : '-'
  const hasFlags = (stats?.pendingFlags ?? 0) > 0

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-500/80 mb-1">Admin</p>
        <h1 className="text-2xl font-black text-[#1a1714]">Dashboard</h1>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Registered Users" value={users} />
        <StatCard label="Total Revenue" value={revenue} subLabel="last 30 days" subValue={revenue30d} />
        <StatCard label="Flagged Questions" value={flags} href="/admin/trivia" alert={hasFlags} />
      </div>

      {/* Feature toggles */}
      <div className="flex items-center gap-4 mb-6">
        <Toggle
          label="Picks"
          desc="Hide during off-season"
          value={picksEnabled}
          onChange={v => { setPicksEnabled(v); saveToggles(draftEnabled, v) }}
          saving={savingToggles}
        />
        <Toggle
          label="Draft"
          desc="Show Draft in nav"
          value={draftEnabled}
          onChange={v => { setDraftEnabled(v); saveToggles(v, picksEnabled) }}
          saving={savingToggles}
        />
        {toggleSaved && (
          <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Saved</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a39890] mb-3">Account Management</p>
          <div className="grid gap-3">
            {ACCOUNT_SECTIONS.map(s => <SectionCard key={s.href} {...s} />)}
          </div>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a39890] mb-3">Dev Tools &amp; Game Management</p>
          <div className="grid gap-3">
            {GAME_SECTIONS.map(s => <SectionCard key={s.href} {...s} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
