const SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv'])

export function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(' ')
  if (parts.length === 1) return { first: '', last: parts[0] }
  const lastWord = parts[parts.length - 1].toLowerCase()
  if (SUFFIXES.has(lastWord) && parts.length >= 2) {
    return { first: parts.slice(0, -2).join(' '), last: parts.slice(-2).join(' ') }
  }
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] }
}

export const GOLD_HEX_BG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10.4' height='18'%3E%3Cpolygon points='5.2,0 10.4,3 10.4,9 5.2,12 0,9 0,3' fill='rgba(255,200,0,0.12)' stroke='rgba(10,5,0,0.72)' stroke-width='0.7'/%3E%3Cpolygon points='0,9 5.2,12 5.2,18 0,21 -5.2,18 -5.2,12' fill='rgba(220,170,0,0.12)' stroke='rgba(10,5,0,0.72)' stroke-width='0.7'/%3E%3Cpolygon points='10.4,9 15.6,12 15.6,18 10.4,21 5.2,18 5.2,12' fill='rgba(220,170,0,0.12)' stroke='rgba(10,5,0,0.72)' stroke-width='0.7'/%3E%3C/svg%3E\")"

export function lastNameFontSize(name: string, base: number): number {
  const len = name.length
  if (len <= 6)  return Math.round(base * 0.82)
  if (len <= 8)  return Math.max(6, Math.round(base * 0.79))
  if (len <= 10) return Math.max(6, Math.round(base * 0.64))
  if (len <= 13) return Math.max(6, Math.round(base * 0.50))
  return Math.max(6, Math.round(base * 0.43))
}
