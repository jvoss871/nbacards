const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

export async function callGroq(
  apiKey: string,
  prompt: string,
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: opts?.temperature ?? 0.85,
      max_tokens: opts?.maxTokens ?? 8000,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error: ${err}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

export function parseJsonArray(raw: string): unknown[] {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) throw new Error('Not an array')
  return parsed
}

// Second-pass fact-check: asks the model whether each stated correct answer
// is accurate. Only returns false when confident it's wrong — defaults to
// true (keep) whenever verification itself fails or is inconclusive.
export async function verifyQuestions(apiKey: string, questions: unknown[]): Promise<boolean[]> {
  const verifyPrompt = `You are an NBA fact-checker. For each question below, verify whether the stated correct answer is accurate.

Return ONLY a JSON array of booleans (one per question, in order): [true, false, true, ...]
true = the answer is correct or very likely correct
false = the answer is DEFINITELY wrong (you are confident it is factually incorrect)

Only return false when you are certain the answer is wrong. If unsure, return true.

Questions to verify:
${questions.map((q: unknown, i: number) => {
  const item = q as Record<string, unknown>
  const answerKey = item.correct_answer as string
  const answerText = item[`option_${answerKey}`]
  return `${i + 1}. ${item.question} → stated correct answer: "${answerText}"`
}).join('\n')}`

  try {
    const raw = await callGroq(apiKey, verifyPrompt, { temperature: 0.1, maxTokens: 500 })
    const parsed = parseJsonArray(raw)
    if (parsed.length === questions.length) return parsed as boolean[]
    return questions.map(() => true)
  } catch {
    return questions.map(() => true)
  }
}

export function normalizeQuestionText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}
