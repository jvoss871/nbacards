'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CREDIT_MULTIPLIER, DRAFT_YEAR, FIRST_ROUND_SLOTS, PROJECTED_DRAFT_ORDER_2026, type DraftProspect } from '@/lib/draft-logic'
import { teamLogoUrl } from '@/lib/team-logo'
import { supabase } from '@/lib/supabase'

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C']

const NBA_TEAMS = [
  'ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW',
  'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK',
  'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS',
]

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

// ── Section wrapper (collapsible) ───────────────────────────────────────────
function Section({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm ${danger ? 'border-red-200' : 'border-[#e2ddd6]'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between group ${open ? 'mb-3' : ''}`}
      >
        <h2 className={`text-[9px] font-black uppercase tracking-widest transition-colors ${
          danger ? 'text-red-400 group-hover:text-red-500' : 'text-[#a39890] group-hover:text-[#6b6259]'
        }`}>
          {title}
        </h2>
        <span className={`text-[10px] transition-colors ${danger ? 'text-red-300 group-hover:text-red-500' : 'text-[#c8c2b8] group-hover:text-[#6b6259]'}`}>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && children}
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

// ── Mini draft board — drag a team logo onto a pick slot ──────────────────────
function TeamChip({ abbr, ghost = false }: { abbr: string; ghost?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg border bg-white select-none ${
      ghost ? 'shadow-lg ring-2 ring-amber-400/40 cursor-grabbing' : 'border-[#e2ddd6] cursor-grab hover:border-amber-300'
    }`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={teamLogoUrl(abbr)} alt={abbr} className="w-7 h-7 object-contain" />
      <span className="text-[8px] font-black text-[#6b6259]">{abbr}</span>
    </div>
  )
}

function DraggableTeamChip({ abbr }: { abbr: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette:${abbr}` })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={{ opacity: isDragging ? 0.25 : 1 }}>
      <TeamChip abbr={abbr} />
    </div>
  )
}

function DraftSlot({ index, abbr, onClear }: { index: number; abbr: string | null; onClear: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${index}` })
  return (
    <div
      ref={setNodeRef}
      className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 p-1.5 aspect-square transition-colors ${
        isOver
          ? 'border-amber-400 bg-amber-50'
          : abbr ? 'border-[#e2ddd6] bg-white' : 'border-dashed border-[#d4cfc9] bg-[#faf9f6]'
      }`}
    >
      <span className="absolute top-1 left-1.5 text-[8px] font-black text-[#c8c2b8] tabular-nums leading-none">{index + 1}</span>
      {abbr ? (
        <>
          <button
            onClick={onClear}
            title="Clear slot"
            className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/5 hover:bg-red-100 text-[9px] text-[#a39890] hover:text-red-500 flex items-center justify-center leading-none"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={teamLogoUrl(abbr)} alt={abbr} className="w-6 h-6 object-contain mt-1.5" />
          <span className="text-[7px] font-black text-[#6b6259]">{abbr}</span>
        </>
      ) : (
        <span className="text-[8px] text-[#d4cfc9] mt-1.5">—</span>
      )}
    </div>
  )
}

function DraftOrderBoard({ order, onChange }: { order: (string | null)[]; onChange: (next: (string | null)[]) => void }) {
  const [activeTeam, setActiveTeam] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function onDragStart({ active }: DragStartEvent) {
    const id = active.id as string
    setActiveTeam(id.startsWith('palette:') ? id.slice('palette:'.length) : null)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveTeam(null)
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (!activeId.startsWith('palette:') || !overId.startsWith('slot:')) return
    const abbr = activeId.slice('palette:'.length)
    const slotIdx = parseInt(overId.slice('slot:'.length), 10)
    const next = [...order]
    next[slotIdx] = abbr
    onChange(next)
  }

  function clearSlot(i: number) {
    const next = [...order]
    next[i] = null
    onChange(next)
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 mb-4">
        {order.map((abbr, i) => (
          <DraftSlot key={i} index={i} abbr={abbr} onClear={() => clearSlot(i)} />
        ))}
      </div>

      <p className="text-[9px] font-black text-[#6b6259] uppercase tracking-wide mb-1.5">Drag a team onto a pick slot</p>
      <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-[#faf9f6] border border-[#f0ede8]">
        {NBA_TEAMS.map(abbr => <DraggableTeamChip key={abbr} abbr={abbr} />)}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTeam ? <TeamChip abbr={activeTeam} ghost /> : null}
      </DragOverlay>
    </DndContext>
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

  // Draft order — 2026 default (NBA lottery results + remainder by standing)
  const [order, setOrder] = useState<(string | null)[]>(
    Array.from({ length: FIRST_ROUND_SLOTS }, (_, i) => PROJECTED_DRAFT_ORDER_2026[i] ?? null)
  )
  const [showOrderText, setShowOrderText] = useState(false)
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderFetching, setOrderFetching] = useState(false)
  const [orderResult, setOrderResult] = useState<string | null>(null)
  const orderFilled = order.filter(Boolean).length

  // Draft results — which prospect each team actually picked, entered live
  const [results, setResults] = useState<(string | null)[]>(
    Array.from({ length: FIRST_ROUND_SLOTS }, () => null)
  )
  const [resultSaving, setResultSaving] = useState<number | null>(null)
  const resultsFilled = results.filter(Boolean).length

  // Scoring
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreResult, setScoreResult] = useState<{ scored: number; year: number } | null>(null)

  // ── Load settings + prospects (mount only — self-contained so it never races
  // or clobbers an in-progress year change the user hasn't saved yet) ─────────
  const loadAll = useCallback(async () => {
    const sRes = await fetch('/api/admin/draft/settings')
    const s = await sRes.json()
    const year = s.draft_year ?? DRAFT_YEAR
    setSettings({
      draft_enabled:  s.draft_enabled  ?? false,
      draft_opens_at: s.draft_opens_at ?? null,
      draft_year:     year,
      draft_lock_time: s.draft_lock_time ?? null,
    })

    const [pRes, oRes] = await Promise.all([
      fetch(`/api/admin/draft/prospects?year=${year}`),
      fetch(`/api/admin/draft/order?year=${year}`),
    ])
    const p = await pRes.json()
    setProspects(p.prospects ?? [])

    const o = await oRes.json()
    const savedTeams: (string | null)[] = o.teams ?? []
    setOrder(savedTeams.length > 0
      ? Array.from({ length: FIRST_ROUND_SLOTS }, (_, i) => savedTeams[i] ?? null)
      : Array.from({ length: FIRST_ROUND_SLOTS }, (_, i) => PROJECTED_DRAFT_ORDER_2026[i] ?? null))

    const savedResults: { prospectId: string | null }[] = o.results ?? []
    setResults(Array.from({ length: FIRST_ROUND_SLOTS }, (_, i) => savedResults[i]?.prospectId ?? null))
  }, [])

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

  // ── Draft order ────────────────────────────────────────────────────────────
  async function fetchDraftOrder() {
    setOrderFetching(true)
    setOrderResult(null)
    const res = await fetch(`/api/admin/draft/fetch-order?year=${settings.draft_year}`)
    const data = await res.json()
    if (data.error) {
      setOrderResult(`Error: ${data.error}`)
    } else {
      setOrder(Array.from({ length: FIRST_ROUND_SLOTS }, (_, i) => data.teams[i] ?? null))
      setOrderResult(`Fetched ${data.teams.length} picks from NBA API (${data.season}) — review and save`)
    }
    setOrderFetching(false)
  }

  async function saveDraftOrder() {
    if (order.some(t => !t)) return
    setOrderLoading(true)
    setOrderResult(null)
    const res = await fetch('/api/admin/draft/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: settings.draft_year, teams: order }),
    })
    const data = await res.json()
    setOrderResult(data.error ? `Error: ${data.error}` : `Saved ${data.saved} slots`)
    setOrderLoading(false)
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

  // ── Reload prospects + order when year changes ──────────────────────────────
  async function reloadProspects(year: number) {
    const [pRes, oRes] = await Promise.all([
      fetch(`/api/admin/draft/prospects?year=${year}`),
      fetch(`/api/admin/draft/order?year=${year}`),
    ])
    const data = await pRes.json()
    setProspects(data.prospects ?? [])

    const o = await oRes.json()
    const savedTeams: (string | null)[] = o.teams ?? []
    setOrder(savedTeams.length > 0
      ? Array.from({ length: FIRST_ROUND_SLOTS }, (_, i) => savedTeams[i] ?? null)
      : Array.from({ length: FIRST_ROUND_SLOTS }, (_, i) => PROJECTED_DRAFT_ORDER_2026[i] ?? null))

    const savedResults: { prospectId: string | null }[] = o.results ?? []
    setResults(Array.from({ length: FIRST_ROUND_SLOTS }, (_, i) => savedResults[i]?.prospectId ?? null))
  }

  // ── Save a single slot's actual pick, as the live draft happens ────────────
  async function saveResult(slotIdx: number, prospectId: string | null) {
    setResultSaving(slotIdx)
    const prospect = prospects.find(p => p.id === prospectId)
    setResults(prev => {
      const next = [...prev]
      next[slotIdx] = prospectId
      return next
    })
    await fetch('/api/admin/draft/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: settings.draft_year,
        slot: slotIdx + 1,
        prospectId,
        prospectName: prospect?.name ?? null,
      }),
    })
    setResultSaving(null)
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

      {/* ── Draft Order ──────────────────────────────────────────────────── */}
      <Section title={`Draft Order — Team Logos (${orderFilled}/${FIRST_ROUND_SLOTS} filled)`}>
        <div className="space-y-2">
          <p className="text-[10px] text-[#6b6259] leading-relaxed">
            Drag a team onto a pick slot, or click a filled slot&apos;s × to clear it. This just loads team logos on the public draft board — real results are entered separately once the draft happens.
          </p>

          <DraftOrderBoard order={order} onChange={setOrder} />

          <div className="flex items-center gap-3 flex-wrap pt-1">
            <button
              onClick={fetchDraftOrder}
              disabled={orderFetching}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg transition-colors disabled:opacity-40"
            >
              {orderFetching ? 'Fetching…' : `Fetch Order (${settings.draft_year})`}
            </button>
            <button
              onClick={saveDraftOrder}
              disabled={orderFilled < FIRST_ROUND_SLOTS || orderLoading}
              title={orderFilled < FIRST_ROUND_SLOTS ? 'Fill every slot before saving' : undefined}
              className="px-3 py-1.5 bg-[#1a1714] hover:bg-[#2c2825] text-white text-xs font-black rounded-lg transition-colors disabled:opacity-40"
            >
              {orderLoading ? 'Saving…' : 'Save & Lock Order'}
            </button>
            <button
              onClick={() => setOrder(Array.from({ length: FIRST_ROUND_SLOTS }, () => null))}
              className="px-3 py-1.5 border border-[#e2ddd6] hover:border-red-300 hover:text-red-500 text-[#a39890] text-xs font-black rounded-lg transition-colors"
            >
              Clear All
            </button>
            {orderResult && <p className="text-xs text-[#6b6259]">{orderResult}</p>}
          </div>

          <button
            onClick={() => setShowOrderText(v => !v)}
            className="text-[10px] font-bold text-[#a39890] hover:text-[#1a1714] transition-colors"
          >
            {showOrderText ? '▾ Hide' : '▸ Edit'} as text
          </button>
          {showOrderText && (
            <textarea
              rows={6}
              value={order.map(t => t ?? '').join('\n')}
              onChange={e => {
                const lines = e.target.value.split('\n')
                setOrder(Array.from({ length: FIRST_ROUND_SLOTS }, (_, i) => {
                  const v = lines[i]?.trim().toUpperCase()
                  return v ? v : null
                }))
              }}
              placeholder={"DAL\nSAS\nPHI\nMIA\n..."}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#e2ddd6] text-xs font-mono focus:outline-none focus:border-[#1a1714]/30 resize-none"
            />
          )}
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

      {/* ── Draft Results ────────────────────────────────────────────────── */}
      <Section title={`Draft Results — Who Got Picked (${resultsFilled}/${FIRST_ROUND_SLOTS} entered)`}>
        <div className="space-y-2">
          <p className="text-[10px] text-[#6b6259] leading-relaxed">
            Enter these live as the real draft happens — each pick saves the moment you select it. Then score whenever you&apos;re ready; you can re-run it as more results come in.
            Payout: 1st correct = {CREDIT_MULTIPLIER} cr · 2nd = {CREDIT_MULTIPLIER * 2} cr · 3rd = {CREDIT_MULTIPLIER * 3} cr… ({CREDIT_MULTIPLIER} × n(n+1)/2)
          </p>
          <div className="max-h-[420px] overflow-y-auto space-y-1 pr-1">
            {order.map((abbr, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-[#e2ddd6] bg-white">
                <span className="text-[9px] font-black text-[#c8c2b8] tabular-nums w-5 text-right shrink-0">{i + 1}</span>
                {abbr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={teamLogoUrl(abbr)} alt={abbr} className="w-5 h-5 object-contain shrink-0" />
                ) : (
                  <span className="w-5 h-5 shrink-0" />
                )}
                <select
                  value={results[i] ?? ''}
                  onChange={e => saveResult(i, e.target.value || null)}
                  className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-[#e2ddd6] text-xs bg-white focus:outline-none focus:border-[#1a1714]/30"
                >
                  <option value="">— pick not in yet —</option>
                  {[...prospects].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                    <option key={p.id} value={p.id}>{p.name}{p.position ? ` (${p.position})` : ''}</option>
                  ))}
                </select>
                {resultSaving === i && <span className="text-[9px] text-[#a39890] shrink-0">Saving…</span>}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={scoreBoards}
              disabled={scoreLoading}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg transition-colors disabled:opacity-50"
            >
              {scoreLoading ? 'Scoring…' : 'Score Draft'}
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
      <Section title="Danger Zone" danger>
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
      </Section>

    </div>
  )
}
