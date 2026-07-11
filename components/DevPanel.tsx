'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCredits } from '@/lib/credits-context'

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'] as const

const ACTION_CARDS = [
  { id: 'skip',        icon: '⏭',  label: 'Skip',        context: 'Trivia' },
  { id: 'safety_net',  icon: '🪢',  label: 'Safety Net',  context: 'Trivia' },
  { id: 'insurance',   icon: '🛡',  label: 'Insurance',   context: 'Picks'  },
  { id: 'double_down', icon: '⚡',  label: 'Double Down', context: 'Picks'  },
  { id: 'reroll',      icon: '🎲',  label: 'Reroll',      context: 'Packs'  },
  { id: 'repack',      icon: '🔄',  label: 'Repack',      context: 'Packs'  },
] as const

type Status = 'idle' | 'loading' | 'ok' | 'err'

function useAction() {
  const [status, setStatus] = useState<Status>('idle')
  async function run(fn: () => Promise<void>) {
    setStatus('loading')
    try {
      await fn()
      setStatus('ok')
      setTimeout(() => setStatus('idle'), 1500)
    } catch {
      setStatus('err')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }
  return { status, run }
}

function post(path: string, body?: object) {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => { if (!r.ok) throw new Error(); return r.json() })
}

function Btn({
  label, onClick, danger, small, disabled,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  small?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg font-bold transition-colors disabled:opacity-40 ${
        small ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      } ${
        danger
          ? 'bg-red-500/15 text-red-400 hover:bg-red-500/30 border border-red-500/30'
          : 'bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 border border-amber-400/20'
      }`}
    >
      {label}
    </button>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] uppercase tracking-widest text-amber-500/60 font-bold flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 flex-wrap justify-end">{children}</div>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/70">{label}</span>
      <div className="flex-1 h-px bg-amber-400/15" />
    </div>
  )
}

export default function DevPanel() {
  const [open, setOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const { setCredits } = useCredits()
  const router = useRouter()

  const picks      = useAction()
  const trivia     = useAction()
  const credits    = useAction()
  const prestige   = useAction()
  const reset      = useAction()
  const actionCard = useAction()

  async function addCredits(amount: number) {
    await credits.run(async () => {
      const data = await post('/api/dev/add-credits', { amount })
      setCredits(data.credits)
    })
  }

  async function resetPicks() {
    await picks.run(async () => {
      await post('/api/dev/reset-dates')
      window.location.reload()
    })
  }

  async function unlockTrivia() {
    await trivia.run(() => post('/api/dev/unlock-trivia'))
  }

  async function setPrestige(slot: number) {
    await prestige.run(async () => {
      await post('/api/prestige/dev', { level: slot - 1 })
      setOpen(false)
      router.push(`/collection?devSlot=${slot}`)
    })
  }

  async function addActionCard(id: string) {
    await actionCard.run(() => post('/api/dev/add-action-card', { card_type_id: id }))
  }

  async function resetAccount() {
    setConfirmReset(false)
    await reset.run(async () => {
      await post('/api/dev/reset-account')
      setCredits(200)
    })
  }

  function statusDot(s: Status) {
    if (s === 'loading') return <span className="text-amber-400/50 text-[10px]">…</span>
    if (s === 'ok')      return <span className="text-emerald-400 text-[10px]">✓</span>
    if (s === 'err')     return <span className="text-red-400 text-[10px]">✗</span>
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
      {/* Drawer */}
      {open && (
        <div className="w-72 rounded-2xl bg-[#0a0a0a]/97 border border-amber-400/15 shadow-2xl shadow-black/60 backdrop-blur-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-400/10">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400/80">Dev Panel</span>
            <button
              onClick={() => setOpen(false)}
              className="text-amber-400/40 hover:text-amber-400/80 text-base leading-none transition-colors"
            >
              ×
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Credits */}
            <div className="space-y-2">
              <Divider label="Credits" />
              <Row label="Add">
                {[100, 500, 1000, 5000].map(n => (
                  <Btn key={n} small label={`+${n}`} onClick={() => addCredits(n)} disabled={credits.status === 'loading'} />
                ))}
                {statusDot(credits.status)}
              </Row>
            </div>

            {/* Picks */}
            <div className="space-y-2">
              <Divider label="Pick'em" />
              <Row label="Schedule">
                <Btn label="Reset all games" onClick={resetPicks} disabled={picks.status === 'loading'} />
                {statusDot(picks.status)}
              </Row>
            </div>

            {/* Trivia */}
            <div className="space-y-2">
              <Divider label="Trivia" />
              <Row label="Session">
                <Btn label="Unlock today" onClick={unlockTrivia} disabled={trivia.status === 'loading'} />
                {statusDot(trivia.status)}
              </Row>
            </div>

            {/* Action Cards */}
            <div className="space-y-2">
              <Divider label="Action Cards" />
              {(['Trivia', 'Picks', 'Packs'] as const).map(ctx => (
                <Row key={ctx} label={ctx}>
                  {ACTION_CARDS.filter(c => c.context === ctx).map(c => (
                    <Btn
                      key={c.id}
                      small
                      label={`${c.icon} ${c.label}`}
                      onClick={() => addActionCard(c.id)}
                      disabled={actionCard.status === 'loading'}
                    />
                  ))}
                </Row>
              ))}
              {statusDot(actionCard.status)}
            </div>

            {/* Prestige */}
            <div className="space-y-2">
              <Divider label="Prestige" />
              <Row label="Open picker">
                {POSITIONS.map((pos, i) => (
                  <Btn key={pos} small label={pos} onClick={() => setPrestige(i + 1)} disabled={prestige.status === 'loading'} />
                ))}
                {statusDot(prestige.status)}
              </Row>
              <p className="text-[9px] text-amber-400/35 leading-tight">Navigates to Collection and opens the picker for that position.</p>
            </div>

            {/* Reset */}
            <div className="space-y-2">
              <Divider label="Account" />
              {confirmReset ? (
                <div className="space-y-2">
                  <p className="text-[10px] text-red-400/80">Wipes cards, legends, picks, trivia, action cards. Resets credits to 200 and prestige to 0.</p>
                  <div className="flex gap-2">
                    <Btn label="Yes, reset" danger onClick={resetAccount} disabled={reset.status === 'loading'} />
                    <Btn label="Cancel" onClick={() => setConfirmReset(false)} />
                    {statusDot(reset.status)}
                  </div>
                </div>
              ) : (
                <Row label="New user">
                  <Btn label="Reset account" danger onClick={() => setConfirmReset(true)} />
                  {statusDot(reset.status)}
                </Row>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => { setOpen(o => !o); setConfirmReset(false) }}
        className="w-11 h-11 rounded-full bg-[#0a0a0a]/90 border border-amber-400/20 shadow-xl backdrop-blur-sm flex items-center justify-center text-amber-400/60 hover:text-amber-400 hover:border-amber-400/40 transition-all"
        title="Dev Panel"
      >
        <span className="text-base leading-none">⚙</span>
      </button>
    </div>
  )
}
