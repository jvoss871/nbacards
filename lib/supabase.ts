import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321'
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(url, key)

export const USER_ID = 'default'
