import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callGroq, parseJsonArray, verifyQuestions, normalizeQuestionText } from '@/lib/trivia-ai'
import { MISC_CATEGORIES, MISC_CATEGORY_PROMPTS, type MiscCategory } from '@/lib/trivia-misc-prompts'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function isMiscCategory(v: unknown): v is MiscCategory {
  return typeof v === 'string' && (MISC_CATEGORIES as readonly string[]).includes(v)
}

// POST /api/admin/trivia/generate-misc
// Body: { category: 'pop_culture' | 'all_star_weekend' | 'front_office', count?: number }
// Generates candidate misc questions and lands them in trivia_pending_questions
// for admin review — unlike /api/trivia/generate, nothing here is auto-inserted live.
export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 })

  const body = await req.json().catch(() => ({}))
  const category = body.category
  const count = body.count ?? 10

  if (!isMiscCategory(category)) {
    return NextResponse.json({ error: `category must be one of: ${MISC_CATEGORIES.join(', ')}` }, { status: 400 })
  }

  const sb = serviceClient()

  // Avoid-list draws from both the live bank and whatever's still sitting in review,
  // so regenerating doesn't produce duplicates of pending-but-unapproved questions.
  const [{ data: live }, { data: pending }] = await Promise.all([
    sb.from('trivia_questions').select('question, correct_answer, option_a, option_b, option_c, option_d').eq('category', category),
    sb.from('trivia_pending_questions').select('question, correct_answer, option_a, option_b, option_c, option_d').eq('category', category),
  ])

  type ExistingRow = { question: string; correct_answer: string; option_a: string; option_b: string; option_c: string; option_d: string }
  const existingRows = [...(live ?? []), ...(pending ?? [])] as ExistingRow[]

  const avoidList = existingRows.slice(-120).map(q => {
    const ans = q[`option_${q.correct_answer}` as keyof ExistingRow] ?? ''
    return `"${q.question}" → ${ans}`
  }).join('\n')

  const prompt = `You are an NBA trivia expert generating questions for a card game.

${MISC_CATEGORY_PROMPTS[category]}

FACT-FIRST METHOD — for every question, start with a verified fact, then build around it:
1. State the NBA fact you know with certainty
2. Turn that fact into a question
3. Set the correct answer
4. Add 3 plausible but wrong distractors

ALREADY IN THE BANK — do NOT repeat any of these questions or test the same fact:
${avoidList || '(none yet)'}

ANTI-DUPLICATION rules:
- Every question must test a DISTINCT fact from a unique angle
- Generate exactly ${count} questions

Each question also needs a suggested difficulty:
1 = any casual fan would know it, 2 = a dedicated fan would know it, 3 = only a die-hard would know it.
This is a suggestion only — an admin will review and can change it.

Return ONLY a JSON array (no markdown, no extra text):
[{
  "question": "string",
  "option_a": "string",
  "option_b": "string",
  "option_c": "string",
  "option_d": "string",
  "correct_answer": "a" | "b" | "c" | "d",
  "difficulty": 1 | 2 | 3
}]`

  let questions: unknown[]
  try {
    const raw = await callGroq(apiKey, prompt, { temperature: 0.85, maxTokens: 8000 })
    questions = parseJsonArray(raw)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to parse Groq response' }, { status: 502 })
  }

  const verified = await verifyQuestions(apiKey, questions)

  const existingNorm = new Set(existingRows.map(q => normalizeQuestionText(q.question)))

  const verifiedQuestions = questions.filter((_: unknown, i: number) => verified[i] !== false)
  const rows = verifiedQuestions
    .map((q: unknown) => {
      const item = q as Record<string, unknown>
      const rawDifficulty = Number(item.difficulty)
      const difficulty = [1, 2, 3].includes(rawDifficulty) ? rawDifficulty : 2
      return {
        question:       item.question as string,
        option_a:       item.option_a as string,
        option_b:       item.option_b as string,
        option_c:       item.option_c as string,
        option_d:       item.option_d as string,
        correct_answer: item.correct_answer as string,
        difficulty,
        category,
      }
    })
    .filter(row => !existingNorm.has(normalizeQuestionText(row.question)))

  const rejected = questions.length - verifiedQuestions.length
  const duplicates = verifiedQuestions.length - rows.length
  const { data, error } = await sb.from('trivia_pending_questions').insert(rows).select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ inserted: data?.length ?? 0, rejected, duplicates, category })
}
