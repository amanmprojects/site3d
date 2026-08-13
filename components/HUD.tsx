'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useApp } from '@/lib/store'
import { requestLock, requestUnlock } from '@/lib/controls'
import { planetRegistry } from '@/lib/planetRegistry'
import { sceneRef } from '@/lib/scene'
import { PLANETS, projectById } from '@/lib/planets'

function TargetIndicator() {
  const markerRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    const v = new THREE.Vector3()
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const cam = sceneRef.camera
      const el = markerRef.current
      if (!cam || !el) return
      const state = useApp.getState()
      const entry = state.targetId ? planetRegistry.get(state.targetId) : null
      const proj = state.targetId ? projectById(state.targetId) : null
      if (!state.locked || !entry || !proj) {
        el.style.opacity = '0'
        return
      }
      entry.object.getWorldPosition(v)
      v.project(cam)
      if (v.z > 1) {
        el.style.opacity = '0'
        return
      }
      const w = window.innerWidth
      const h = window.innerHeight
      const m = 48
      let x = (v.x * 0.5 + 0.5) * w
      let y = (1 - (v.y * 0.5 + 0.5)) * h
      x = Math.max(m, Math.min(w - m, x))
      y = Math.max(m, Math.min(h - m, y))
      el.style.opacity = '1'
      el.style.transform = `translate(${x}px, ${y}px)`
      if (labelRef.current) {
        labelRef.current.textContent = `${proj.name} · ${state.targetDistance}u`
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      ref={markerRef}
      className="pointer-events-none fixed left-0 top-0 z-20 transition-opacity duration-200"
      style={{ opacity: 0 }}
    >
      <div className="flex items-center gap-2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-2 w-2 rotate-45 border border-amber-300/80 bg-amber-300/10" />
        <span
          ref={labelRef}
          className="mono whitespace-nowrap text-sm uppercase tracking-[0.2em] text-amber-200/90 hud-glow"
        />
      </div>
    </div>
  )
}

function Intro({ onWarp }: { onWarp: (id: string) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        requestLock()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex flex-col items-center justify-between bg-black/60 backdrop-blur-[2px]">
      <div className="flex-1" />
      <div className="flex flex-col items-center px-6 text-center">
        <div className="mono mb-3 text-sm uppercase tracking-[0.5em] text-sky-300/70 hud-glow">
          Orbital Portfolio
        </div>
        <h1 className="text-5xl font-semibold tracking-tight text-white md:text-7xl">
          Aman Mehtar
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-sky-100/70 md:text-lg">
          Engineering student in AI &amp; Data Science, building agents, tools and
          full-stack products. Every planet in this system is a project — fly close
          to scan it.
        </p>

        <div className="mono mt-6 grid grid-cols-2 gap-x-6 gap-y-1 text-sm uppercase tracking-wider text-sky-200/60">
          <span>W / S — thrust</span>
          <span>Mouse — steer</span>
          <span>A / D — strafe</span>
          <span>Q / E — roll</span>
          <span>Shift — boost</span>
          <span>Space / Ctrl — up / down</span>
          <span>R — reset position</span>
          <span>Esc — release cursor</span>
        </div>

        <button
          type="button"
          onClick={() => requestLock()}
          className="mono panel corner mt-7 px-10 py-3 text-sm uppercase tracking-[0.35em] text-amber-200 transition hover:text-white hover:border-amber-300/60 hud-glow"
        >
          Launch
        </button>
        <div className="mono mt-3 text-xs uppercase tracking-[0.3em] text-sky-300/40">
          or press space
        </div>
      </div>

      <div className="w-full max-w-5xl px-6 pb-8">
        <div className="mono mb-3 text-center text-xs uppercase tracking-[0.4em] text-sky-300/50">
          Select a planet to autopilot
        </div>
        <div className="grid max-h-[36vh] grid-cols-2 gap-2 overflow-y-auto md:grid-cols-3 lg:grid-cols-4">
          {PLANETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onWarp(p.id)}
              className="panel corner group flex flex-col items-start gap-1 px-4 py-3 text-left transition hover:border-amber-300/50"
            >
              <span className="mono text-sm uppercase tracking-widest text-sky-100 group-hover:text-amber-200">
                {p.name}
              </span>
              <span className="mono truncate text-xs uppercase tracking-wider text-sky-300/50">
                {p.tags[0] ?? p.type}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function HUD() {
  const locked = useApp((s) => s.locked)
  const infoId = useApp((s) => s.infoId)
  const speed = useApp((s) => s.speed)
  const requestWarp = useApp((s) => s.requestWarp)

  const info = infoId ? projectById(infoId) : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'KeyF') {
        const state = useApp.getState()
        if (state.locked && state.infoId) {
          const p = projectById(state.infoId)
          if (p) window.open(p.link, '_blank', 'noopener')
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleWarp = (id: string) => {
    requestWarp(id)
    requestLock()
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      <TargetIndicator />

      {locked ? (
        <>
          {/* crosshair */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="crosshair-dot h-1.5 w-1.5 rounded-full bg-amber-200/90" />
            <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/30" />
          </div>

          {/* top-left identity + speed */}
          <div className="absolute left-5 top-5">
            <div className="mono text-sm uppercase tracking-[0.4em] text-sky-300/60 hud-glow">
              Aman Mehtar
            </div>
            <div className="mono mt-2 flex items-center gap-2 text-sm uppercase tracking-widest text-sky-100/80">
              <span className="text-sky-300/50">vel</span>
              <span className="w-12 text-right">{speed}</span>
              <div className="h-1 w-20 overflow-hidden border border-sky-300/20 bg-sky-900/30">
                <div
                  className="h-full bg-sky-300/80 transition-[width] duration-100"
                  style={{ width: `${Math.min(100, (speed / 780) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* bottom-left hints */}
          <div className="mono absolute bottom-5 left-5 text-xs uppercase leading-relaxed tracking-[0.3em] text-sky-300/40">
            W/A/S/D fly · mouse steer · Shift boost · R reset
            <br />
            Esc release · Enter open project
          </div>

          {/* info popup */}
          {info && (
            <div className="fade-in absolute bottom-8 left-1/2 w-[min(92vw,640px)] -translate-x-1/2">
              <div className="panel corner px-6 py-5">
                <div className="mono flex items-center justify-between text-xs uppercase tracking-[0.4em] text-amber-300/80">
                  <span>Scanning — project locked</span>
                  <span className="text-sky-300/50">{speed}u · approach</span>
                </div>
                <h2 className="mt-2 text-3xl font-semibold text-white">
                  {info.name}
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {info.tags.map((t) => (
                    <span
                      key={t}
                      className="mono rounded-sm border border-sky-300/25 px-1.5 py-0.5 text-xs uppercase tracking-wider text-sky-200/80"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-base leading-relaxed text-sky-100/75">
                  {info.description}
                </p>
                <div className="mono mt-4 flex items-center justify-between text-sm uppercase tracking-widest">
                  <span className="text-sky-300/50">{info.link.replace('https://', '')}</span>
                  <span className="text-amber-200/90 hud-glow">
                    Enter — open project
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <Intro onWarp={handleWarp} />
      )}
    </div>
  )
}
