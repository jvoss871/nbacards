import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321'
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(url, key)

// Dev-only fallback so local testing works without signing in. Never used in production —
// see lib/use-user-id.ts and lib/get-user-id.ts, which are the real per-session identity path.
export const DEV_USER_ID = 'default'
