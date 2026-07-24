'use client'

import { useEffect, useState } from 'react'
import { ROMAN } from './PrestigeAvatar'

interface Particle {
  id: number
  tx: string
  ty: string
  size: number
  duration: number
  delay: number
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2
    const dist  = 14 + Math.random() * 30
    return {
      id:       i,
      tx:       `${Math.cos(angle) * dist}vw`,
      ty:       `${Math.sin(angle) * dist}vh`,
      size:     2 + Math.random() * 6,
      duration: 0.6 + Math.random() * 0.7,
      delay:    0.35 + Math.random() * 0.3,
    }
  })
}

interface Props {
  prestigeLevel: number   // current level before prestige (0 = first time → shows "I")
  nextSlotLabel: string   // e.g. "Point Guard"
  nextSlotPosition: string // e.g. "PG"
  onDone: () => void
}

export function PrestigeReveal({ prestigeLevel, nextSlotLabel, nextSlotPosition, onDone }: Props) {
  const [particles] = useState(() => makeParticles(44))
  const newLevel = prestigeLevel + 1

  useEffect(() => {
    const t = setTimeout(onDone, 6000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <>
      <style>{`
        @keyframes pr-overlay {
          0%   { opacity: 0 }
          8%   { opacity: 1 }
          80%  { opacity: 1 }
          100% { opacity: 0 }
        }
        @keyframes pr-flash {
          0%   { opacity: 0 }
          5%   { opacity: 0.45 }
          13%  { opacity: 0 }
          100% { opacity: 0 }
        }
        @keyframes pr-rays {
          0%   { opacity: 0; transform: scale(0.08) rotate(0deg) }
          12%  { opacity: 0.55 }
          60%  { opacity: 0.18; transform: scale(1.55) rotate(18deg) }
          100% { opacity: 0;   transform: scale(2.1) rotate(36deg) }
        }
        @keyframes pr-particle {
          0%   { transform: translate(-50%, -50%) scale(1.1); opacity: 1 }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0 }
        }
        @keyframes pr-label {
          0%   { opacity: 0; letter-spacing: 0.65em }
          18%  { opacity: 0.45 }
          75%  { opacity: 0.45; letter-spacing: 0.55em }
          90%  { opacity: 0.45 }
          100% { opacity: 0 }
        }
        @keyframes pr-numeral {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.35) }
          14%  { opacity: 1; transform: translate(-50%, -50%) scale(1.08) }
          35%  { opacity: 1; transform: translate(-50%, -50%) scale(1) }
          86%  { opacity: 1 }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.12) }
        }
        @keyframes pr-subtitle {
          0%   { opacity: 0; transform: translateY(10px) }
          100% { opacity: 1; transform: translateY(0) }
        }
        @keyframes pr-position {
          0%   { opacity: 0 }
          100% { opacity: 1 }
        }
        @keyframes pr-sub-out {
          0%   { opacity: 1 }
          100% { opacity: 0 }
        }
      `}</style>

      <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">

        {/* Dark overlay */}
        <div
          className="absolute inset-0 bg-[#03080f]"
          style={{ animation: 'pr-overlay 6s ease-in-out forwards' }}
        />

        {/* White flash */}
        <div
          className="absolute inset-0 bg-white"
          style={{ animation: 'pr-flash 6s ease-out forwards' }}
        />

        {/* Gold rays */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ animation: 'pr-rays 6s ease-out forwards' }}
        >
          {Array.from({ length: 18 }, (_, i) => (
            <div
              key={i}
              className="absolute bottom-1/2 origin-bottom"
              style={{
                width:     '1.2px',
                height:    '52vh',
                background: `linear-gradient(to top, rgba(251,191,36,0.95), rgba(245,158,11,0.28), transparent)`,
                transform: `rotate(${i * 20}deg)`,
              }}
            />
          ))}
        </div>

        {/* Particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              width:           p.size,
              height:          p.size,
              backgroundColor: '#FFD700',
              boxShadow:       `0 0 ${p.size * 2}px #FFD700`,
              top:  '50%',
              left: '50%',
              '--tx': p.tx,
              '--ty': p.ty,
              animation: `pr-particle ${p.duration}s ${p.delay}s ease-out forwards`,
            } as React.CSSProperties}
          />
        ))}

        {/* "PRESTIGE" label above numeral */}
        <div
          className="absolute font-black uppercase text-center select-none"
          style={{
            top:    'calc(50% - 5.5rem)',
            left:   '50%',
            transform: 'translateX(-50%)',
            fontSize: 'clamp(0.6rem, 1.6vw, 0.9rem)',
            color:  'rgba(251,191,36,0.55)',
            letterSpacing: '0.6em',
            whiteSpace: 'nowrap',
            animation: 'pr-label 6s ease-out forwards',
            animationDelay: '0.25s',
            opacity: 0,
          }}
        >
          PRESTIGE
        </div>

        {/* Roman numeral — the BIG stamp */}
        <div
          className="absolute select-none"
          style={{
            top: '50%', left: '50%',
            animation: 'pr-numeral 6s ease-out forwards',
            animationDelay: '0.3s',
            opacity: 0,
          }}
        >
          <div
            className="font-black text-center"
            style={{
              fontSize:   'clamp(5rem, 18vw, 10rem)',
              color:      '#FFD700',
              textShadow: '0 0 40px rgba(251,191,36,0.95), 0 0 90px rgba(245,158,11,0.55), 0 4px 0 rgba(0,0,0,0.6)',
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {ROMAN[newLevel - 1] ?? newLevel}
          </div>
        </div>

        {/* Subtitle: "Select your All-Time Starting Five" */}
        <div
          className="absolute select-none text-center"
          style={{
            top:    'calc(50% + 5rem)',
            left:   '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            animation: 'pr-subtitle 0.55s ease-out forwards, pr-sub-out 0.45s ease-in forwards',
            animationDelay: '1.3s, 5.4s',
            opacity: 0,
          }}
        >
          <div
            className="font-black uppercase"
            style={{
              fontSize: 'clamp(0.7rem, 1.8vw, 1rem)',
              color: 'rgba(255,255,255,0.75)',
              letterSpacing: '0.15em',
              textShadow: '0 0 20px rgba(251,191,36,0.4)',
            }}
          >
            Select your All-Time Starting Five
          </div>
        </div>

        {/* Position chip: "PG · Point Guard" */}
        <div
          className="absolute select-none"
          style={{
            top:    'calc(50% + 7.2rem)',
            left:   '50%',
            transform: 'translateX(-50%)',
            animation: 'pr-position 0.4s ease-out forwards, pr-sub-out 0.45s ease-in forwards',
            animationDelay: '1.7s, 5.4s',
            opacity: 0,
          }}
        >
          <div
            className="font-black uppercase text-center px-4 py-1.5 rounded-full"
            style={{
              fontSize: 'clamp(0.55rem, 1.3vw, 0.75rem)',
              color:    'rgba(251,191,36,0.9)',
              letterSpacing: '0.3em',
              border:   '1px solid rgba(251,191,36,0.3)',
              background: 'rgba(251,191,36,0.08)',
              whiteSpace: 'nowrap',
            }}
          >
            {nextSlotPosition} · {nextSlotLabel}
          </div>
        </div>

      </div>
    </>
  )
}
