'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { authedFetch } from '@/lib/authed-fetch'

export default function OnboardingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function check() {
      // Must be authenticated
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.replace('/'); return }

      // If they already have a username, skip onboarding
      const res = await authedFetch('/api/user/username')
      const { username: existing } = await res.json()
      if (existing) { router.replace('/picks'); return }

      setChecking(false)
    }
    check()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const res = await authedFetch('/api/user/username', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      setSaving(false)
      return
    }
    router.replace('/picks')
  }

  if (checking) {
    return (
      <div className="-mx-4 -my-6 min-h-screen bg-[#080e1a] flex items-center justify-center">
        <div className="text-white/20 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="-mx-4 -my-6 min-h-screen bg-[#080e1a] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-[9px] font-black uppercase tracking-[0.5em] text-amber-400/30 mb-3">
            One last step
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Pick Your Username</h1>
          <p className="text-white/30 text-sm leading-relaxed">
            This name appears on your profile and in the Hall of Fame if you reach Prestige V.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            required
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="YourUsername"
            maxLength={20}
            className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 focus:border-amber-400/40 text-white placeholder-white/20 text-sm outline-none transition-colors"
          />
          <p className="text-white/20 text-[11px] px-1">
            3–20 characters · letters, numbers, _ and - only
          </p>

          {error && (
            <div className="text-red-400/80 text-xs text-center py-2 px-3 rounded-lg bg-red-400/8 border border-red-400/15">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || username.trim().length < 3}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black text-sm uppercase tracking-wider rounded-xl transition-colors mt-1"
          >
            {saving ? '…' : 'Lock It In'}
          </button>
        </form>
      </div>
    </div>
  )
}
