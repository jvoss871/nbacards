import { createClient } from '@supabase/supabase-js'

const DEV_FALLBACK = process.env.NODE_ENV === 'development' ? 'default' : null

/**
 * Extracts the authenticated user's ID from the request's Authorization header.
 * Returns null if there's no valid session — routes must treat that as unauthenticated.
 * In development only, falls back to 'default' so local testing works without signing in —
 * but only when no token was sent at all. A token that WAS sent but fails validation (expired,
 * malformed, etc.) is a real failure and must not be silently papered over into 'default',
 * or a stale/invalid session looks like a successful write while actually acting on the wrong
 * account entirely.
 */
export async function getUserId(req: Request): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return DEV_FALLBACK

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: { user } } = await sb.auth.getUser(token)
  return user?.id ?? null
}
