'use client'

import { useEffect, useRef, useState } from 'react'

interface UserRow {
  id: string
  email: string
  created_at: string
  credits: number | null
  username: string | null
  prestige_level: number
}

interface UserDetail {
  id: string
  email: string
  created_at: string
  credits: number
  username: string | null
  prestige_level: number
  cards: number
  picks: { total: number; correct: number; pending: number }
  trivia: { total: number; won: number }
  credits_earned: { picks: number; trivia: number; draft: number; total: number }
  total_spent_cents: number
}

interface UserEvent {
  id: string
  event_type: string
  metadata: Record<string, unknown>
  created_at: string
}

function fmt(n: number) { return n.toLocaleString() }
function fmtUSD(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-[#a39890]">{label}</p>
      <p className="text-lg font-black text-[#1a1714] mt-0.5 tabular-nums leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-[#a39890] mt-0.5">{sub}</p>}
    </div>
  )
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  pack_opened:        { label: 'Pack Opened',         color: 'bg-purple-100 text-purple-700' },
  prestige_attempt:   { label: 'Prestige Attempt',    color: 'bg-amber-100 text-amber-700' },
  prestige_completed: { label: 'Prestige Completed',  color: 'bg-emerald-100 text-emerald-700' },
  credits_adjusted:   { label: 'Credits Adjusted',    color: 'bg-blue-100 text-blue-700' },
}

function eventSummary(ev: UserEvent): string {
  const m = ev.metadata
  switch (ev.event_type) {
    case 'pack_opened': {
      const cards = m.cards as { name: string; tier: string }[] | undefined
      const cardList = cards?.map(c => `${c.name} (${c.tier})`).join(', ') ?? ''
      return `${m.pack_name} · −${m.cost} cr · balance: ${(m.new_balance as number).toLocaleString()}${cardList ? ` · ${cardList}` : ''}`
    }
    case 'prestige_attempt':
      return `Level ${m.from_level} → ${m.to_level} · ${m.cards_before} cards wiped · ${m.legend_name}`
    case 'prestige_completed':
      return `Level ${m.to_level} · ${m.legend_name}${m.inducted_to_hof ? ' · Inducted to HOF' : ''}`
    case 'credits_adjusted': {
      const delta = m.delta as number
      return `${delta > 0 ? '+' : ''}${delta} cr by admin · balance: ${(m.new_balance as number).toLocaleString()}`
    }
    default:
      return JSON.stringify(m)
  }
}

function fmtEventDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function UserDetailPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<UserEvent[]>([])
  const [creditDelta, setCreditDelta] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    setLoading(true)
    setDetail(null)
    setEvents([])
    fetch(`/api/admin/accounts/${userId}`)
      .then(r => r.json())
      .then(d => { setDetail(d); setLoading(false) })
      .catch(() => setLoading(false))
    fetch(`/api/admin/accounts/${userId}/events`)
      .then(r => r.json())
      .then(evs => setEvents(Array.isArray(evs) ? evs : []))
      .catch(() => {})
  }, [userId])

  async function adjustCredits(sign: 1 | -1) {
    const amount = parseInt(creditDelta)
    if (!amount || isNaN(amount) || amount <= 0) return
    setAdjusting(true)
    const res = await fetch(`/api/admin/accounts/${userId}/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: sign * amount }),
    })
    const data = await res.json()
    if (res.ok) {
      setDetail(prev => prev ? { ...prev, credits: data.credits } : prev)
      setFeedback(`${sign > 0 ? '+' : '−'}${fmt(amount)} → ${fmt(data.credits)} cr`)
      setCreditDelta('')
    } else {
      setFeedback('Error')
    }
    setAdjusting(false)
    setTimeout(() => setFeedback(''), 3000)
  }

  const winRate = detail && detail.picks.total > 0
    ? `${Math.round((detail.picks.correct / detail.picks.total) * 100)}%`
    : null

  return (
    <div className="border border-[#e2ddd6] rounded-2xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2ddd6]">
        <div className="min-w-0">
          {loading ? (
            <div className="h-4 w-40 bg-[#e2ddd6] rounded animate-pulse" />
          ) : (
            <>
              <p className="text-sm font-black text-[#1a1714] truncate">
                {detail?.username ? `${detail.username} · ` : ''}{detail?.email}
              </p>
              <p className="text-[10px] text-[#a39890] mt-0.5">
                Joined {detail ? fmtDate(detail.created_at) : '—'}
                {detail?.prestige_level ? ` · Prestige ${detail.prestige_level}` : ''}
              </p>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-4 w-7 h-7 flex items-center justify-center rounded-lg text-[#a39890] hover:text-[#1a1714] hover:bg-[#1a1714]/[0.06] transition-colors flex-shrink-0 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-3 bg-[#e2ddd6] rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />)}
        </div>
      ) : detail ? (
        <div className="p-5 space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Credits" value={fmt(detail.credits)} />
            <Stat label="Cards" value={fmt(detail.cards)} />
            <Stat label="Spent" value={fmtUSD(detail.total_spent_cents)} />
          </div>

          <div className="h-px bg-[#e2ddd6]" />

          <div className="grid grid-cols-3 gap-4">
            <Stat
              label="Pick-em"
              value={`${detail.picks.correct}/${detail.picks.total}`}
              sub={winRate ? `${winRate} win rate` : 'no settled picks'}
            />
            <Stat
              label="Trivia"
              value={`${detail.trivia.won}/${detail.trivia.total}`}
              sub="wins / sessions"
            />
            <Stat
              label="Credits Earned"
              value={fmt(detail.credits_earned.total)}
              sub={`${fmt(detail.credits_earned.picks)} picks · ${fmt(detail.credits_earned.trivia)} trivia · ${fmt(detail.credits_earned.draft)} draft`}
            />
          </div>

          <div className="h-px bg-[#e2ddd6]" />

          {/* Credit adjustment */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#a39890] mb-2">Adjust Credits</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                placeholder="Amount"
                value={creditDelta}
                onChange={e => setCreditDelta(e.target.value)}
                className="w-28 px-3 py-2 rounded-xl border border-[#e2ddd6] text-sm text-center focus:outline-none focus:border-[#1a1714]/30 tabular-nums"
              />
              <button
                onClick={() => adjustCredits(1)}
                disabled={adjusting || !creditDelta}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-colors disabled:opacity-40"
              >
                + Add
              </button>
              <button
                onClick={() => adjustCredits(-1)}
                disabled={adjusting || !creditDelta}
                className="px-4 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black transition-colors disabled:opacity-40"
              >
                − Remove
              </button>
              {feedback && (
                <span className="text-xs font-bold text-[#6b6259] ml-1">{feedback}</span>
              )}
            </div>
          </div>

          {/* Activity timeline */}
          <>
            <div className="h-px bg-[#e2ddd6]" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#a39890] mb-2">Activity</p>
              {events.length === 0 ? (
                <p className="text-xs text-[#c8c2b8]">No activity yet.</p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {events.map(ev => {
                    const style = EVENT_LABELS[ev.event_type] ?? { label: ev.event_type, color: 'bg-[#f0ede8] text-[#6b6259]' }
                    return (
                      <div key={ev.id} className="flex items-start gap-2.5">
                        <span className="text-[9px] text-[#c8c2b8] tabular-nums mt-0.5 w-20 flex-shrink-0">
                          {fmtEventDate(ev.created_at)}
                        </span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0 ${style.color}`}>
                          {style.label}
                        </span>
                        <span className="text-[10px] text-[#6b6259] leading-tight">
                          {eventSummary(ev)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        </div>
      ) : (
        <p className="p-5 text-sm text-[#a39890]">Failed to load user.</p>
      )}
    </div>
  )
}

export default function AccountsPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserRow[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/admin/accounts?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [query])

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <a href="/admin" className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-500/80 hover:text-amber-600 transition-colors">
          ← Admin
        </a>
        <h1 className="text-2xl font-black text-[#1a1714] mt-1">Account Lookup</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by email…"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedId(null) }}
          autoFocus
          className="w-full px-4 py-3 pr-10 rounded-2xl border border-[#e2ddd6] bg-white shadow-sm text-sm focus:outline-none focus:border-[#1a1714]/30 focus:shadow-md transition-all"
        />
        {searching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#c8c2b8] border-t-[#1a1714]/60 rounded-full animate-spin" />
        )}
      </div>

      {/* Selected user detail */}
      {selectedId && (
        <UserDetailPanel key={selectedId} userId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {/* Results list */}
      {results.length > 0 && (
        <div className="bg-white border border-[#e2ddd6] rounded-2xl shadow-sm overflow-hidden">
          {results.map((user, i) => (
            <button
              key={user.id}
              onClick={() => setSelectedId(prev => prev === user.id ? null : user.id)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-[#1a1714]/[0.03] ${
                i > 0 ? 'border-t border-[#e2ddd6]' : ''
              } ${selectedId === user.id ? 'bg-amber-50 hover:bg-amber-50' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1a1714] truncate">
                  {user.username ? <span className="text-amber-600">{user.username} · </span> : null}
                  {user.email}
                </p>
                <p className="text-[10px] text-[#a39890] mt-0.5">
                  Joined {fmtDate(user.created_at)}
                  {user.prestige_level > 0 ? ` · Prestige ${user.prestige_level}` : ''}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black text-[#1a1714] tabular-nums">
                  {user.credits !== null ? `${fmt(user.credits)} cr` : '—'}
                </p>
              </div>
              <svg
                width="14" height="14" viewBox="0 0 16 16" fill="none"
                className={`text-[#c8c2b8] flex-shrink-0 transition-transform ${selectedId === user.id ? 'rotate-90 text-amber-500' : ''}`}
              >
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>
      )}

      {!searching && results.length === 0 && query.length >= 2 && (
        <p className="text-sm text-[#a39890] text-center py-4">No users found.</p>
      )}

      {!searching && query.length < 2 && results.length === 0 && (
        <p className="text-sm text-[#a39890] text-center py-4">Type at least 2 characters to search.</p>
      )}
    </div>
  )
}
