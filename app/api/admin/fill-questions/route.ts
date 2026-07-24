import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/admin/fill-questions
// Generates questions until each difficulty tier has at least `target` questions.
// Body: { target?: number }  — default 150 per tier
//
// Strategy: run generate in batches of 20, deduplicate against existing bank,
// stop each tier once it hits the target. Max 10 batches per tier to avoid runaway.

const MAX_BATCHES = 100
const BATCH_SIZE  = 20

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function normalizeQuestion(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

// Auth is handled by middleware.ts (admin cookie gate on /api/admin/*).
export async function POST(req: Request) {
  const { target = 150 } = await req.json().catch(() => ({}))
  const base = new URL(req.url)
  const generateUrl = `${base.protocol}//${base.host}/api/trivia/generate`

  const sb = serviceClient()
  const summary: Record<number, { before: number; added: number; batches: number }> = {}

  for (const diff of [1, 2, 3]) {
    // Current count for this tier
    const { count: before } = await sb
      .from('trivia_questions')
      .select('*', { count: 'exact', head: true })
      .eq('difficulty', diff)

    const startCount = before ?? 0
    if (startCount >= target) {
      summary[diff] = { before: startCount, added: 0, batches: 0 }
      continue
    }

    // Fetch existing normalized question texts for deduplication
    const { data: existing } = await sb
      .from('trivia_questions')
      .select('question')
      .eq('difficulty', diff)
    const existingNorm = new Set((existing ?? []).map(q => normalizeQuestion(q.question)))

    let totalAdded = 0
    let batches = 0

    while (startCount + totalAdded < target && batches < MAX_BATCHES) {
      batches++
      const res = await fetch(generateUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ difficulty: diff, count: BATCH_SIZE }),
      })
      if (!res.ok) break

      const { inserted = 0 } = await res.json()
      totalAdded += inserted

      // Refresh the dedup set after each batch (new questions were just inserted)
      const { data: fresh } = await sb
        .from('trivia_questions')
        .select('question')
        .eq('difficulty', diff)
      for (const q of fresh ?? []) existingNorm.add(normalizeQuestion(q.question))
    }

    summary[diff] = { before: startCount, added: totalAdded, batches }
  }

  return NextResponse.json({ target, results: summary })
}
