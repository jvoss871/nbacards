'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const ADMIN_SECTIONS = [
  {
    href: '/admin/draft',
    title: 'Draft Controls',
    description: 'Manage the NBA Draft board — settings, prospects, lock time, and scoring.',
    icon: '🏀',
  },
  {
    href: '/admin/accounts',
    title: 'Account Lookup',
    description: 'Search users by email, view stats, adjust credits, and troubleshoot accounts.',
    icon: '👤',
  },
  {
    href: '/admin/trivia',
    title: 'Trivia Questions',
    description: 'Review flagged questions, edit correct answers, and search the question bank.',
    icon: '❓',
  },
  {
    href: '/admin/players',
    title: 'Player Pool',
    description: 'Manage which 205 players are in the pool, drag and drop to assign tiers.',
    icon: '🃏',
  },
  {
    href: '/admin/dev',
    title: 'Dev Tools',
    description: 'Move schedule, force winners, add credits, unlock trivia, simulate prestige, reset account.',
    icon: '🛠',
  },
]

interface Stats {
  userCount: number
  revenueCents: number
  pendingFlags: number
}

function StatCard({ label, value, href, alert }: { label: string; value: string; href?: string; alert?: boolean }) {
  const inner = (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
      href ? 'hover:shadow-md hover:border-[#1a1714]/20 cursor-pointer' : ''
    } ${alert ? 'border-amber-300' : 'border-[#e2ddd6]'}`}>
      <p className={`text-[10px] font-black uppercase tracking-widest ${alert ? 'text-amber-500' : 'text-[#a39890]'}`}>{label}</p>
      <p className={`text-2xl font-black mt-1 tabular-nums ${alert ? 'text-amber-600' : 'text-[#1a1714]'}`}>{value}</p>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  async function runTierSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/sync-2k-ratings', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        const { tiers, pool_total } = data
        setSyncResult(`Done — ${pool_total} in pool · ${tiers.platinum} platinum · ${tiers.gold} gold · ${tiers.silver} silver · ${tiers.bronze} bronze`)
      } else {
        setSyncResult(`Error: ${data.error ?? 'unknown'}`)
      }
    } catch {
      setSyncResult('Network error')
    }
    setSyncing(false)
  }

  const revenue = stats
    ? `$${(stats.revenueCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—'
  const users        = stats ? stats.userCount.toLocaleString() : '—'
  const flags        = stats ? stats.pendingFlags.toLocaleString() : '—'
  const hasFlags     = (stats?.pendingFlags ?? 0) > 0

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-500/80 mb-1">Admin</p>
        <h1 className="text-2xl font-black text-[#1a1714]">Dashboard</h1>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Registered Users" value={users} />
        <StatCard label="Total Revenue" value={revenue} />
        <StatCard label="Flagged Questions" value={flags} href="/admin/trivia" alert={hasFlags} />
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={runTierSync}
          disabled={syncing}
          className="px-5 py-2.5 bg-[#1a1714] hover:bg-[#2c2825] text-white text-xs font-black rounded-xl transition-colors disabled:opacity-40"
        >
          {syncing ? 'Applying…' : 'Apply Tier Overrides'}
        </button>
        {syncResult && (
          <p className="text-xs text-[#6b6259]">{syncResult}</p>
        )}
      </div>

      <div className="grid gap-3">
        {ADMIN_SECTIONS.map(section => (
          <Link
            key={section.href}
            href={section.href}
            className="flex items-center gap-4 bg-white border border-[#e2ddd6] rounded-2xl p-5 shadow-sm hover:border-[#1a1714]/20 hover:shadow-md transition-all group"
          >
            <div className="text-3xl leading-none select-none">{section.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-[#1a1714] group-hover:text-amber-600 transition-colors">{section.title}</p>
              <p className="text-xs text-[#a39890] mt-0.5">{section.description}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#c8c2b8] group-hover:text-amber-500 transition-colors flex-shrink-0">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}
