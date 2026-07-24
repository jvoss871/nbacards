'use client'

import { useState } from 'react'
import { authedFetch } from '@/lib/authed-fetch'

const ACTION_CARD_TYPES = [
  { id: 'skip',        name: 'Skip' },
  { id: 'safety_net',  name: 'Safety Net' },
  { id: 'insurance',   name: 'Insurance' },
  { id: 'double_down', name: 'Double Down' },
  { id: 'reroll',      name: 'Reroll' },
  { id: 'repack',      name: 'Repack' },
]

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

function Btn({ onClick, disabled, children, danger }: { onClick: () => void; disabled?: boolean; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl text-xs font-black transition-colors disabled:opacity-40 ${
        danger
          ? 'bg-red-50 hover:bg-red-100 border border-red-200 text-red-600'
          : 'bg-[#1a1714] hover:bg-[#2c2825] text-white'
      }`}
    >
      {children}
    </button>
  )
}

export default function AdminDevPage() {
  const [creditAmount, setCreditAmount]     = useState(500)
  const [actionCardType, setActionCardType] = useState('skip')
  const [seeding, setSeeding]               = useState(false)
  const [feedback, setFeedback]             = useState<Record<string, string>>({})
  const [syncingRoster, setSyncingRoster]   = useState(false)
  const [syncingPhotos, setSyncingPhotos]   = useState(false)

  function flash(key: string, msg: string) {
    setFeedback(prev => ({ ...prev, [key]: msg }))
    setTimeout(() => setFeedback(prev => { const n = { ...prev }; delete n[key]; return n }), 2500)
  }

  async function post(url: string, body?: object): Promise<boolean> {
    const res = await authedFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    return res.ok
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <a href="/admin" className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-500/80 hover:text-amber-600 transition-colors">
            ← Admin
          </a>
          <h1 className="text-2xl font-black text-[#1a1714] mt-1">Dev Tools</h1>
        </div>
      </div>

      {/* Roster */}
      <Section title="Roster">
        <ActionRow label="Sync rosters" desc="Pulls fresh team assignments from BallDontLie, cross-checked against NBA.com's active rosters. Fixes stale teams after a trade, and drops players no longer active.">
          <span className="text-xs text-emerald-600 font-bold">{feedback.syncRoster ?? ''}</span>
          <Btn
            disabled={syncingRoster}
            onClick={async () => {
              setSyncingRoster(true)
              const res = await authedFetch('/api/admin/sync-roster', { method: 'POST' })
              const data = await res.json()
              flash('syncRoster', res.ok
                ? `${data.updated} updated · ${data.inserted} added · ${data.removed} removed`
                : data.error ?? 'Error')
              setSyncingRoster(false)
            }}
          >
            {syncingRoster ? 'Syncing…' : 'Sync'}
          </Btn>
        </ActionRow>

        <ActionRow label="Sync player photos" desc="Refreshes headshots from NBA.com's CDN, including anyone whose photo is a stale TheSportsDB cutout from a previous team.">
          <span className="text-xs text-emerald-600 font-bold">{feedback.syncPhotos ?? ''}</span>
          <Btn
            disabled={syncingPhotos}
            onClick={async () => {
              setSyncingPhotos(true)
              const res = await authedFetch('/api/admin/sync-players', { method: 'POST' })
              const data = await res.json()
              flash('syncPhotos', res.ok
                ? `${data.nba_cdn} from NBA · ${data.thesportsdb} fallback · ${data.not_found} not found`
                : data.error ?? 'Error')
              setSyncingPhotos(false)
            }}
          >
            {syncingPhotos ? 'Syncing…' : 'Sync'}
          </Btn>
        </ActionRow>

        <ActionRow label="Update tiers & pool" desc="Manually re-sort tiers and flip players in or out of the 205-player pool.">
          <a
            href="/admin/players"
            className="px-4 py-2 rounded-xl text-xs font-black bg-[#1a1714] hover:bg-[#2c2825] text-white transition-colors"
          >
            Open →
          </a>
        </ActionRow>
      </Section>

      {/* Trivia */}
      <Section title="Trivia">
        <ActionRow label="Unlock today's trivia" desc="Resets today's session so you can play again.">
          <span className="text-xs text-emerald-600 font-bold">{feedback.trivia ?? ''}</span>
          <Btn onClick={async () => {
            const ok = await post('/api/dev/unlock-trivia')
            flash('trivia', ok ? 'Unlocked' : 'Error')
          }}>
            Unlock
          </Btn>
        </ActionRow>
      </Section>

      {/* Credits */}
      <Section title="Credits">
        <ActionRow label="Add credits" desc="Adds credits directly to the account balance.">
          <span className="text-xs text-emerald-600 font-bold">{feedback.credits ?? ''}</span>
          <input
            type="number"
            value={creditAmount}
            onChange={e => setCreditAmount(Number(e.target.value))}
            className="w-24 px-2.5 py-1.5 rounded-xl border border-[#e2ddd6] text-sm text-center focus:outline-none focus:border-[#1a1714]/30"
          />
          <Btn onClick={async () => {
            const ok = await post('/api/dev/add-credits', { amount: creditAmount })
            flash('credits', ok ? `+${creditAmount} added` : 'Error')
          }}>
            Add
          </Btn>
        </ActionRow>
      </Section>

      {/* Action Cards */}
      <Section title="Action Cards">
        <ActionRow label="Give action card" desc="Adds one action card to the account.">
          <span className="text-xs text-emerald-600 font-bold">{feedback.actionCard ?? ''}</span>
          <select
            value={actionCardType}
            onChange={e => setActionCardType(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-[#e2ddd6] text-sm bg-white focus:outline-none focus:border-[#1a1714]/30"
          >
            {ACTION_CARD_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <Btn onClick={async () => {
            const ok = await post('/api/dev/add-action-card', { card_type_id: actionCardType })
            flash('actionCard', ok ? 'Added' : 'Error')
          }}>
            Give
          </Btn>
        </ActionRow>
      </Section>

      {/* Prestige */}
      <Section title="Prestige">
        <ActionRow label="Complete collection" desc="Seeds one card per in-pool player you don't already own, so you can trigger prestige naturally and pick a legend.">
          <span className="text-xs text-emerald-600 font-bold">{feedback.prestige ?? ''}</span>
          <Btn
            disabled={seeding}
            onClick={async () => {
              setSeeding(true)
              const res = await authedFetch('/api/dev/seed-full-set', { method: 'POST' })
              const data = await res.json()
              flash('prestige', res.ok
                ? data.added === 0 ? 'Already complete' : `+${data.added} cards added (${data.total} total)`
                : data.error ?? 'Error')
              setSeeding(false)
            }}
          >
            {seeding ? 'Seeding…' : 'Complete Collection'}
          </Btn>
        </ActionRow>
      </Section>

      {/* Reset account */}
      <div className="border border-red-200 rounded-2xl p-5">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-4">Danger Zone</h2>
        <ActionRow label="Reset account" desc="Wipes all cards, legends, picks, trivia sessions, action cards, and onboarding progress (as if brand new). Credits reset to 200.">
          <span className="text-xs text-emerald-600 font-bold">{feedback.resetAccount ?? ''}</span>
          <Btn
            danger
            onClick={async () => {
              if (!confirm('Reset the entire account? This cannot be undone.')) return
              const ok = await post('/api/dev/reset-account')
              flash('resetAccount', ok ? 'Done' : 'Error')
            }}
          >
            Reset Account
          </Btn>
        </ActionRow>
      </div>

    </div>
  )
}
