'use client'

import { useEffect, useState, useCallback } from 'react'
import { CREDIT_MULTIPLIER, DRAFT_YEAR, type DraftProspect } from '@/lib/draft-logic'
import { supabase } from '@/lib/supabase'

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C']

interface Settings {
  draft_enabled: boolean
  draft_opens_at: string | null
  draft_year: number
  draft_lock_time: string | null
}

function toDatePart(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-CA') // YYYY-MM-DD in local time
}

function toTimePart(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function combineDateTime(date: string, time: string): string | null {
  if (!date) return null
  const [h, m] = time ? time.split(':') : ['00', '00']
  const d = new Date(`${date}T${h ?? '00'}:${m ?? '00'}:00`)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

const MINUTES = ['00', '15', '30', '45']

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hh, mm] = value ? value.split(':').map(Number) : [12, 0]
  const hour12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh
  const isPM   = hh >= 12

  function emit(newH: number, newM: number) {
    onChange(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`)
  }

  const sel = 'px-1.5 py-1.5 rounded-lg border border-[#e2ddd6] text-xs bg-white focus:outline-none focus:border-[#1a1714]/30'

  return (
    <div className="flex items-center gap-1">
      <select value={hour12} onChange={e => {
        const h12 = parseInt(e.target.value)
        const h24 = isPM ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12)
        emit(h24, mm)
      }} className={sel}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <select value={String(mm).padStart(2, '0')} onChange={e => emit(hh, parseInt(e.target.value))} className={sel}>
        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <select value={isPM ? 'pm' : 'am'} onChange={e => {
        const pm = e.target.value === 'pm'
        const h24 = hour12 === 12 ? (pm ? 12 : 0) : (pm ? hour12 + 12 : hour12)
        emit(h24, mm)
      }} className={sel}>
        <option value="am">AM</option>
        <option value="pm">PM</option>
      </select>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e2ddd6] rounded-xl p-4 shadow-sm">
      <h2 className="text-[9px] font-black uppercase tracking-widest text-[#a39890] mb-3">{title}</h2>
      {children}
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label, desc }: { value: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-bold text-[#1a1714]">{label}</p>
        {desc && <p className="text-[10px] text-[#a39890] mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-amber-500' : 'bg-[#e2ddd6]'}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

export default function AdminDraftPage() {
  const [settings, setSettings] = useState<Settings>({
    draft_enabled: false,
    draft_opens_at: null,
    draft_year: DRAFT_YEAR,
    draft_lock_time: null,
  })
  const [settingsSaved, setSettingsSaved] = useState(false)

  const [prospects, setProspects] = useState<DraftProspect[]>([])

  // Add prospect form
  const [newName, setNewName] = useState('')
  const [newPos, setNewPos] = useState('')
  const [newSchool, setNewSchool] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Bulk import
  const [bulkText, setBulkText] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<string | null>(null)

  // Scoring
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreResult, setScoreResult] = useState<{ scored: number; year: number } | null>(null)

  // ── Load settings + prospects ──────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    const [sRes, pRes] = await Promise.all([
      fetch('/api/admin/draft/settings'),
      fetch(`/api/admin/draft/prospects?year=${settings.draft_year}`),
    ])
    const s = await sRes.json()
    setSettings({
      draft_enabled:  s.draft_enabled  ?? false,
      draft_opens_at: s.draft_opens_at ?? null,
      draft_year:     s.draft_year     ?? DRAFT_YEAR,
      draft_lock_time: s.draft_lock_time ?? null,
    })
    const p = await pRes.json()
    setProspects(p.prospects ?? [])
  }, [settings.draft_year])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Save settings ──────────────────────────────────────────────────────────
  async function saveSettings() {
    await fetch('/api/admin/draft/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { key: 'draft_enabled',   value: settings.draft_enabled },
        { key: 'draft_opens_at',  value: settings.draft_opens_at },
        { key: 'draft_year',      value: settings.draft_year },
        { key: 'draft_lock_time', value: settings.draft_lock_time },
      ]),
    })
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  // ── Add prospect ───────────────────────────────────────────────────────────
  async function addProspect() {
    if (!newName.trim()) return
    setAddLoading(true)
    const res = await fetch('/api/admin/draft/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: settings.draft_year,
        prospects: [{
          name: newName.trim(),
          position: newPos || null,
          school: newSchool || null,
        }],
      }),
    })
    const data = await res.json()
    if (data.prospects) setProspects(prev => [...prev, ...data.prospects])
    setNewName(''); setNewPos(''); setNewSchool('')
    setAddLoading(false)
  }

  // ── Bulk import ─────────────────────────────────────────────────────────────
  // Format: one prospect per line
  // "Name | POS | School | min | max"  or just "Name"
  async function bulkImport() {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) return
    setBulkLoading(true)
    setBulkResult(null)
    const parsed = lines.map(line => {
      const parts = line.split('|').map(p => p.trim())
      return {
        name: parts[0],
        position: parts[1] || null,
        school: parts[2] || null,
        projected_min: parts[3] ? parseInt(parts[3]) : null,
        projected_max: parts[4] ? parseInt(parts[4]) : null,
      }
    }).filter(p => p.name)

    const res = await fetch('/api/admin/draft/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: settings.draft_year, prospects: parsed }),
    })
    const data = await res.json()
    if (data.error) {
      setBulkResult(`Error: ${data.error}`)
    } else {
      setBulkResult(`Added ${data.inserted} prospects`)
      setBulkText('')
      await loadAll()
    }
    setBulkLoading(false)
  }

  // ── Delete prospect ────────────────────────────────────────────────────────
  async function deleteProspect(id: string) {
    await fetch('/api/admin/draft/prospects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setProspects(prev => prev.filter(p => p.id !== id))
  }

  // ── Score boards ───────────────────────────────────────────────────────────
  async function scoreBoards() {
    setScoreLoading(true)
    setScoreResult(null)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/draft/score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ year: settings.draft_year }),
    })
    const data = await res.json()
    setScoreResult(data)
    setScoreLoading(false)
  }

  // ── Reset board + results ─────────────────────────────────────────────────
  const [resetBoardLoading, setResetBoardLoading] = useState(false)
  const [resetBoardDone, setResetBoardDone]       = useState(false)

  async function resetBoard() {
    if (!confirm(`Reset ALL draft boards, picks, and results for ${settings.draft_year}? This cannot be undone.`)) return
    setResetBoardLoading(true)
    await fetch('/api/admin/draft/reset-board', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: settings.draft_year }),
    })
    setResetBoardLoading(false)
    setResetBoardDone(true)
    setTimeout(() => setResetBoardDone(false), 3000)
  }

  // ── Reset prospect pool ───────────────────────────────────────────────────
  const [resetProspectsLoading, setResetProspectsLoading] = useState(false)
  const [resetProspectsDone, setResetProspectsDone]       = useState(false)

  async function resetProspects() {
    if (!confirm(`Delete ALL ${settings.draft_year} prospects? This also clears any picks referencing them.`)) return
    setResetProspectsLoading(true)
    await fetch('/api/admin/draft/reset-prospects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: settings.draft_year }),
    })
    setProspects([])
    setResetProspectsLoading(false)
    setResetProspectsDone(true)
    setTimeout(() => setResetProspectsDone(false), 3000)
  }

  // ── Reload prospects when year changes ─────────────────────────────────────
  async function reloadProspects(year: number) {
    const res = await fetch(`/api/admin/draft/prospects?year=${year}`)
    const data = await res.json()
    setProspects(data.prospects ?? [])
  }

  return (
    <div className="max-w-3xl mx-auto space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <a href="/admin" className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-500/80 hover:text-amber-600 transition-colors">
            ← Admin
          </a>
          <h1 className="text-2xl font-black text-[#1a1714] mt-1">Draft Controls</h1>
        </div>
        <a href="/draft" className="text-xs font-bold text-[#a39890] hover:text-[#1a1714] transition-colors">
          View Draft Board →
        </a>
      </div>

      {/* ── Settings ─────────────────────────────────────────────────────── */}
      <Section title="Settings">
        <div className="space-y-3">
          <Toggle
            value={settings.draft_enabled}
            onChange={v => setSettings(s => ({ ...s, draft_enabled: v }))}
            label="Draft Enabled"
            desc="Controls Nav link visibility and page access."
          />

          <div className="h-px bg-[#f0ede8]" />

          <div className="flex gap-3 items-end">
            <div className="w-24 flex-shrink-0">
              <label className="text-[9px] font-black text-[#6b6259] uppercase tracking-wide block mb-1">Year</label>
              <input
                type="number"
                value={settings.draft_year}
                onChange={e => {
                  const year = parseInt(e.target.value)
                  setSettings(s => ({ ...s, draft_year: year }))
                  reloadProspects(year)
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#e2ddd6] text-xs focus:outline-none focus:border-[#1a1714]/30"
              />
            </div>

            <div className="flex-1">
              <label className="text-[9px] font-black text-[#6b6259] uppercase tracking-wide block mb-1">Opens At</label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="date"
                  value={toDatePart(settings.draft_opens_at)}
                  onChange={e => setSettings(s => ({ ...s, draft_opens_at: combineDateTime(e.target.value, toTimePart(s.draft_opens_at)) }))}
                  className="w-28 px-2 py-1.5 rounded-lg border border-[#e2ddd6] text-xs focus:outline-none focus:border-[#1a1714]/30"
                />
                <TimePicker
                  value={toTimePart(settings.draft_opens_at)}
                  onChange={t => setSettings(s => ({ ...s, draft_opens_at: combineDateTime(toDatePart(s.draft_opens_at), t) }))}
                />
              </div>
            </div>

            <div className="flex-1">
              <label className="text-[9px] font-black text-[#6b6259] uppercase tracking-wide block mb-1">Locks At</label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="date"
                  value={toDatePart(settings.draft_lock_time)}
                  onChange={e => setSettings(s => ({ ...s, draft_lock_time: combineDateTime(e.target.value, toTimePart(s.draft_lock_time)) }))}
                  className="w-28 px-2 py-1.5 rounded-lg border border-[#e2ddd6] text-xs focus:outline-none focus:border-[#1a1714]/30"
                />
                <TimePicker
                  value={toTimePart(settings.draft_lock_time)}
                  onChange={t => setSettings(s => ({ ...s, draft_lock_time: combineDateTime(toDatePart(s.draft_lock_time), t) }))}
                />
              </div>
            </div>
          </div>

          <button
            onClick={saveSettings}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-colors ${settingsSaved ? 'bg-emerald-500 text-white' : 'bg-[#1a1714] hover:bg-[#2c2825] text-white'}`}
          >
            {settingsSaved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </Section>

      {/* ── Prospect manager ─────────────────────────────────────────────── */}
      <Section title={`Prospect Bank — ${settings.draft_year} (${prospects.length})`}>
        <div className="space-y-3">

          {/* Add one */}
          <div className="flex gap-2 items-end">
            <input
              placeholder="Name *"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addProspect()}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#e2ddd6] text-xs focus:outline-none focus:border-[#1a1714]/30"
            />
            <select
              value={newPos}
              onChange={e => setNewPos(e.target.value)}
              className="w-20 px-2.5 py-1.5 rounded-lg border border-[#e2ddd6] text-xs focus:outline-none focus:border-[#1a1714]/30 bg-white"
            >
              <option value="">Pos</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              placeholder="School"
              value={newSchool}
              onChange={e => setNewSchool(e.target.value)}
              className="w-28 px-2.5 py-1.5 rounded-lg border border-[#e2ddd6] text-xs focus:outline-none focus:border-[#1a1714]/30"
            />
            <button
              onClick={addProspect}
              disabled={!newName.trim() || addLoading}
              className="px-3 py-1.5 bg-[#1a1714] hover:bg-[#2c2825] text-white text-xs font-black rounded-lg transition-colors disabled:opacity-40 flex-shrink-0"
            >
              {addLoading ? '…' : 'Add'}
            </button>
          </div>

          <div className="h-px bg-[#f0ede8]" />

          {/* Bulk import */}
          <div>
            <p className="text-[9px] font-black text-[#6b6259] uppercase tracking-wide mb-1">
              Bulk Import <span className="font-normal normal-case text-[#c8c2b8]">— Name | POS | School per line</span>
            </p>
            <textarea
              rows={4}
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={"Ace Bailey | SF | Rutgers\nDylan Harper | PG | Rutgers"}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#e2ddd6] text-xs font-mono focus:outline-none focus:border-[#1a1714]/30 resize-none"
            />
            <div className="flex items-center gap-3 mt-1.5">
              <button
                onClick={bulkImport}
                disabled={!bulkText.trim() || bulkLoading}
                className="px-3 py-1.5 bg-[#1a1714] hover:bg-[#2c2825] text-white text-xs font-black rounded-lg transition-colors disabled:opacity-40"
              >
                {bulkLoading ? 'Importing…' : 'Import'}
              </button>
              {bulkResult && <p className="text-xs text-[#6b6259]">{bulkResult}</p>}
            </div>
          </div>

        </div>
      </Section>

      {/* ── Scoring ──────────────────────────────────────────────────────── */}
      <Section title="Score Boards">
        <div className="space-y-2.5">
          <p className="text-[10px] text-[#6b6259] leading-relaxed">
            Insert results into <code className="bg-[#f0ede8] px-1 rounded text-[10px]">draft_results</code> (year, slot 1–30, prospect_id), then score.
            Payout: 1st correct = {CREDIT_MULTIPLIER} cr · 2nd = {CREDIT_MULTIPLIER * 2} cr · 3rd = {CREDIT_MULTIPLIER * 3} cr… ({CREDIT_MULTIPLIER} × n(n+1)/2)
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={scoreBoards}
              disabled={scoreLoading}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg transition-colors disabled:opacity-50"
            >
              {scoreLoading ? 'Scoring…' : `Score ${settings.draft_year} Boards`}
            </button>
            {scoreResult && (
              <p className="text-xs text-[#6b6259]">
                {scoreResult.scored > 0
                  ? `Scored ${scoreResult.scored} board${scoreResult.scored !== 1 ? 's' : ''}`
                  : 'No locked boards to score'}
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* ── Danger Zone ──────────────────────────────────────────────────── */}
      <div className="border border-red-200 rounded-xl p-4">
        <h2 className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-3">Danger Zone</h2>
        <div className="space-y-2.5">

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#1a1714]">Reset Board &amp; Results</p>
              <p className="text-[10px] text-[#a39890] mt-0.5">Wipes all boards, picks, and results for {settings.draft_year}.</p>
            </div>
            <button
              onClick={resetBoard}
              disabled={resetBoardLoading}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-black transition-colors disabled:opacity-50 ${
                resetBoardDone
                  ? 'bg-emerald-500 text-white'
                  : 'bg-red-50 hover:bg-red-100 border border-red-200 text-red-600'
              }`}
            >
              {resetBoardDone ? 'Done' : resetBoardLoading ? 'Resetting…' : 'Reset Board'}
            </button>
          </div>

          <div className="h-px bg-red-100" />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#1a1714]">Reset Player Pool</p>
              <p className="text-[10px] text-[#a39890] mt-0.5">Deletes all {settings.draft_year} prospects and clears picks referencing them.</p>
            </div>
            <button
              onClick={resetProspects}
              disabled={resetProspectsLoading}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-black transition-colors disabled:opacity-50 ${
                resetProspectsDone
                  ? 'bg-emerald-500 text-white'
                  : 'bg-red-50 hover:bg-red-100 border border-red-200 text-red-600'
              }`}
            >
              {resetProspectsDone ? 'Done' : resetProspectsLoading ? 'Resetting…' : 'Reset Prospects'}
            </button>
          </div>

        </div>
      </div>

    </div>
  )
}
