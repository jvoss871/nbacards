const TZ = 'America/New_York'

/** Current date in ET as YYYY-MM-DD */
export function todayET(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ })
}

/** Start of current month in ET as ISO string (midnight UTC of that ET date) */
export function monthStartET(): string {
  const ymd = todayET().slice(0, 7) + '-01'
  return new Date(ymd + 'T00:00:00-05:00').toISOString()
}

/** Current ET Date object (wall-clock ET, useful for getMonth/getFullYear) */
export function nowET(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
}

/** Days remaining until the start of next month in ET */
export function daysUntilMonthResetET(): number {
  const now = nowET()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/** Format an ISO string as a display date in ET */
export function formatDateET(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString('en-US', { timeZone: TZ, ...opts })
}

/** Start of previous month in ET as ISO string */
export function lastMonthStartET(): string {
  const now = nowET()
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const month = now.getMonth() === 0 ? 12 : now.getMonth()
  const mm = String(month).padStart(2, '0')
  return new Date(`${year}-${mm}-01T00:00:00-05:00`).toISOString()
}

/** YYYY-MM key for the previous month in ET (used for dedup tracking) */
export function lastMonthKeyET(): string {
  const now = nowET()
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const month = now.getMonth() === 0 ? 12 : now.getMonth()
  return `${year}-${String(month).padStart(2, '0')}`
}
