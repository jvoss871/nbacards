'use client'

import { useEffect, useState } from 'react'

interface Particle {
  id: number
  tx: string
  ty: string
  size: number
  duration: number
  delay: number
  color: string
}

const COLORS = ['#FFD700', '#FFC107', '#FFE566', '#FFA500', '#FFFFFF', '#FFF8DC']

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2
    const dist  = 18 + Math.random() * 36
    return {
      id:       i,
      tx:       `${Math.cos(angle) * dist}vw`,
      ty:       `${Math.sin(angle) * dist}vh`,
      size:     2 + Math.random() * 7,
      duration: 0.55 + Math.random() * 0.65,
      delay:    Math.random() * 0.25,
      color:    COLORS[Math.floor(Math.random() * COLORS.length)],
    }
  })
}

export function PlatinumReveal({ onDone }: { onDone: () => void }) {
  const [particles] = useState(() => makeParticles(52))

  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <>
      <style>{`
        @keyframes pt-overlay {
          0%   { opacity: 0 }
          12%  { opacity: 0.88 }
          55%  { opacity: 0.72 }
          100% { opacity: 0 }
        }
        @keyframes pt-flash {
          0%   { opacity: 0 }
          8%   { opacity: 0.55 }
          20%  { opacity: 0 }
          100% { opacity: 0 }
        }
        @keyframes pt-rays {
          0%   { opacity: 0; transform: scale(0.1) rotate(0deg) }
          18%  { opacity: 0.65 }
          65%  { opacity: 0.28; transform: scale(1.6) rotate(22deg) }
          100% { opacity: 0;    transform: scale(2.2) rotate(40deg) }
        }
        @keyframes pt-particle {
          0%   { transform: translate(-50%, -50%) scale(1.2); opacity: 1 }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0 }
        }
        @keyframes pt-text {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.55) }
          22%  { opacity: 1; transform: translate(-50%, -50%) scale(1.06) }
          55%  { opacity: 1; transform: translate(-50%, -50%) scale(1) }
          85%  { opacity: 1 }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.15) }
        }
        @keyframes pt-sub {
          0%   { opacity: 0; letter-spacing: 0.55em }
          35%  { opacity: 0.7 }
          60%  { opacity: 0.7; letter-spacing: 0.45em }
          100% { opacity: 0 }
        }
      `}</style>

      <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">

        {/* Dark overlay */}
        <div
          className="absolute inset-0 bg-black"
          style={{ animation: 'pt-overlay 3s ease-in-out forwards' }}
        />

        {/* White flash */}
        <div
          className="absolute inset-0 bg-white"
          style={{ animation: 'pt-flash 3s ease-out forwards' }}
        />

        {/* Light rays */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ animation: 'pt-rays 3s ease-out forwards' }}
        >
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={i}
              className="absolute bottom-1/2 origin-bottom"
              style={{
                width: '1.5px',
                height: '55vh',
                background: `linear-gradient(to top, rgba(255,210,0,0.9), rgba(255,180,0,0.3), transparent)`,
                transform: `rotate(${i * 22.5}deg)`,
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
              backgroundColor: p.color,
              boxShadow:       `0 0 ${p.size * 2}px ${p.color}`,
              top:  '50%',
              left: '50%',
              '--tx': p.tx,
              '--ty': p.ty,
              animation: `pt-particle ${p.duration}s ${p.delay}s ease-out forwards`,
            } as React.CSSProperties}
          />
        ))}

        {/* PLATINUM stamp */}
        <div
          className="absolute"
          style={{
            top: '50%', left: '50%',
            animation: 'pt-text 3s ease-out forwards',
          }}
        >
          <div
            className="font-black uppercase text-center select-none"
            style={{
              fontSize:   'clamp(2.8rem, 9vw, 5.5rem)',
              color:      '#FFD700',
              textShadow: '0 0 30px rgba(255,210,0,0.9), 0 0 70px rgba(255,150,0,0.6), 0 2px 0 rgba(0,0,0,0.5)',
              letterSpacing: '0.18em',
              whiteSpace: 'nowrap',
            }}
          >
            PLATINUM
          </div>
          <div
            className="text-center uppercase font-bold"
            style={{
              color:         'rgba(255,220,100,0.8)',
              fontSize:      'clamp(0.55rem, 1.5vw, 0.8rem)',
              letterSpacing: '0.5em',
              marginTop:     '0.35em',
              animation:     'pt-sub 3s ease-out forwards',
              textShadow:    '0 0 20px rgba(255,200,0,0.6)',
            }}
          >
            CARD PULL
          </div>
        </div>

      </div>
    </>
  )
}
