import { ROMAN } from './PrestigeAvatar'

export interface LegendData {
  name: string
  era: string
  position: string
  image_url?: string | null
  bio: string
}

export function LegendCard({ legend, prestigeNum, className = '' }: {
  legend: LegendData
  prestigeNum: number
  className?: string
}) {
  const initials = legend.name.split(' ').map(n => n[0]).join('').toUpperCase()

  return (
    // Card protector outer shell — pearl/gloss plastic feel
    <div className={`relative flex-shrink-0 ${className}`}>
      <div className="rounded-[18px] p-[6px] bg-gradient-to-b from-slate-100 via-white to-slate-200 shadow-2xl shadow-black/50">

        {/* Plastic gloss reflection strip */}
        <div className="absolute top-[6px] inset-x-[6px] h-10 rounded-t-xl bg-gradient-to-b from-white/70 to-transparent z-30 pointer-events-none rounded-[12px]" />

        {/* Inner card */}
        <div className="relative aspect-[5/7] rounded-xl overflow-hidden bg-gradient-to-b from-[#0c1a35] via-[#0e1e3a] to-[#050d1a]">

          {/* Radiant gold burst from upper-center */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(251,191,36,0.18),transparent_70%)] pointer-events-none" />

          {/* Subtle grid lines — archival feel */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(#fbbf24 1px, transparent 1px), linear-gradient(90deg, #fbbf24 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          {/* Top badge */}
          <div className="absolute top-0 inset-x-0 z-20 bg-black/60 flex items-center justify-between px-2 py-1.5">
            <span className="text-[7px] font-black uppercase tracking-[0.25em] text-amber-400">Legend</span>
            <span className="text-[7px] font-black text-amber-400/50 uppercase tracking-wider">{legend.position}</span>
          </div>

          {/* Monogram / image area */}
          <div className="absolute inset-x-0 top-[26px] bottom-[60px] flex items-center justify-center">
            {legend.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={legend.image_url} alt={legend.name}
                className="w-full h-full object-cover object-top"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <div className="flex flex-col items-center gap-1">
                {/* Decorative ring */}
                <div className="absolute w-20 h-20 rounded-full border border-amber-400/10" />
                <div className="absolute w-28 h-28 rounded-full border border-amber-400/5" />
                {/* Large monogram */}
                <span className="text-[52px] font-black leading-none select-none tracking-tighter"
                  style={{ WebkitTextStroke: '1px rgba(251,191,36,0.2)', color: 'transparent' }}>
                  {initials}
                </span>
                {/* Gold accent line */}
                <div className="w-8 h-px bg-amber-400/30 mt-1" />
              </div>
            )}
          </div>

          {/* Bottom gradient */}
          <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[#050d1a] via-[#050d1a]/80 to-transparent" />

          {/* Bottom text */}
          <div className="absolute bottom-0 inset-x-0 px-2.5 pb-2.5 z-20">
            <div className="text-amber-300 font-black text-[9px] uppercase tracking-[0.12em] leading-tight drop-shadow-lg">
              {legend.name}
            </div>
            <div className="text-amber-500/50 text-[7px] mt-0.5 uppercase tracking-wider">{legend.era}</div>
            <div className="text-amber-400/35 text-[6px] mt-0.5 leading-tight line-clamp-1">{legend.bio}</div>
          </div>

          {/* Prestige pip */}
          <div className="absolute top-[26px] right-2 z-20">
            <span className="bg-amber-500 text-[#050d1a] text-[5px] font-black px-1.5 py-px rounded-full tracking-wider">
              P·{ROMAN[prestigeNum - 1] ?? prestigeNum}
            </span>
          </div>
        </div>

        {/* Graded label strip — PSA/BGS style */}
        <div className="mt-[3px] rounded-b-xl bg-[#0c1a35] px-3 py-1.5 flex items-center justify-between">
          <span className="text-[6px] font-black uppercase tracking-[0.2em] text-amber-400/50">CardPicks</span>
          <span className="text-[7px] font-black uppercase tracking-[0.15em] text-amber-400">Legend</span>
          <span className="text-[6px] font-black text-amber-400/50 tabular-nums">
            {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </div>
  )
}
