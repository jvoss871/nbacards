'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useCredits } from '@/lib/credits-context'
import {
  DRAFT_YEAR, FIRST_ROUND_SLOTS, CREDIT_MULTIPLIER, calcDraftCredits,
  type DraftProspect, type DraftBoard, type DraftSettings, type DraftResult,
} from '@/lib/draft-logic'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useDraggable, useDroppable } from '@dnd-kit/core'

// ── Types ─────────────────────────────────────────────────────────────────────

type PicksMap = Record<number, DraftProspect>

interface LoadedPick {
  slot: number
  prospect_id: string
  prospect: DraftProspect
}

// ── Drag ID helpers ───────────────────────────────────────────────────────────

function bankId(prospectId: string) { return `bank:${prospectId}` }
function slotId(slot: number)       { return `slot:${slot}` }
function parseId(id: string): { type: 'bank' | 'slot'; prospectId?: string; slot?: number } {
  if (id.startsWith('slot:')) return { type: 'slot', slot: parseInt(id.slice(5)) }
  if (id.startsWith('bank:')) {
    const prospectId = id.slice(5)
    return { type: 'bank', prospectId: prospectId === '__zone__' ? undefined : prospectId }
  }
  return { type: 'bank' }
}

// ── Position colours ──────────────────────────────────────────────────────────

const POS_COLOR: Record<string, string> = {
  PG: 'bg-blue-100 text-blue-700',
  SG: 'bg-violet-100 text-violet-700',
  SF: 'bg-emerald-100 text-emerald-700',
  PF: 'bg-amber-100 text-amber-700',
  C:  'bg-red-100 text-red-700',
}

function PosBadge({ pos }: { pos: string | null }) {
  if (!pos) return null
  return (
    <span className={`text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded ${POS_COLOR[pos] ?? 'bg-[#1a1714]/10 text-[#1a1714]/40'}`}>
      {pos}
    </span>
  )
}

// ── Prospect chip in bank (draggable) ─────────────────────────────────────────

function ProspectChip({
  prospect, dragId, locked = false,
}: {
  prospect: DraftProspect
  dragId: string
  locked?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId, disabled: locked })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all select-none
        ${isDragging ? 'opacity-0' : locked ? 'cursor-default opacity-50' : 'hover:bg-[#1a1714]/[0.04] hover:border-[#1a1714]/20'}
        border-[#1a1714]/[0.10] bg-white/60
      `}
    >
      <PosBadge pos={prospect.position} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-[#1a1714]/80 leading-tight truncate">{prospect.name}</p>
        {prospect.school && (
          <p className="text-[9px] text-[#1a1714]/50 leading-tight truncate">{prospect.school}</p>
        )}
      </div>
    </div>
  )
}

// ── NBA team IDs (cdn.nba.com logos) ─────────────────────────────────────────

const NBA_TEAM_IDS: Record<string, number> = {
  ATL: 1610612737, BOS: 1610612738, BKN: 1610612751, CHA: 1610612766,
  CHI: 1610612741, CLE: 1610612739, DAL: 1610612742, DEN: 1610612743,
  DET: 1610612765, GSW: 1610612744, HOU: 1610612745, IND: 1610612754,
  LAC: 1610612746, LAL: 1610612747, MEM: 1610612763, MIA: 1610612748,
  MIL: 1610612749, MIN: 1610612750, NOP: 1610612740, NYK: 1610612752,
  OKC: 1610612760, ORL: 1610612753, PHI: 1610612755, PHX: 1610612756,
  POR: 1610612757, SAC: 1610612758, SAS: 1610612759, TOR: 1610612761,
  UTA: 1610612762, WAS: 1610612764,
}

function TeamBadge({ abbr }: { abbr: string | null }) {
  const teamId = abbr ? NBA_TEAM_IDS[abbr] : null
  if (!teamId) {
    return <div className="w-7 h-7 rounded-full bg-[#1a1714]/[0.06] border border-[#1a1714]/[0.08] shrink-0" />
  }
  return (
    <div className="w-7 h-7 shrink-0 flex items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg`}
        alt={abbr ?? ''}
        width={36}
        height={36}
        className="object-contain"
        onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0' }}
      />
    </div>
  )
}

// ── Row drop slot ─────────────────────────────────────────────────────────────

function DropSlot({
  slot, pick, result, boardStatus, correctOrdinal,
}: {
  slot: number
  pick: DraftProspect | undefined
  result?: DraftResult
  boardStatus: DraftBoard['status']
  correctOrdinal?: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId(slot) })
  const isLocked = boardStatus !== 'open'

  const isCorrect = correctOrdinal != null
  const isWrong = boardStatus === 'scored' && pick && !isCorrect

  let rowClass = pick
    ? 'border-[#1a1714]/[0.12] bg-white'
    : 'border-[#1a1714]/[0.08] bg-[#1a1714]/[0.03]'
  if (isOver && !isLocked)  rowClass = 'border-amber-400 bg-amber-50'
  else if (isCorrect)       rowClass = 'border-emerald-300 bg-emerald-50'
  else if (isWrong)         rowClass = 'border-red-200 bg-red-50'

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-1.5 px-2 py-2.5 rounded-lg border transition-all ${rowClass}`}
    >
      {/* Pick number */}
      <span className="text-[11px] font-black tabular-nums text-[#1a1714]/40 w-5 text-right shrink-0 leading-none">
        {slot}
      </span>

      {/* Team badge */}
      <TeamBadge abbr={result?.team_abbr ?? null} />

      {/* Player name / drop hint */}
      <div className="flex-1 min-w-0">
        {pick ? (
          isLocked ? (
            <div>
              <p className="text-[12px] font-black text-[#1a1714] uppercase tracking-wide leading-tight truncate">
                {pick.name}
              </p>
              {pick.school && (
                <p className="text-[9px] text-[#1a1714]/50 leading-tight truncate">{pick.school}</p>
              )}
            </div>
          ) : (
            <SlotChip prospect={pick} slot={slot} />
          )
        ) : (
          <p className={`text-[10px] uppercase tracking-widest leading-tight ${isOver ? 'text-amber-600 font-bold' : 'text-[#1a1714]/20'}`}>
            {isOver ? 'Drop here' : '— — — — —'}
          </p>
        )}
      </div>

      {/* Score indicator */}
      {isCorrect && correctOrdinal != null && (
        <span className="text-emerald-600 text-[10px] font-black shrink-0 whitespace-nowrap">+{correctOrdinal * CREDIT_MULTIPLIER}cr</span>
      )}
      {isWrong && result && (
        <p className="text-[8px] text-red-500/60 shrink-0 max-w-[72px] truncate text-right leading-tight">
          {result.prospect_name}
        </p>
      )}
    </div>
  )
}

// Draggable from an occupied slot
function SlotChip({ prospect, slot }: { prospect: DraftProspect; slot: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: slotId(slot) })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-1.5 cursor-grab active:cursor-grabbing select-none w-full ${isDragging ? 'opacity-0' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-black text-[#1a1714] uppercase tracking-wide leading-tight truncate">
          {prospect.name}
        </p>
        {prospect.school && (
          <p className="text-[9px] text-[#1a1714]/50 leading-tight truncate">{prospect.school}</p>
        )}
      </div>
      {prospect.position && <PosBadge pos={prospect.position} />}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DraftPage() {
  const { setCredits } = useCredits()

  const [settings, setSettings]   = useState<DraftSettings | null>(null)
  const [board, setBoard]         = useState<DraftBoard | null>(null)
  const [prospects, setProspects] = useState<DraftProspect[]>([])
  const [picks, setPicks]         = useState<PicksMap>({})
  const [results, setResults]     = useState<DraftResult[]>([])
  const [loading, setLoading]     = useState(true)
  const [posFilter, setPosFilter] = useState<string | null>(null)
  const [search, setSearch]       = useState('')

  // Active drag — tracks what's being dragged (prospect + source)
  const [activeDrag, setActiveDrag] = useState<{ prospect: DraftProspect; fromSlot?: number } | null>(null)

  const [countdown, setCountdown] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  // ── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    const settingsRes = await fetch('/api/draft/settings').catch(() => null)
    let year = DRAFT_YEAR
    if (settingsRes?.ok) {
      const s: DraftSettings = await settingsRes.json()
      setSettings(s)
      year = s.year ?? DRAFT_YEAR
    }

    const [boardRes, prospectsRes] = await Promise.all([
      fetch(`/api/draft/board?year=${year}`).catch(() => null),
      fetch(`/api/draft/prospects?year=${year}`).catch(() => null),
    ])

    if (boardRes?.ok) {
      const { board: b, picks: rawPicks, results: rawResults } = await boardRes.json()
      setBoard(b)
      setResults(rawResults ?? [])
      const map: PicksMap = {}
      for (const p of rawPicks as LoadedPick[]) {
        if (p.prospect) map[p.slot] = p.prospect
      }
      setPicks(map)
    }

    if (prospectsRes?.ok) {
      const { prospects: ps } = await prospectsRes.json()
      setProspects(ps ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-lock if global lock_time has passed
  useEffect(() => {
    if (!settings?.lock_time || !board || board.status !== 'open') return
    if (new Date() >= new Date(settings.lock_time)) {
      fetch('/api/draft/lock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        .then(() => setBoard(b => b ? { ...b, status: 'locked' } : b))
    }
  }, [settings, board])

  // Countdown to lock_time
  useEffect(() => {
    if (!settings?.lock_time || board?.status !== 'open') return
    function tick() {
      const diff = new Date(settings!.lock_time!).getTime() - Date.now()
      if (diff <= 0) { setCountdown('Locking…'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [settings?.lock_time, board?.status])

  // ── Derived state ──────────────────────────────────────────────────────────

  const placedIds = new Set(Object.values(picks).map(p => p.id))

  const filteredProspects = prospects.filter(p => {
    if (posFilter && p.position !== posFilter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const availableProspects = filteredProspects.filter(p => !placedIds.has(p.id))

  const resultMap = Object.fromEntries(results.map(r => [r.slot, r]))
  const positions = ['PG', 'SG', 'SF', 'PF', 'C']

  // ── Save helpers ───────────────────────────────────────────────────────────

  function syncPick(slot: number, prospectId: string | null) {
    if (prospectId) {
      fetch('/api/draft/pick', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, prospect_id: prospectId, year: settings?.year }),
      })
    } else {
      fetch('/api/draft/pick', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, year: settings?.year }),
      })
    }
  }

  // ── DnD handlers ──────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    document.body.style.overflow = 'hidden'
    const parsed = parseId(String(event.active.id))
    if (parsed.type === 'slot' && parsed.slot != null) {
      const p = picks[parsed.slot]
      if (p) setActiveDrag({ prospect: p, fromSlot: parsed.slot })
    } else if (parsed.type === 'bank' && parsed.prospectId) {
      const p = prospects.find(x => x.id === parsed.prospectId)
      if (p) setActiveDrag({ prospect: p })
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    document.body.style.overflow = ''
    setActiveDrag(null)
    if (board?.status !== 'open') return
    const { active, over } = event
    if (!over) return

    const src = parseId(String(active.id))
    const dst = parseId(String(over.id))

    // Dragging to bank zone — remove from slot
    if (dst.type === 'bank') {
      if (src.type === 'slot' && src.slot != null) {
        setPicks(prev => { const n = { ...prev }; delete n[src.slot!]; return n })
        syncPick(src.slot, null)
      }
      return
    }

    // Dragging to a slot
    if (dst.type === 'slot' && dst.slot != null) {
      const targetSlot = dst.slot
      let prospect: DraftProspect | undefined

      if (src.type === 'bank' && src.prospectId) {
        prospect = prospects.find(p => p.id === src.prospectId)
      } else if (src.type === 'slot' && src.slot != null) {
        prospect = picks[src.slot]
      }

      if (!prospect) return

      setPicks(prev => {
        const n = { ...prev }
        // If moving from a slot, clear the source
        if (src.type === 'slot' && src.slot != null) delete n[src.slot]
        // If target already had a prospect and we're coming from a slot, swap
        if (n[targetSlot] && src.type === 'slot' && src.slot != null) {
          n[src.slot] = n[targetSlot]
          syncPick(src.slot, n[src.slot].id)
        }
        n[targetSlot] = prospect!
        return n
      })
      syncPick(targetSlot, prospect.id)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-[#1a1714]/20 border-t-[#1a1714]/60 rounded-full animate-spin" />
      </div>
    )
  }

  const pickCount = Object.keys(picks).length
  const isLocked  = board?.status !== 'open'
  const isScored  = board?.status === 'scored'

  // For each correct slot, its ordinal (1st, 2nd, 3rd…) in slot order
  const correctSlotOrdinal: Record<number, number> = {}
  if (isScored) {
    let ord = 0
    for (let s = 1; s <= FIRST_ROUND_SLOTS; s++) {
      const p = picks[s]
      const r = resultMap[s]
      if (p && r && r.prospect_name?.trim().toLowerCase() === p.name.trim().toLowerCase()) {
        correctSlotOrdinal[s] = ++ord
      }
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => { document.body.style.overflow = '' }} autoScroll={false}>
      <div className="max-w-6xl mx-auto py-6">

          {/* Header */}
          <div className="flex flex-col items-center mb-6 gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://cdn.nba.com/logos/leagues/logo-nba.svg"
              alt="NBA"
              width={100}
              height={100}
              className="object-contain drop-shadow-md"
            />
            <p className="text-[10px] font-black uppercase tracking-[0.45em] text-amber-600/70">
              {settings?.year ?? DRAFT_YEAR} Draft · Round 1
            </p>
            {!isLocked && !isScored && countdown && (
              <div className="flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full bg-[#1a1714]/[0.06] border border-[#1a1714]/[0.08]">
                <span className="text-[9px] text-[#1a1714]/40 font-bold uppercase tracking-wider">Locks in</span>
                <span className="text-[11px] font-black text-[#1a1714] tabular-nums">{countdown}</span>
              </div>
            )}
          </div>

          {/* Scored summary box */}
          {isScored && board && (
            <div className="flex items-center justify-center gap-8 mb-5 px-6 py-4 bg-white border border-[#e2ddd6] rounded-2xl shadow-sm">
              <div className="text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#a39890] mb-0.5">Correct Picks</p>
                <p className="text-3xl font-black text-[#1a1714] tabular-nums">{board.correct_picks ?? 0}<span className="text-base text-[#1a1714]/30 font-bold"> / {FIRST_ROUND_SLOTS}</span></p>
              </div>
              <div className="w-px h-10 bg-[#e2ddd6]" />
              <div className="text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#a39890] mb-0.5">Credits Earned</p>
                {(board.credits_earned ?? 0) > 0
                  ? <p className="text-3xl font-black text-amber-600 tabular-nums">+{(board.credits_earned ?? 0).toLocaleString()}<span className="text-base font-bold">cr</span></p>
                  : <p className="text-3xl font-black text-[#1a1714]/30">—</p>
                }
              </div>
            </div>
          )}

          <div className="flex gap-4 items-start">

            {/* ── Board: two-column list ──────────────────────────────────── */}
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-3 gap-x-2">
                {/* Picks 1–10 */}
                <div className="flex flex-col gap-0.5">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(slot => (
                    <DropSlot
                      key={slot}
                      slot={slot}
                      pick={picks[slot]}
                      result={resultMap[slot]}
                      boardStatus={board?.status ?? 'open'}
                      correctOrdinal={correctSlotOrdinal[slot]}
                    />
                  ))}
                </div>
                {/* Picks 11–20 */}
                <div className="flex flex-col gap-0.5">
                  {Array.from({ length: 10 }, (_, i) => i + 11).map(slot => (
                    <DropSlot
                      key={slot}
                      slot={slot}
                      pick={picks[slot]}
                      result={resultMap[slot]}
                      boardStatus={board?.status ?? 'open'}
                      correctOrdinal={correctSlotOrdinal[slot]}
                    />
                  ))}
                </div>
                {/* Picks 21–30 */}
                <div className="flex flex-col gap-0.5">
                  {Array.from({ length: 10 }, (_, i) => i + 21).map(slot => (
                    <DropSlot
                      key={slot}
                      slot={slot}
                      pick={picks[slot]}
                      result={resultMap[slot]}
                      boardStatus={board?.status ?? 'open'}
                      correctOrdinal={correctSlotOrdinal[slot]}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* ── Prospect bank ────────────────────────────────────────────── */}
            <div className="w-48 flex-shrink-0 sticky top-16">
              <BankDropZone isOver={false}>
                <p className="text-[8px] font-black uppercase tracking-widest text-[#1a1714]/40 mb-2">
                  Prospects · {availableProspects.length} left
                </p>

                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#1a1714]/10 bg-white text-[#1a1714] text-xs placeholder-[#1a1714]/30 focus:outline-none focus:border-[#1a1714]/25 mb-2"
                />

                <div className="flex gap-1 mb-2">
                  {positions.map(p => (
                    <button
                      key={p}
                      onClick={() => setPosFilter(prev => prev === p ? null : p)}
                      className={`flex-1 py-0.5 rounded text-[9px] font-black border transition-colors ${
                        posFilter === p
                          ? 'bg-amber-500 border-amber-500 text-black'
                          : 'bg-white/60 border-[#1a1714]/10 text-[#1a1714]/40 hover:border-[#1a1714]/20'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="space-y-0.5 max-h-[65vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                  {availableProspects.length === 0 && (
                    <p className="text-[10px] text-[#1a1714]/30 text-center py-4">
                      {search || posFilter ? 'No matches' : 'All placed'}
                    </p>
                  )}
                  {availableProspects.map(p => (
                    <ProspectChip key={p.id} prospect={p} dragId={bankId(p.id)} locked={isLocked} />
                  ))}
                </div>
              </BankDropZone>
            </div>

          </div>


      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeDrag && (
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#1a1714]/15 rounded-xl shadow-xl cursor-grabbing select-none">
            <PosBadge pos={activeDrag.prospect.position} />
            <span className="text-[12px] font-black text-[#1a1714] uppercase tracking-wide">{activeDrag.prospect.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

// ── Bank drop zone ────────────────────────────────────────────────────────────

function BankDropZone({ children, isOver: _ }: { children: React.ReactNode; isOver: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'bank:__zone__' })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl p-3 border transition-colors ${isOver ? 'border-amber-400 bg-amber-50' : 'border-[#e2ddd6] bg-[#f5f3f0]'}`}
    >
      {children}
    </div>
  )
}
