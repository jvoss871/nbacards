'use client'

import { useState, useEffect } from 'react'
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

type TierKey = 'platinum' | 'gold' | 'silver' | 'bronze' | 'bench'

interface Player {
  id: string
  name: string
  rating_2k: number | null
  tier: string
  in_pool: boolean
  position?: string | null
}

const TIER_META: Record<TierKey, { label: string; cap: number | null; pill: string; header: string; ring: string }> = {
  platinum: {
    label: 'Platinum', cap: 15,
    pill:   'bg-[#e8f4fd] text-[#1565c0] border border-[#bbdefb]',
    header: 'bg-[#e8f4fd] border-[#90caf9] text-[#1565c0]',
    ring:   'border-[#90caf9]',
  },
  gold: {
    label: 'Gold', cap: 35,
    pill:   'bg-amber-50 text-amber-700 border border-amber-200',
    header: 'bg-amber-50 border-amber-200 text-amber-700',
    ring:   'border-amber-200',
  },
  silver: {
    label: 'Silver', cap: 65,
    pill:   'bg-slate-50 text-slate-600 border border-slate-200',
    header: 'bg-slate-50 border-slate-200 text-slate-600',
    ring:   'border-slate-200',
  },
  bronze: {
    label: 'Bronze', cap: 90,
    pill:   'bg-orange-50 text-orange-700 border border-orange-200',
    header: 'bg-orange-50 border-orange-200 text-orange-700',
    ring:   'border-orange-200',
  },
  bench: {
    label: 'Out of Pool', cap: null,
    pill:   'bg-[#f5f3f0] text-[#a39890] border border-[#e2ddd6]',
    header: 'bg-[#faf9f6] border-[#e2ddd6] text-[#a39890]',
    ring:   'border-[#e2ddd6]',
  },
}

function PlayerPill({ player, ghost = false }: { player: Player; ghost?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-[#e2ddd6] text-xs select-none ${ghost ? 'shadow-lg ring-2 ring-[#1a1714]/10 cursor-grabbing' : 'cursor-grab'}`}>
      <span className="font-medium text-[#1a1714] truncate leading-none">{player.name}</span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {player.position && (
          <span className="text-[9px] text-[#c8c2b8] font-bold uppercase">{player.position}</span>
        )}
        {player.rating_2k !== null && (
          <span className="px-1.5 py-0.5 rounded bg-[#1a1714] text-white text-[9px] font-black tabular-nums">
            {player.rating_2k}
          </span>
        )}
      </div>
    </div>
  )
}

function DraggablePlayer({ player, search }: { player: Player; search: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: player.id })
  if (search && !player.name.toLowerCase().includes(search.toLowerCase())) return null
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={{ opacity: isDragging ? 0.25 : 1 }}>
      <PlayerPill player={player} />
    </div>
  )
}

function TierColumn({ tierKey, players, search }: { tierKey: TierKey; players: Player[]; search: string }) {
  const meta = TIER_META[tierKey]
  const { setNodeRef, isOver } = useDroppable({ id: tierKey })

  return (
    <div className="flex flex-col min-w-0">
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl border-x border-t ${meta.header}`}>
        <span className="text-[10px] font-black uppercase tracking-widest">{meta.label}</span>
        <span className="text-[10px] font-bold opacity-70 tabular-nums">
          {players.length}{meta.cap ? `/${meta.cap}` : ''}
          {meta.cap && players.length > meta.cap && (
            <span className="ml-1 text-red-500 font-black">!</span>
          )}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 space-y-1.5 border-x border-b rounded-b-xl overflow-y-auto transition-colors ${meta.ring} ${
          isOver ? 'bg-blue-50/60' : 'bg-white'
        }`}
        style={{ minHeight: 120, maxHeight: 'calc(100vh - 240px)' }}
      >
        {players.map(p => (
          <DraggablePlayer key={p.id} player={p} search={search} />
        ))}
        {players.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase())).length === 0 && (
          <p className="text-[10px] text-[#d4cfc9] text-center py-6">
            {search ? 'no match' : 'drop here'}
          </p>
        )}
      </div>
    </div>
  )
}

const POOL_ORDER: TierKey[] = ['platinum', 'gold', 'silver', 'bronze']
const POOL_CAPS: Record<string, number> = { platinum: 15, gold: 35, silver: 65, bronze: 90 }

export default function PlayerPoolPage() {
  const [tiers, setTiers] = useState<Record<TierKey, Player[]>>({
    platinum: [], gold: [], silver: [], bronze: [], bench: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [savedMsg, setSavedMsg] = useState('Saved ✓')
  const [search, setSearch] = useState('')
  const [activePlayer, setActivePlayer] = useState<Player | null>(null)
  const [showBench, setShowBench] = useState(false)
  const [initialInPool, setInitialInPool] = useState<Record<string, boolean>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  useEffect(() => {
    fetch('/api/admin/players')
      .then(r => r.json())
      .then((players: Player[]) => {
        const groups: Record<TierKey, Player[]> = { platinum: [], gold: [], silver: [], bronze: [], bench: [] }
        for (const p of players) {
          const key: TierKey = p.in_pool ? (p.tier as TierKey) : 'bench'
          if (groups[key]) groups[key].push(p)
          else groups.bench.push(p)
        }
        setTiers(groups)
        setInitialInPool(Object.fromEntries(players.map(p => [p.id, p.in_pool])))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function autoAssign() {
    const all = [
      ...tiers.platinum,
      ...tiers.gold,
      ...tiers.silver,
      ...tiers.bronze,
      ...tiers.bench,
    ].sort((a, b) => (b.rating_2k ?? 0) - (a.rating_2k ?? 0))

    const next: Record<TierKey, Player[]> = { platinum: [], gold: [], silver: [], bronze: [], bench: [] }
    let idx = 0
    for (const tier of POOL_ORDER) {
      const cap = POOL_CAPS[tier]
      next[tier] = all.slice(idx, idx + cap)
      idx += cap
    }
    next.bench = all.slice(idx)
    setTiers(next)
    setDirty(true)
  }

  function findPlayer(id: string): [Player, TierKey] | null {
    for (const key of [...POOL_ORDER, 'bench'] as TierKey[]) {
      const p = tiers[key].find(p => p.id === id)
      if (p) return [p, key]
    }
    return null
  }

  function onDragStart({ active }: DragStartEvent) {
    const found = findPlayer(active.id as string)
    setActivePlayer(found?.[0] ?? null)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActivePlayer(null)
    if (!over) return
    const found = findPlayer(active.id as string)
    if (!found) return
    const [player, fromKey] = found
    const toKey = over.id as TierKey
    if (fromKey === toKey) return

    setTiers(prev => {
      const next = { ...prev }
      next[fromKey] = prev[fromKey].filter(p => p.id !== player.id)
      next[toKey] = [...prev[toKey], player].sort((a, b) => (b.rating_2k ?? 0) - (a.rating_2k ?? 0))
      return next
    })
    setDirty(true)
  }

  async function save() {
    const newlyBenched = tiers.bench.filter(p => initialInPool[p.id] === true)
    if (newlyBenched.length > 0) {
      const names = newlyBenched.slice(0, 8).map(p => p.name).join(', ')
      const more = newlyBenched.length > 8 ? ` and ${newlyBenched.length - 8} more` : ''
      const ok = confirm(
        `${newlyBenched.length} player(s) are being removed from the pool: ${names}${more}.\n\n` +
        `Every user who owns one of their cards will lose it. This can't be undone. Continue?`
      )
      if (!ok) return
    }

    setSaving(true)
    const updates: { id: string; tier: string; in_pool: boolean }[] = []
    for (const key of [...POOL_ORDER, 'bench'] as TierKey[]) {
      for (const p of tiers[key]) {
        updates.push({ id: p.id, tier: key === 'bench' ? (p.tier || 'bronze') : key, in_pool: key !== 'bench' })
      }
    }
    const res = await fetch('/api/admin/players/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await res.json().catch(() => ({}))
    setInitialInPool(Object.fromEntries(updates.map(u => [u.id, u.in_pool])))
    setSaving(false)
    setDirty(false)
    setSavedMsg(data.cardsRemoved > 0 ? `Saved ✓ (${data.cardsRemoved} cards removed)` : 'Saved ✓')
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 3500)
  }

  const poolTotal = POOL_ORDER.reduce((sum, k) => sum + tiers[k].length, 0)

  if (loading) {
    return <div className="text-[#a39890] text-sm py-16 text-center">Loading players…</div>
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <a href="/admin" className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-500/80 hover:text-amber-600 transition-colors">
            ← Admin
          </a>
          <h1 className="text-2xl font-black text-[#1a1714] mt-1">Player Pool</h1>
          <p className="text-xs text-[#a39890] mt-0.5">
            {poolTotal} in pool · {tiers.bench.length} out of pool
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#e2ddd6] text-sm focus:outline-none focus:border-[#1a1714]/30 w-40"
          />
          <button
            onClick={autoAssign}
            className="px-4 py-2 rounded-xl border border-[#e2ddd6] bg-white text-xs font-black text-[#1a1714] hover:bg-[#f5f3f0] transition-colors"
          >
            Auto-assign top 205
          </button>
          <button
            onClick={save}
            disabled={saving || !dirty}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-colors disabled:opacity-40 ${
              savedFlash
                ? 'bg-emerald-600 text-white'
                : 'bg-[#1a1714] text-white hover:bg-[#2c2825]'
            }`}
          >
            {saving ? 'Saving…' : savedFlash ? savedMsg : 'Save Changes'}
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        {/* 4 tier columns */}
        <div className="grid grid-cols-4 gap-3">
          {POOL_ORDER.map(tier => (
            <TierColumn key={tier} tierKey={tier} players={tiers[tier]} search={search} />
          ))}
        </div>

        {/* Bench (collapsible) */}
        <div className="mt-2">
          <button
            onClick={() => setShowBench(v => !v)}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#a39890] hover:text-[#6b6259] transition-colors mb-2"
          >
            <span className="text-[8px]">{showBench ? '▾' : '▸'}</span>
            Out of Pool ({tiers.bench.length})
          </button>
          {showBench && (
            <TierColumn tierKey="bench" players={tiers.bench} search={search} />
          )}
        </div>

        {/* Floating drag ghost */}
        <DragOverlay dropAnimation={null}>
          {activePlayer ? <PlayerPill player={activePlayer} ghost /> : null}
        </DragOverlay>
      </DndContext>

      {dirty && (
        <p className="text-[10px] text-[#a39890] text-center">Unsaved changes — hit Save Changes to persist.</p>
      )}
    </div>
  )
}
