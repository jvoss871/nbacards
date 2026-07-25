'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { authedFetch } from '@/lib/authed-fetch'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authStep, setAuthStep] = useState<'form' | 'username'>('form')
  const [usernameVal, setUsernameVal] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  // Already signed in? Don't show the sign-in form on top of a live session —
  // send them where a completed sign-in would have gone.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setCheckingSession(false); return }
      const res = await authedFetch('/api/user/username')
      const { username: existing } = await res.json()
      if (existing) {
        window.location.href = '/picks'
      } else {
        setAuthStep('username')
        setCheckingSession(false)
      }
    })
  }, [])

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthError(null)
    setAuthLoading(true)
    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password })
      if (error) { setAuthError(error.message); setAuthLoading(false); return }
      setAuthStep('username')
      setAuthLoading(false)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) { setAuthError(error.message); setAuthLoading(false); return }
      const res = await authedFetch('/api/user/username')
      const { username: existing } = await res.json()
      if (existing) {
        window.location.href = '/picks'
      } else {
        setAuthStep('username')
        setAuthLoading(false)
      }
    }
  }

  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAuthError(null)
    setAuthLoading(true)
    const res = await authedFetch('/api/user/username', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameVal }),
    })
    const data = await res.json()
    if (!res.ok) { setAuthError(data.error ?? 'Something went wrong'); setAuthLoading(false); return }
    window.location.href = '/picks'
  }

  async function handleGoogleAuth() {
    setAuthError(null)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding`,
        // Without this, Google silently reuses whatever account is already
        // active in the browser instead of showing the account picker.
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  if (checkingSession) {
    return <div className="min-h-[80vh] flex items-center justify-center text-[#a39890] text-sm">Loading…</div>
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {authStep === 'username' ? (
          <>
            <div className="text-center mb-8">
              <div className="text-[9px] font-black uppercase tracking-[0.5em] text-amber-600/50 mb-3">
                One Last Step
              </div>
              <h2 className="text-3xl font-black text-[#1a1714] mb-2">Pick Your Username</h2>
              <p className="text-[#1a1714]/40 text-sm">
                This appears on your profile and in the Hall of Fame.
              </p>
            </div>

            <form onSubmit={handleUsernameSubmit} className="flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                required
                value={usernameVal}
                onChange={e => setUsernameVal(e.target.value)}
                placeholder="YourUsername"
                maxLength={20}
                className="w-full px-4 py-3.5 rounded-xl bg-white border border-[#1a1714]/[0.12] focus:border-amber-500/50 text-[#1a1714] placeholder-[#1a1714]/25 text-sm outline-none transition-colors shadow-sm"
              />
              <p className="text-[#1a1714]/30 text-[11px] px-1">
                3–20 characters · letters, numbers, _ and - only
              </p>

              {authError && (
                <div className="text-red-600/80 text-xs text-center py-2 px-3 rounded-lg bg-red-50 border border-red-200">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading || usernameVal.trim().length < 3}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-colors mt-1"
              >
                {authLoading ? '…' : 'Lock It In'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="text-[9px] font-black uppercase tracking-[0.5em] text-amber-600/50 mb-3">
                {authMode === 'signup' ? 'Create Account' : 'Welcome Back'}
              </div>
              <h2 className="text-3xl font-black text-[#1a1714]">
                {authMode === 'signup' ? 'Start Your Collection' : 'Sign In'}
              </h2>
            </div>

            <button
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-[#1a1714]/[0.1] hover:border-[#1a1714]/[0.2] bg-white hover:bg-[#1a1714]/[0.02] text-[#1a1714] font-semibold text-sm transition-all mb-5 shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[#1a1714]/[0.07]" />
              <span className="text-[#1a1714]/25 text-xs">or</span>
              <div className="flex-1 h-px bg-[#1a1714]/[0.07]" />
            </div>

            <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-4 py-3.5 rounded-xl bg-white border border-[#1a1714]/[0.12] focus:border-amber-500/50 text-[#1a1714] placeholder-[#1a1714]/25 text-sm outline-none transition-colors shadow-sm"
              />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                minLength={6}
                className="w-full px-4 py-3.5 rounded-xl bg-white border border-[#1a1714]/[0.12] focus:border-amber-500/50 text-[#1a1714] placeholder-[#1a1714]/25 text-sm outline-none transition-colors shadow-sm"
              />

              {authError && (
                <div className="text-red-600/80 text-xs text-center py-2 px-3 rounded-lg bg-red-50 border border-red-200">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-colors mt-1"
              >
                {authLoading ? '…' : authMode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <p className="text-[#1a1714]/30 text-xs text-center mt-5">
              {authMode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
              <button
                onClick={() => { setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); setAuthError(null) }}
                className="text-amber-600 hover:text-amber-700 underline transition-colors"
              >
                {authMode === 'signup' ? 'Sign in' : 'Sign up'}
              </button>
            </p>

            <p className="text-center mt-4">
              <Link href="/" className="text-[#1a1714]/25 text-xs hover:text-[#1a1714]/50 transition-colors">
                ← Back to home
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
