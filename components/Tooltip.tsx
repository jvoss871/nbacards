'use client'

export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                      opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="bg-[#1a1714] text-white text-[10px] font-medium leading-snug rounded-lg px-2.5 py-1.5
                        whitespace-nowrap text-center shadow-lg">
          {text}
        </div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1a1714]" />
      </div>
    </div>
  )
}
