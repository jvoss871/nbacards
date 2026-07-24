'use client'

// Shared icon set for action cards — used by both the compact ActionCard face and the
// full-size ActionCardReveal, so a visual tweak only has to be made once.
export function ActionCardIcon({
  id,
  strokeWidth = 2.2,
  className,
}: {
  id: string
  strokeWidth?: number
  className?: string
}) {
  const cls = `w-full h-full ${className ?? ''}`
  switch (id) {
    case 'skip':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <polyline points="5,6 12,12 5,18"/>
          <polyline points="12,6 19,12 12,18"/>
        </svg>
      )
    case 'safety_net':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M3 10 Q12 20 21 10"/>
          <line x1="3" y1="10" x2="3" y2="6"/>
          <line x1="21" y1="10" x2="21" y2="6"/>
          <line x1="12" y1="15" x2="12" y2="4"/>
          <line x1="7.5" y1="13" x2="7.5" y2="4"/>
          <line x1="16.5" y1="13" x2="16.5" y2="4"/>
        </svg>
      )
    case 'insurance':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M12 3L4 7v5c0 4.8 3.4 9.3 8 10.6C16.6 21.3 20 16.8 20 12V7L12 3z"/>
          <polyline points="8.5,12 11,14.5 15.5,9.5"/>
        </svg>
      )
    case 'double_down':
      return (
        <svg viewBox="0 0 24 24" fill="white" className={cls}>
          <path d="M13 2L4.5 14H10l-1.5 8L19.5 10H14L13 2z"/>
        </svg>
      )
    case 'reroll':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M23 4v6h-6"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      )
    case 'repack':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <polyline points="17,1 21,5 17,9"/>
          <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
          <polyline points="7,23 3,19 7,15"/>
          <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
        </svg>
      )
    default:
      return <span className="text-white/60 text-lg select-none">{id}</span>
  }
}
