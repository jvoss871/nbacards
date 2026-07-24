'use client'

import { useEffect, useState } from 'react'
import { useUserId } from './use-user-id'
import { authedFetch } from './authed-fetch'

export function useOnboarding() {
  const { userId } = useUserId()
  const [seen, setSeen] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) return
    authedFetch('/api/onboarding')
      .then(r => {
        if (!r.ok) throw new Error(`GET /api/onboarding failed: ${r.status}`)
        return r.json()
      })
      .then(data => setSeen(new Set(data.seen ?? [])))
      .catch(err => console.error('[onboarding] failed to load seen state', err))
  }, [userId])

  function hasSeen(key: string) {
    return seen.has(key)
  }

  function markSeen(key: string) {
    setSeen(prev => new Set(prev).add(key))
    authedFetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
      .then(r => {
        if (!r.ok) throw new Error(`POST /api/onboarding failed: ${r.status}`)
      })
      .catch(err => console.error('[onboarding] failed to persist seen state', err))
  }

  return { hasSeen, markSeen }
}
