'use client'

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

const LEVELS = [
  null, // 0 — handled separately
  { bg: 'bg-[#1a1714]',                                          ring: 'ring-2 ring-amber-600',                                    text: 'text-amber-500', crown: false },
  { bg: 'bg-gradient-to-b from-stone-800 to-stone-950',         ring: 'ring-[3px] ring-amber-500',                               text: 'text-amber-400', crown: false },
  { bg: 'bg-gradient-to-b from-amber-950 to-stone-950',         ring: 'ring-[3px] ring-amber-400 shadow-md shadow-amber-500/30', text: 'text-amber-300', crown: false },
  { bg: 'bg-gradient-to-b from-amber-900 to-black',             ring: 'ring-4 ring-yellow-400 shadow-lg shadow-amber-400/40',    text: 'text-yellow-200', crown: false },
  { bg: 'bg-gradient-to-b from-amber-700 via-amber-900 to-black', ring: 'ring-4 ring-amber-400 shadow-xl shadow-amber-400/60',  text: 'text-white',     crown: true  },
]

export function PrestigeAvatar({ level, size = 'lg' }: { level: number; size?: 'sm' | 'lg' }) {
  const isSmall  = size === 'sm'
  const sizeClass = isSmall ? 'w-8 h-8'   : 'w-16 h-16'
  const textClass = isSmall ? 'text-[13px]' : 'text-2xl'

  if (level === 0) {
    return (
      <div className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 bg-[#06101f] ring-2 ring-[#1e3a5f] overflow-hidden`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nba.png&h=80&w=80"
          alt="NBA"
          className={`${isSmall ? 'w-5 h-5' : 'w-10 h-10'} object-contain`}
        />
      </div>
    )
  }

  const cfg  = LEVELS[Math.min(level, LEVELS.length - 1)]!
  const roman = ROMAN[level - 1] ?? String(level)

  return (
    <div className="relative flex-shrink-0">
      {cfg.crown && !isSmall && (
        <div className="absolute -top-3 inset-x-0 flex justify-center z-10 pointer-events-none select-none">
          <span className="text-amber-400 text-base leading-none">♛</span>
        </div>
      )}
      <div className={`${sizeClass} rounded-full flex items-center justify-center ${cfg.bg} ${cfg.ring}`}>
        <span
          className={`${textClass} font-black select-none font-serif ${cfg.text}`}
          style={{ textShadow: isSmall ? `0 0 6px currentColor` : `0 1px 8px currentColor` }}
        >
          {roman}
        </span>
      </div>
    </div>
  )
}
