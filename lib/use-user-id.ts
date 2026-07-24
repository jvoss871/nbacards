'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, DEV_USER_ID } from './supabase'

const isDev = process.env.NODE_ENV === 'development'

/**
 * Real per-session user id (Supabase Auth), for client components.
 * Falls back to the shared dev account only in local development.
 */
export function useUserId() {
  const [session, setSession] = useState<Session | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoaded(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Before the initial getSession() resolves, userId must stay null — not the dev
  // fallback — otherwise a component's effect can fire once with 'default' (whose data
  // is empty) and once with the real session id, and if the 'default' request resolves
  // second it silently overwrites correct data with an empty result.
  const userId = session?.user.id ?? (loaded && isDev ? DEV_USER_ID : null)
  return { userId, accessToken: session?.access_token ?? null, loaded }
}
