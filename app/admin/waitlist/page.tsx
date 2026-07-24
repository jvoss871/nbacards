'use client'

import { useEffect, useState } from 'react'

interface Signup {
  id: string
  email: string
  wants_beta: boolean
  created_at: string
}

export default function AdminWaitlistPage() {
  const [signups, setSignups] = useState<Signup[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/admin/waitlist')
      .then(r => r.json())
      .then(d => { setSignups(d.signups ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const betaCount = signups.filter(s => s.wants_beta).length

  function copyEmails() {
    navigator.clipboard.writeText(signups.map(s => s.email).join(', '))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadCsv() {
    const rows = [['email', 'wants_beta', 'joined_at'], ...signups.map(s => [s.email, String(s.wants_beta), s.created_at])]
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="text-[#a39890] text-sm py-16 text-center">Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <a href="/admin" className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-500/80 hover:text-amber-600 transition-colors">
            ← Admin
          </a>
          <h1 className="text-2xl font-black text-[#1a1714] mt-1">Waitlist</h1>
          <p className="text-xs text-[#a39890] mt-0.5">
            {signups.length} signed up · {betaCount} want beta access
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyEmails}
            disabled={signups.length === 0}
            className="px-4 py-2 rounded-xl border border-[#e2ddd6] bg-white text-xs font-black text-[#1a1714] hover:bg-[#f5f3f0] transition-colors disabled:opacity-40"
          >
            {copied ? 'Copied ✓' : 'Copy Emails'}
          </button>
          <button
            onClick={downloadCsv}
            disabled={signups.length === 0}
            className="px-4 py-2 rounded-xl bg-[#1a1714] hover:bg-[#2c2825] text-white text-xs font-black transition-colors disabled:opacity-40"
          >
            Download CSV
          </button>
        </div>
      </div>

      {signups.length === 0 ? (
        <div className="text-center py-14 border-2 border-dashed border-[#e2ddd6] rounded-2xl">
          <p className="text-[#a39890] text-xs font-bold uppercase tracking-widest">No signups yet</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e2ddd6] rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2.5 border-b border-[#f0ede8] bg-[#faf9f6]">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#a39890]">Email</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-[#a39890]">Beta</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-[#a39890]">Joined</span>
          </div>
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#f0ede8]">
            {signups.map(s => (
              <div key={s.id} className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2.5 items-center">
                <span className="text-sm text-[#1a1714] truncate">{s.email}</span>
                <span className={`text-[10px] font-black ${s.wants_beta ? 'text-emerald-600' : 'text-[#d4cfc9]'}`}>
                  {s.wants_beta ? 'Yes' : '—'}
                </span>
                <span className="text-[10px] text-[#a39890] whitespace-nowrap">
                  {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
