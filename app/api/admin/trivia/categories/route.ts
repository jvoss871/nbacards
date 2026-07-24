import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// GET /api/admin/trivia/categories
// Returns every category with its question count per difficulty tier, so the
// bank's shape is visible at a glance instead of only reachable via search text.
export async function GET() {
  const { data, error } = await sb()
    .from('trivia_questions')
    .select('category, difficulty')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byCategory = new Map<string, { total: number; byDifficulty: Record<string, number> }>()
  for (const row of data ?? []) {
    const entry = byCategory.get(row.category) ?? { total: 0, byDifficulty: {} }
    entry.total++
    entry.byDifficulty[row.difficulty] = (entry.byDifficulty[row.difficulty] ?? 0) + 1
    byCategory.set(row.category, entry)
  }

  const categories = [...byCategory.entries()]
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.total - a.total)

  return NextResponse.json({ categories })
}
