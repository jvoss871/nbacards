'use client'

import { useEffect, useRef, useState } from 'react'
import { MISC_CATEGORIES, MISC_CATEGORY_LABELS, type MiscCategory } from '@/lib/trivia-misc-prompts'

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

interface CategoryStat {
  category: string
  total: number
  byDifficulty: Record<string, number>
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
  showDifficulty = false,
  primaryLabel = 'Save',
  busyLabel = 'Saving…',
  successLabel = 'Saved',
  secondaryLabel = 'Delete',
  deleteConfirmText = 'Delete this question permanently?',
}: {
  question: TriviaQuestion
  onSave: (id: string, updates: Partial<TriviaQuestion>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDismiss?: (flagId: string) => Promise<void>
  flagId?: string
  showDifficulty?: boolean
  primaryLabel?: string
  busyLabel?: string
  successLabel?: string
  secondaryLabel?: string
  deleteConfirmText?: string
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
      difficulty: q.difficulty,
      category: q.category,
    })
    setSaving(false)
    setFeedback(successLabel)
    setTimeout(() => setFeedback(''), 2000)
  }

  async function del() {
    if (!confirm(deleteConfirmText)) return
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
      {showDifficulty && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#a39890]">Difficulty</span>
          <select
            value={String(q.difficulty)}
            onChange={e => setQ(p => ({ ...p, difficulty: e.target.value }))}
            className="px-3 py-1.5 rounded-lg border border-[#e2ddd6] text-xs font-bold bg-white focus:outline-none focus:border-[#1a1714]/30"
          >
            <option value="1">1 — Easy</option>
            <option value="2">2 — Medium</option>
            <option value="3">3 — Hard</option>
          </select>
          <span className="text-[10px] text-[#c8c2b8] font-bold uppercase tracking-widest">
            {MISC_CATEGORY_LABELS[q.category as MiscCategory] ?? q.category}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-[#1a1714] hover:bg-[#2c2825] text-white text-xs font-black transition-colors disabled:opacity-40"
        >
          {saving ? busyLabel : primaryLabel}
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
          {secondaryLabel}
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

  // Bulk fill — tops up each difficulty tier to a target count
  const [fillTarget, setFillTarget] = useState(150)
  const [filling, setFilling]       = useState(false)
  const [fillMessage, setFillMessage] = useState('')

  // Misc AI-generated question approvals
  const [pending, setPending]       = useState<TriviaQuestion[]>([])
  const [loadingPending, setLoadingPending] = useState(true)
  const [expandedPending, setExpandedPending] = useState<string | null>(null)
  const [genCategory, setGenCategory] = useState<MiscCategory>(MISC_CATEGORIES[0])
  const [genCount, setGenCount]     = useState(10)
  const [generating, setGenerating] = useState(false)
  const [genMessage, setGenMessage] = useState('')

  // Question search / browse
  const [searchQ, setSearchQ]       = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [searchResults, setSearchResults] = useState<TriviaQuestion[]>([])
  const [searching, setSearching]   = useState(false)
  const [expandedQ, setExpandedQ]   = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Category shape of the bank — lets you spot-check e.g. all Tier 3 Awards questions
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  useEffect(() => {
    fetch('/api/admin/trivia/flags?status=pending')
      .then(r => r.json())
      .then(d => { setFlags(Array.isArray(d) ? d : []); setLoadingFlags(false) })
      .catch(() => setLoadingFlags(false))
  }, [])

  function refreshPending() {
    return fetch('/api/admin/trivia/pending')
      .then(r => r.json())
      .then(d => setPending(Array.isArray(d) ? d : []))
  }

  useEffect(() => {
    refreshPending().finally(() => setLoadingPending(false))
  }, [])

  useEffect(() => {
    fetch('/api/admin/trivia/categories')
      .then(r => r.json())
      .then(d => { setCategoryStats(d.categories ?? []); setLoadingCategories(false) })
      .catch(() => setLoadingCategories(false))
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (searchQ.length < 2 && !filterCategory && !filterDifficulty) { setSearchResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const params = new URLSearchParams()
      if (searchQ.length >= 2) params.set('q', searchQ)
      if (filterCategory) params.set('category', filterCategory)
      if (filterDifficulty) params.set('difficulty', filterDifficulty)
      const res = await fetch(`/api/admin/trivia/search?${params}`)
      const d = await res.json()
      setSearchResults(Array.isArray(d) ? d : [])
      setSearching(false)
    }, 300)
  }, [searchQ, filterCategory, filterDifficulty])

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

  async function runFillQuestions() {
    setFilling(true)
    setFillMessage('')
    try {
      const res = await fetch('/api/admin/fill-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: fillTarget }),
      })
      const d = await res.json()
      if (!res.ok) {
        setFillMessage(d.error ?? 'Fill failed')
      } else {
        const parts = Object.entries(d.results as Record<string, { before: number; added: number }>)
          .map(([diff, r]) => `T${diff}: +${r.added} (${r.before}→${r.before + r.added})`)
        setFillMessage(parts.join(' · '))
      }
    } catch {
      setFillMessage('Fill failed')
    }
    setFilling(false)
  }

  async function generateMisc() {
    setGenerating(true)
    setGenMessage('')
    try {
      const res = await fetch('/api/admin/trivia/generate-misc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: genCategory, count: genCount }),
      })
      const d = await res.json()
      if (!res.ok) {
        setGenMessage(d.error ?? 'Generation failed')
      } else {
        setGenMessage(`Added ${d.inserted} · ${d.rejected} rejected · ${d.duplicates} duplicates`)
        await refreshPending()
      }
    } catch {
      setGenMessage('Generation failed')
    }
    setGenerating(false)
  }

  async function approvePending(id: string, updates: Partial<TriviaQuestion>) {
    await fetch('/api/admin/trivia/pending', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    setPending(prev => prev.filter(p => p.id !== id))
    setExpandedPending(null)
  }

  async function rejectPending(id: string) {
    await fetch('/api/admin/trivia/pending', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setPending(prev => prev.filter(p => p.id !== id))
    setExpandedPending(null)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <a href="/admin" className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-500/80 hover:text-amber-600 transition-colors">
          ← Admin
        </a>
        <h1 className="text-2xl font-black text-[#1a1714] mt-1">Trivia Questions</h1>
      </div>

      {/* Bulk fill — tops up each difficulty tier to a target count */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#a39890] mb-3">Bulk Fill</p>
        <div className="flex flex-wrap items-center gap-2 bg-white border border-[#e2ddd6] rounded-2xl px-4 py-3 shadow-sm">
          <span className="text-xs text-[#6b6259]">Target per difficulty tier</span>
          <input
            type="number"
            min={1}
            value={fillTarget}
            onChange={e => setFillTarget(Number(e.target.value))}
            className="w-20 px-3 py-2 rounded-xl border border-[#e2ddd6] text-sm font-bold focus:outline-none focus:border-[#1a1714]/30"
          />
          <button
            onClick={runFillQuestions}
            disabled={filling}
            className="px-4 py-2 rounded-xl bg-[#1a1714] hover:bg-[#2c2825] text-white text-xs font-black transition-colors disabled:opacity-40"
          >
            {filling ? 'Filling…' : 'Fill'}
          </button>
          {fillMessage && <span className="text-xs font-bold text-[#6b6259]">{fillMessage}</span>}
        </div>
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

      {/* Misc AI-generated question approvals */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#a39890] mb-3">
          Misc Approvals ({loadingPending ? '…' : pending.length})
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-3 bg-white border border-[#e2ddd6] rounded-2xl px-4 py-3 shadow-sm">
          <select
            value={genCategory}
            onChange={e => setGenCategory(e.target.value as MiscCategory)}
            className="px-3 py-2 rounded-xl border border-[#e2ddd6] text-sm font-bold bg-white focus:outline-none focus:border-[#1a1714]/30"
          >
            {MISC_CATEGORIES.map(c => (
              <option key={c} value={c}>{MISC_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={30}
            value={genCount}
            onChange={e => setGenCount(Number(e.target.value))}
            className="w-16 px-3 py-2 rounded-xl border border-[#e2ddd6] text-sm font-bold focus:outline-none focus:border-[#1a1714]/30"
          />
          <button
            onClick={generateMisc}
            disabled={generating}
            className="px-4 py-2 rounded-xl bg-[#1a1714] hover:bg-[#2c2825] text-white text-xs font-black transition-colors disabled:opacity-40"
          >
            {generating ? 'Generating…' : 'Generate'}
          </button>
          {genMessage && <span className="text-xs font-bold text-[#6b6259]">{genMessage}</span>}
        </div>

        {loadingPending ? (
          <div className="h-20 bg-white border border-[#e2ddd6] rounded-2xl animate-pulse" />
        ) : pending.length === 0 ? (
          <p className="text-sm text-[#a39890] py-2">No pending misc questions.</p>
        ) : (
          <div className="space-y-2">
            {pending.map(q => {
              const isOpen = expandedPending === q.id
              return (
                <div key={q.id} className="bg-white border border-sky-200 rounded-2xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setExpandedPending(isOpen ? null : q.id)}
                    className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-sky-50/50 transition-colors"
                  >
                    <span className="text-base mt-0.5 flex-shrink-0">🤖</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#1a1714] leading-snug">{q.question}</p>
                      <p className="text-[10px] text-[#c8c2b8] mt-1">
                        {MISC_CATEGORY_LABELS[q.category as MiscCategory] ?? q.category} · Difficulty {q.difficulty} ·{' '}
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
                        showDifficulty
                        primaryLabel="Approve"
                        busyLabel="Approving…"
                        successLabel="Approved"
                        secondaryLabel="Reject"
                        deleteConfirmText="Reject this question?"
                        onSave={approvePending}
                        onDelete={rejectPending}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Question bank shape — browse by category/difficulty to spot-check quality */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#a39890] mb-3">Question Bank</p>
        {loadingCategories ? (
          <div className="h-20 bg-white border border-[#e2ddd6] rounded-2xl animate-pulse" />
        ) : (
          <div className="bg-white border border-[#e2ddd6] rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-4 py-2 border-b border-[#f0ede8] bg-[#faf9f6] text-[9px] font-black uppercase tracking-widest text-[#a39890]">
              <span>Category</span>
              <span className="w-8 text-right">T1</span>
              <span className="w-8 text-right">T2</span>
              <span className="w-8 text-right">T3</span>
              <span className="w-10 text-right">Total</span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-[#f0ede8]">
              {categoryStats.map(c => {
                const isActive = filterCategory === c.category
                return (
                  <button
                    key={c.category}
                    onClick={() => {
                      setFilterCategory(isActive ? '' : c.category)
                      setExpandedQ(null)
                    }}
                    className={`w-full grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-4 py-2 text-left text-xs transition-colors ${
                      isActive ? 'bg-amber-50' : 'hover:bg-[#1a1714]/[0.02]'
                    }`}
                  >
                    <span className={`font-bold ${isActive ? 'text-amber-700' : 'text-[#1a1714]'}`}>{c.category}</span>
                    <span className="w-8 text-right tabular-nums text-[#a39890]">{c.byDifficulty['1'] ?? 0}</span>
                    <span className="w-8 text-right tabular-nums text-[#a39890]">{c.byDifficulty['2'] ?? 0}</span>
                    <span className="w-8 text-right tabular-nums text-[#a39890]">{c.byDifficulty['3'] ?? 0}</span>
                    <span className="w-10 text-right tabular-nums font-black text-[#1a1714]">{c.total}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Search & edit any question */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#a39890] mb-3">Search &amp; Edit Questions</p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
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
          <select
            value={filterDifficulty}
            onChange={e => { setFilterDifficulty(e.target.value); setExpandedQ(null) }}
            className="px-3 py-2 rounded-xl border border-[#e2ddd6] text-xs font-bold bg-white focus:outline-none focus:border-[#1a1714]/30"
          >
            <option value="">Any difficulty</option>
            <option value="1">1 — Easy</option>
            <option value="2">2 — Medium</option>
            <option value="3">3 — Hard</option>
          </select>
          {filterCategory && (
            <button
              onClick={() => setFilterCategory('')}
              className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors"
            >
              {filterCategory} ×
            </button>
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
        {!searching && (searchQ.length >= 2 || filterCategory || filterDifficulty) && searchResults.length === 0 && (
          <p className="text-sm text-[#a39890] text-center py-3">No questions found.</p>
        )}
      </div>
    </div>
  )
}
