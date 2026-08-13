'use client'

import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'

const ITEM_LABELS: Record<string, string> = {
  '/planets/various_planets.glb': 'planetary database',
  '/ship/ship.glb': 'starship hull',
  '/sun/stroming_sun.glb': 'solar core',
  '/sky/NightSkyHDRI008_8K.jpg': 'deep-space survey',
}

export function LoadingScreen() {
  const { active, progress, item, errors } = useProgress()
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (active || progress < 100) return
    timers.current.push(setTimeout(() => setLeaving(true), 450))
    timers.current.push(setTimeout(() => setGone(true), 1250))
  }, [active, progress])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  if (gone) return null

  const label = item
    ? (ITEM_LABELS[item] ?? item.split('/').pop() ?? 'assets')
    : 'navigational systems'

  return (
    <div
      className={`fixed inset-0 z-40 flex select-none flex-col items-center justify-center bg-black transition-opacity duration-700 ${leaving ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border border-sky-300/20" />
        <div className="absolute inset-[7px] rounded-full border border-sky-300/10" />
        <div className="orbit-dot" />
      </div>

      <div className="mono mt-9 text-center">
        <div className="text-[10px] uppercase tracking-[0.5em] text-sky-300/60 hud-glow">
          Aman Mehtar · Orbital Portfolio
        </div>
        <h1 className="mt-3 text-base uppercase tracking-[0.35em] text-sky-100/90">
          Initializing navigation
        </h1>
      </div>

      <div className="mt-9 w-[min(78vw,420px)]">
        <div className="panel corner h-1.5 overflow-hidden">
          <div
            className="h-full bg-amber-300/90 shadow-[0_0_12px_rgba(255,184,77,0.8)] transition-[width] duration-300 ease-out"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>
        <div className="mono mt-3 flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.3em] text-sky-300/60">
          <span className="flex min-w-0 items-center gap-2">
            <span className="loading-pulse h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300/80" />
            <span className="truncate">{label}</span>
          </span>
          <span className="shrink-0 text-amber-200/90 hud-glow">
            {Math.round(progress)}%
          </span>
        </div>
        {errors.length > 0 && (
          <div className="mono mt-4 text-[9px] uppercase tracking-widest text-amber-400/60">
            {errors.length} asset{errors.length === 1 ? '' : 's'} failed to load
          </div>
        )}
      </div>
    </div>
  )
}
