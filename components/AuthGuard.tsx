'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Routes that don't require authentication (or handle auth themselves)
const PUBLIC_PATHS = new Set(['/', '/help', '/onboarding', '/signin', '/join', '/terms'])

// Skip auth enforcement during local development
const DEV = process.env.NODE_ENV === 'development'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(DEV || PUBLIC_PATHS.has(pathname))

  useEffect(() => {
    if (DEV || PUBLIC_PATHS.has(pathname)) {
      setReady(true)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/')
      } else {
        setReady(true)
      }
    })
  }, [pathname, router])

  // Don't flash protected content while checking
  if (!ready) return null

  return <>{children}</>
}
