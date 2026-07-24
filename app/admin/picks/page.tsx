'use client'

import { useState } from 'react'
import { authedFetch } from '@/lib/authed-fetch'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e2ddd6] rounded-2xl p-5 shadow-sm">
      <h2 className="text-[10px] font-black uppercase tracking-widest text-[#a39890] mb-4">{title}</h2>
      {children}
    </div>
  )
}

function ActionRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-bold text-[#1a1714]">{label}</p>
        {desc && <p className="text-xs text-[#a39890] mt-0.5">{desc}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">{children}</div>
    </div>
  )
}

function Btn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-xl text-xs font-black transition-colors disabled:opacity-40 bg-[#1a1714] hover:bg-[#2c2825] text-white"
    >
      {children}
    </button>
  )
}

export default function AdminPicksPage() {
  const [feedback, setFeedback]   = useState<Record<string, string>>({})
  const [syncDate, setSyncDate]   = useState('')
  const [syncing, setSyncing]     = useState(false)
  const [movingDates, setMovingDates] = useState(false)

  function flash(key: string, msg: string) {
    setFeedback(prev => ({ ...prev, [key]: msg }))
    setTimeout(() => setFeedback(prev => { const n = { ...prev }; delete n[key]; return n }), 2500)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <a href="/admin" className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-500/80 hover:text-amber-600 transition-colors">
            ← Admin
          </a>
          <h1 className="text-2xl font-black text-[#1a1714] mt-1">Pick&apos;em</h1>
        </div>
      </div>

      {/* Schedule */}
      <Section title="Schedule">
        <div className="space-y-4">
          <ActionRow label="Sync games from BallDontLie" desc="Fetches yesterday / today / tomorrow by default, or pick a specific date.">
            <input
              type="date"
              value={syncDate}
              onChange={e => setSyncDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#e2ddd6] text-xs focus:outline-none focus:border-[#1a1714]/30"
            />
            <span className="text-xs text-emerald-600 font-bold">{feedback.syncGames ?? ''}</span>
            <Btn
              disabled={syncing}
              onClick={async () => {
                setSyncing(true)
                const body = syncDate ? { dates: [syncDate] } : undefined
                const res = await fetch('/api/cron/sync-games', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: body ? JSON.stringify(body) : undefined,
                })
                const data = await res.json()
                flash('syncGames', res.ok
                  ? `+${data.added} added · ${data.updated} updated · ${data.settled} settled`
                  : data.error ?? 'Error')
                setSyncing(false)
              }}
            >
              {syncing ? 'Syncing…' : 'Sync'}
            </Btn>
          </ActionRow>

          <ActionRow label="Move games to today" desc="Shift all scheduled game dates to today so you can test the picks flow.">
            <span className="text-xs text-emerald-600 font-bold">{feedback.resetDates ?? ''}</span>
            <Btn
              disabled={movingDates}
              onClick={async () => {
                setMovingDates(true)
                const res = await authedFetch('/api/dev/reset-dates', { method: 'POST' })
                flash('resetDates', res.ok ? 'Done' : 'Error')
                setMovingDates(false)
              }}
            >
              Move to Today
            </Btn>
          </ActionRow>
        </div>
      </Section>

    </div>
  )
}
