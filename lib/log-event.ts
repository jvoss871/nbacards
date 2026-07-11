import { type SupabaseClient } from '@supabase/supabase-js'

// Fire-and-forget — never lets a log failure break the calling route
export function logEvent(
  client: SupabaseClient,
  userId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  client.from('user_events').insert({ user_id: userId, event_type: eventType, metadata }).then()
}
