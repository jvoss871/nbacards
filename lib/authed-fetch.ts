import { supabase } from './supabase'

/** fetch() that attaches the current session's bearer token, if any. */
export async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(url, { ...options, headers })
}
