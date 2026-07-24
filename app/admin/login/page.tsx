'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminLoginPage() {
  const [status, setStatus] = useState<'checking' | 'error' | 'no-session'>('checking')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    async function tryGrant() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setStatus('no-session')
        return
      }
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.access_token }),
      })
      if (res.ok) {
        router.push(params.get('next') ?? '/admin')
      } else {
        setMessage('Your account does not have admin access.')
        setStatus('error')
      }
    }
    tryGrant()
  }, [router, params])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf9f6] px-4">
      <div className="w-full max-w-xs text-center">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-amber-600/60 mb-2">CardPicks</p>
        <h1 className="text-xl font-black text-[#1a1714] mb-8">Admin Access</h1>

        {status === 'checking' && (
          <p className="text-sm text-[#a39890]">Verifying identity…</p>
        )}
        {status === 'error' && (
          <p className="text-sm text-red-500">{message}</p>
        )}
        {status === 'no-session' && (
          <div className="space-y-3">
            <p className="text-sm text-[#a39890]">Sign in to your account first.</p>
            <a
              href={`/signin?next=${encodeURIComponent('/admin/login' + (params.get('next') ? '?next=' + params.get('next') : ''))}`}
              className="inline-block px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black text-sm font-black rounded-xl transition-colors"
            >
              Sign In
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
