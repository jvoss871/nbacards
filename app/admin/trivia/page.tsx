'use client'

import { useEffect, useRef, useState } from 'react'

const OPTION_KEYS = ['option_a', 'option_b', 'option_c', 'option_d'] as const
const OPTION_LETTERS: Record<string, string> = { option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D' }
// correct_answer in DB is a single letter: 'a' | 'b' | 'c' | 'd'
const OPTION_KEY_TO_LETTER: Record<string, string> = { option_a: 'a', option_b: 'b', option_c: 'c', option_d: 'd' }

interface TriviaQuestion {
  id: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  difficulty: string
  category: string
}

interface Flag {
  id: string
  question_id: string
  reason: string
  question_snapshot: TriviaQuestion
  status: string
  created_at: string
}

function QuestionEditor({
  question,
  onSave,
  onDelete,
  onDismiss,
  flagId,
}: {
  question: TriviaQuestion
  onSave: (id: string, updates: Partial<TriviaQuestion>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDismiss?: (flagId: string) => Promise<void>
  flagId?: string
}) {
  const [q, setQ] = useState({ ...question })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function save() {
    setSaving(true)
    await onSave(q.id, {
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
    })
    setSaving(false)
    setFeedback('Saved')
    setTimeout(() => setFeedback(''), 2000)
  }

  async function del() {
    if (!confirm('Delete this question permanently?')) return
    setDeleting(true)
    await onDelete(q.id)
    setDeleting(false)
  }

  const inputClass = 'w-full px-3 py-2 rounded-xl border border-[#e2ddd6] text-sm focus:outline-none focus:border-[#1a1714]/30'

  return (
    <div className="space-y-3">
      <textarea
        value={q.question}
        onChange={e => setQ(p => ({ ...p, question: e.target.value }))}
        rows={2}
        className={`${inputClass} resize-none`}
      />
      <div className="grid grid-cols-2 gap-2">
        {OPTION_KEYS.map(key => {
          const letter = OPTION_KEY_TO_LETTER[key]
          const isCorrect = q.correct_answer === letter
          return (
            <div key={key} className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 transition-colors ${
              isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-[#e2ddd6] bg-white'
            }`}>
              <span className="text-[10px] font-black text-[#a39890] w-4">{OPTION_LETTERS[key]}</span>
              <input
                value={q[key]}
                onChange={e => setQ(p => ({ ...p, [key]: e.target.value }))}
                className="flex-1 text-sm bg-transparent focus:outline-none text-[#1a1714]"
              />
              <button
                onClick={() => setQ(p => ({ ...p, correct_answer: letter }))}
                title="Mark as correct"
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                  isCorrect ? 'bg-emerald-500 border-emerald-500' : 'border-[#c8c2b8] hover:border-emerald-400'
                }`}
              />
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-[#1a1714] hover:bg-[#2c2825] text-white text-xs font-black transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {flagId && onDismiss && (
          <button
            onClick={() => onDismiss(flagId)}
            className="px-4 py-2 rounded-xl border border-[#e2ddd6] text-xs font-black text-[#6b6259] hover:bg-[#1a1714]/[0.04] transition-colors"
          >
            Dismiss Flag
          </button>
        )}
        <button
          onClick={del}
          disabled={deleting}
          className="px-4 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black transition-colors disabled:opacity-40"
        >
          Delete
        </button>
        {feedback && <span className="text-xs font-bold text-emerald-600">{feedback}</span>}
      </div>
    </div>
  )
}

export default function AdminTriviaPage() {
  const [flags, setFlags]           = useState<Flag[]>([])
  const [loadingFlags, setLoadingFlags] = useState(true)
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null)

  // Question search
  const [searchQ, setSearchQ]       = useState('')
  const [searchResults, setSearchResults] = useState<TriviaQuestion[]>([])
  const [searching, setSearching]   = useState(false)
  const [expandedQ, setExpandedQ]   = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/admin/trivia/flags?status=pending')
      .then(r => r.json())
      .then(d => { setFlags(Array.isArray(d) ? d : []); setLoadingFlags(false) })
      .catch(() => setLoadingFlags(false))
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (searchQ.length < 2) { setSearchResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/admin/trivia/search?q=${encodeURIComponent(searchQ)}`)
      const d = await res.json()
      setSearchResults(Array.isArray(d) ? d : [])
      setSearching(false)
    }, 300)
  }, [searchQ])

  async function saveQuestion(id: string, updates: Partial<TriviaQuestion>) {
    await fetch('/api/admin/trivia/fix', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
  }

  async function deleteQuestion(id: string) {
    await fetch('/api/admin/trivia/fix', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setFlags(prev => prev.filter(f => f.question_id !== id))
    setSearchResults(prev => prev.filter(q => q.id !== id))
  }

  async function resolveFlag(flagId: string, status: 'dismissed' | 'fixed') {
    await fetch('/api/admin/trivia/flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: flagId, status }),
    })
    setFlags(prev => prev.filter(f => f.id !== flagId))
    setExpandedFlag(null)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <a href="/admin" className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-500/80 hover:text-amber-600 transition-colors">
          ← Admin
        </a>
        <h1 className="text-2xl font-black text-[#1a1714] mt-1">Trivia Questions</h1>
      </div>

      {/* Flagged questions queue */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#a39890] mb-3">
          Flagged by Users ({loadingFlags ? '…' : flags.length})
        </p>
        {loadingFlags ? (
          <div className="h-20 bg-white border border-[#e2ddd6] rounded-2xl animate-pulse" />
        ) : flags.length === 0 ? (
          <p className="text-sm text-[#a39890] py-2">No pending flags.</p>
        ) : (
          <div className="space-y-2">
            {flags.map(flag => {
              const snap = flag.question_snapshot
              const isOpen = expandedFlag === flag.id
              return (
                <div key={flag.id} className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setExpandedFlag(isOpen ? null : flag.id)}
                    className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-amber-50/50 transition-colors"
                  >
                    <span className="text-base mt-0.5 flex-shrink-0">🚩</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#1a1714] leading-snug">{snap.question}</p>
                      {flag.reason && (
                        <p className="text-xs text-[#a39890] mt-1 italic">"{flag.reason}"</p>
                      )}
                      <p className="text-[10px] text-[#c8c2b8] mt-1">
                        {snap.difficulty} · {snap.category} ·{' '}
                        Answer: <span className="font-bold text-emerald-600">
                          {snap[`option_${snap.correct_answer}` as keyof TriviaQuestion] ?? snap.correct_answer}
                        </span>
                      </p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={`text-[#c8c2b8] flex-shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-[#e2ddd6] pt-4">
                      <QuestionEditor
                        question={snap}
                        flagId={flag.id}
                        onSave={async (id, updates) => {
                          await saveQuestion(id, updates)
                          await resolveFlag(flag.id, 'fixed')
                        }}
                        onDelete={async (id) => {
                          await deleteQuestion(id)
                          await resolveFlag(flag.id, 'fixed')
                        }}
                        onDismiss={async (flagId) => resolveFlag(flagId, 'dismissed')}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Search & edit any question */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#a39890] mb-3">Search & Edit Questions</p>
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search question text…"
            value={searchQ}
            onChange={e => { setSearchQ(e.target.value); setExpandedQ(null) }}
            className="w-full px-4 py-3 pr-10 rounded-2xl border border-[#e2ddd6] bg-white shadow-sm text-sm focus:outline-none focus:border-[#1a1714]/30 transition-all"
          />
          {searching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#c8c2b8] border-t-[#1a1714]/60 rounded-full animate-spin" />
          )}
        </div>
        {searchResults.length > 0 && (
          <div className="bg-white border border-[#e2ddd6] rounded-2xl overflow-hidden shadow-sm">
            {searchResults.map((q, i) => {
              const isOpen = expandedQ === q.id
              return (
                <div key={q.id} className={i > 0 ? 'border-t border-[#e2ddd6]' : ''}>
                  <button
                    onClick={() => setExpandedQ(isOpen ? null : q.id)}
                    className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-[#1a1714]/[0.02] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#1a1714] leading-snug">{q.question}</p>
                      <p className="text-[10px] text-[#c8c2b8] mt-1">
                        {q.difficulty} · {q.category} ·{' '}
                        Answer: <span className="font-bold text-emerald-600">
                          {q[`option_${q.correct_answer}` as keyof TriviaQuestion] ?? q.correct_answer}
                        </span>
                      </p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={`text-[#c8c2b8] flex-shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-[#e2ddd6] pt-4">
                      <QuestionEditor
                        question={q}
                        onSave={async (id, updates) => {
                          await saveQuestion(id, updates)
                          setSearchResults(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
                        }}
                        onDelete={deleteQuestion}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {!searching && searchQ.length >= 2 && searchResults.length === 0 && (
          <p className="text-sm text-[#a39890] text-center py-3">No questions found.</p>
        )}
      </div>
    </div>
  )
}
