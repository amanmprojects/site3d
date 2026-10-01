'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useApp } from '@/lib/store'
import { requestLock, requestUnlock } from '@/lib/controls'
import { planetRegistry } from '@/lib/planetRegistry'
import { sceneRef } from '@/lib/scene'
import { PLANETS, projectById } from '@/lib/planets'
import { startAudio, setAudioMuted, audioScanChime, audioWarpWhoosh } from '@/lib/audio'
import { TouchControls } from '@/components/TouchControls'
import { Radar } from '@/components/Radar'
import { isTouchDevice } from '@/lib/touchInput'
import { QUALITY, QUALITY_ORDER, SETTINGS_KEYS } from '@/lib/quality'

function timeAgo(iso: string | null) {
  if (!iso) return null
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function repoStats(repo: NonNullable<ReturnType<typeof projectById>>['repo']) {
  if (!repo) return null
  const parts = [
    repo.language,
    repo.stars > 0 ? `★ ${repo.stars}` : null,
    repo.forks > 0 ? `${repo.forks} forks` : null,
    timeAgo(repo.pushedAt) ? `pushed ${timeAgo(repo.pushedAt)}` : null,
    repo.archived ? 'archived' : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

function SettingsRow() {
  const muted = useApp((s) => s.muted)
  const quality = useApp((s) => s.quality)
  const reducedMotion = useApp((s) => s.reducedMotion)

  return (
    <div className="mono flex flex-wrap items-center justify-center gap-5 text-xs uppercase tracking-[0.3em]">
      <button
        type="button"
        onClick={() => useApp.getState().toggleMuted()}
        className="text-sky-300/50 transition hover:text-amber-200/90"
        aria-label={muted ? 'Unmute audio' : 'Mute audio'}
        aria-pressed={muted}
      >
        {muted ? 'sound off' : 'sound on'}
      </button>
      <button
        type="button"
        onClick={() => {
          const order = QUALITY_ORDER
          useApp
            .getState()
            .setQuality(order[(order.indexOf(useApp.getState().quality) + 1) % order.length])
        }}
        className="text-sky-300/50 transition hover:text-amber-200/90"
        aria-label={`Graphics quality: ${quality}. Click to change`}
      >
        gfx {quality}
      </button>
      <button
        type="button"
        onClick={() =>
          useApp.getState().setReducedMotion(!useApp.getState().reducedMotion)
        }
        className="text-sky-300/50 transition hover:text-amber-200/90"
        aria-label={reducedMotion ? 'Enable motion effects' : 'Reduce motion effects'}
        aria-pressed={reducedMotion}
      >
        {reducedMotion ? 'motion off' : 'motion on'}
      </button>
    </div>
  )
}

function DustSlider({ className = '' }: { className?: string }) {
  const quality = useApp((s) => s.quality)
  const dustCount = useApp((s) => s.dustCount)
  const max = QUALITY[quality].dustCount
  const value = Math.max(0, Math.min(max, dustCount))

  return (
    <label
      className={`mono flex items-center gap-3 text-xs uppercase tracking-[0.3em] ${className}`}
    >
      <span className="text-sky-300/50">dust</span>
      <input
        type="range"
        className="hud-range w-32"
        min={0}
        max={max}
        step={25}
        value={value}
        onChange={(e) => useApp.getState().setDustCount(Number(e.target.value))}
        aria-label="Space dust particle count"
        aria-valuetext={`${value} of ${max}`}
      />
      <span className="w-14 text-right tabular-nums text-amber-200/90">{value}</span>
    </label>
  )
}

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
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        startAudio()
        requestLock()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const dirs: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -3,
      ArrowDown: 3,
    }
    const delta = dirs[e.key]
    if (!delta) return
    e.preventDefault()
    const grid = gridRef.current
    if (!grid) return
    const buttons = Array.from(grid.querySelectorAll<HTMLButtonElement>('button'))
    const idx = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const base = idx === -1 ? 0 : idx
    const next = Math.max(0, Math.min(buttons.length - 1, base + delta))
    buttons[next]?.focus()
  }

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
          <span>W / S — thrust / brake</span>
          <span>Mouse — steer</span>
          <span>A / D — roll</span>
          <span>Shift / Space — boost</span>
          <span>R — reset position</span>
          <span>Esc — release cursor</span>
        </div>

        <button
          type="button"
          autoFocus
          onClick={() => {
            startAudio()
            requestLock()
          }}
          className="mono panel corner mt-7 px-10 py-3 text-sm uppercase tracking-[0.35em] text-amber-200 transition hover:text-white hover:border-amber-300/60 hud-glow"
        >
          Launch
        </button>
        <div className="mono mt-3 text-xs uppercase tracking-[0.3em] text-sky-300/40">
          or press space
        </div>

        <SettingsRow />
        <DustSlider className="mt-4" />
      </div>

      <div className="w-full max-w-5xl px-6 pb-8">
        <div className="mono mb-3 text-center text-xs uppercase tracking-[0.4em] text-sky-300/50">
          Select a planet to autopilot
        </div>
        <div
          ref={gridRef}
          onKeyDown={onGridKeyDown}
          className="grid max-h-[36vh] grid-cols-2 gap-2 overflow-y-auto md:grid-cols-3 lg:grid-cols-4"
        >
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
              <span className="mono flex w-full items-center justify-between gap-2 text-xs uppercase tracking-wider text-sky-300/50">
                <span className="truncate">{p.tags[0] ?? p.type}</span>
                {p.repo?.language && (
                  <span className="shrink-0 text-sky-300/40">{p.repo.language}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SystemMap({ onWarp }: { onWarp: (id: string) => void }) {
  const gridRef = useRef<HTMLDivElement>(null)

  const close = () => {
    useApp.getState().setMapOpen(false)
    requestLock()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyM' && e.code !== 'Escape') return
      e.preventDefault()
      useApp.getState().setMapOpen(false)
      if (e.code === 'KeyM') requestLock()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const dirs: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -3,
      ArrowDown: 3,
    }
    const delta = dirs[e.key]
    if (!delta) return
    e.preventDefault()
    const grid = gridRef.current
    if (!grid) return
    const buttons = Array.from(grid.querySelectorAll<HTMLButtonElement>('button'))
    const idx = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const base = idx === -1 ? 0 : idx
    const next = Math.max(0, Math.min(buttons.length - 1, base + delta))
    buttons[next]?.focus()
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 px-6 backdrop-blur-[2px]">
      <div className="w-full max-w-4xl">
        <div className="mono mb-4 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-sky-300/60 hud-glow">
          <span>System map — select a planet to autopilot</span>
          <span className="text-sky-300/40">M — close</span>
        </div>
        <div
          ref={gridRef}
          onKeyDown={onGridKeyDown}
          className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto md:grid-cols-3 lg:grid-cols-4"
        >
          {PLANETS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onWarp(p.id)}
              className="panel corner group flex flex-col items-start gap-1 px-4 py-3 text-left transition hover:border-amber-300/50"
            >
              <span className="mono flex w-full items-center justify-between text-sm uppercase tracking-widest text-sky-100 group-hover:text-amber-200">
                <span className="truncate">{p.name}</span>
                <span className="ml-2 shrink-0 text-sky-300/30">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </span>
              <span className="mono flex w-full items-center justify-between gap-2 text-xs uppercase tracking-wider text-sky-300/50">
                <span className="truncate">{p.tags[0] ?? p.type}</span>
                {p.repo?.language && (
                  <span className="shrink-0 text-sky-300/40">{p.repo.language}</span>
                )}
              </span>
            </button>
          ))}
        </div>
        <div className="mono mt-4 flex items-center justify-center gap-5 text-xs uppercase tracking-[0.3em]">
          <button
            type="button"
            onClick={close}
            className="text-sky-300/50 transition hover:text-amber-200/90"
          >
            back to flight
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <SettingsRow />
          <DustSlider />
        </div>
      </div>
    </div>
  )
}

export function HUD() {
  const locked = useApp((s) => s.locked)
  const infoId = useApp((s) => s.infoId)
  const speed = useApp((s) => s.speed)
  const muted = useApp((s) => s.muted)
  const quality = useApp((s) => s.quality)
  const reducedMotion = useApp((s) => s.reducedMotion)
  const requestWarp = useApp((s) => s.requestWarp)
  const toggleMuted = useApp((s) => s.toggleMuted)
  const setLocked = useApp((s) => s.setLocked)
  const cancelWarp = useApp((s) => s.cancelWarp)
  const setQuality = useApp((s) => s.setQuality)
  const mapOpen = useApp((s) => s.mapOpen)
  const cycleQuality = () => {
    const next = QUALITY_ORDER[(QUALITY_ORDER.indexOf(useApp.getState().quality) + 1) % QUALITY_ORDER.length]
    setQuality(next)
  }
  const toggleReducedMotion = () =>
    useApp.getState().setReducedMotion(!useApp.getState().reducedMotion)

  const info = infoId ? projectById(infoId) : null

  useEffect(() => {
    useApp.getState().initSettings()
    return useApp.subscribe((s, prev) => {
      if (
        s.quality === prev.quality &&
        s.muted === prev.muted &&
        s.reducedMotion === prev.reducedMotion &&
        s.dustCount === prev.dustCount
      )
        return
      try {
        localStorage.setItem(SETTINGS_KEYS.quality, s.quality)
        localStorage.setItem(SETTINGS_KEYS.muted, s.muted ? '1' : '0')
        localStorage.setItem(SETTINGS_KEYS.motion, s.reducedMotion ? '0' : '1')
        localStorage.setItem(SETTINGS_KEYS.dust, String(s.dustCount))
      } catch {
        /* private mode */
      }
    })
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion)
  }, [reducedMotion])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'KeyF') {
        const state = useApp.getState()
        if (state.locked && state.infoId) {
          const p = projectById(state.infoId)
          if (p) window.open(p.link, '_blank', 'noopener')
        }
      } else if (e.code === 'KeyM') {
        const state = useApp.getState()
        if (!state.locked || state.mapOpen) return
        state.setMapOpen(true)
        requestUnlock()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const prevInfo = useRef<string | null>(null)
  useEffect(() => {
    if (infoId && infoId !== prevInfo.current) audioScanChime()
    prevInfo.current = infoId
  }, [infoId])

  const prevWarp = useRef<string | null>(null)
  useEffect(() => {
    const unsub = useApp.subscribe((s, prev) => {
      if (s.warpTo && s.warpTo !== prev.warpTo) audioWarpWhoosh()
    })
    return unsub
  }, [])

  useEffect(() => {
    setAudioMuted(muted)
  }, [muted])

  const handleWarp = (id: string) => {
    startAudio()
    useApp.getState().setMapOpen(false)
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

          <Radar />
          {isTouchDevice() && <TouchControls />}
          {mapOpen && <SystemMap onWarp={handleWarp} />}

          {/* top-left identity */}
          <div className="absolute left-5 top-5">
            <div className="mono text-sm uppercase tracking-[0.4em] text-sky-300/60 hud-glow">
              Aman Mehtar
            </div>
          </div>

          {/* top-right controls */}
          <div className="pointer-events-auto absolute right-5 top-5 flex flex-col items-end gap-3">
            <div className="flex items-center gap-4">
              {isTouchDevice() && (
                <button
                  type="button"
                  onClick={() => {
                    cancelWarp()
                    setLocked(false)
                  }}
                  className="mono text-xs uppercase tracking-[0.3em] text-sky-300/50 transition hover:text-amber-200/90"
                >
                  exit
                </button>
              )}
              <button
                type="button"
                onClick={toggleReducedMotion}
                className="mono text-xs uppercase tracking-[0.3em] text-sky-300/50 transition hover:text-amber-200/90"
                aria-label={reducedMotion ? 'Enable motion effects' : 'Reduce motion effects'}
                aria-pressed={reducedMotion}
              >
                {reducedMotion ? 'motion off' : 'motion on'}
              </button>
              <button
                type="button"
                onClick={cycleQuality}
                className="mono text-xs uppercase tracking-[0.3em] text-sky-300/50 transition hover:text-amber-200/90"
                aria-label={`Graphics quality: ${quality}. Click to change`}
              >
                gfx {quality}
              </button>
              <button
                type="button"
                onClick={toggleMuted}
                className="mono text-xs uppercase tracking-[0.3em] text-sky-300/50 transition hover:text-amber-200/90"
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                aria-pressed={muted}
              >
                {muted ? 'sound off' : 'sound on'}
              </button>
            </div>
            <DustSlider />
          </div>

          {/* bottom-left hints */}
          <div className="mono absolute bottom-5 left-5 text-xs uppercase leading-relaxed tracking-[0.3em] text-sky-300/40">
            Mouse steer · W/S thrust/brake · A/D roll · Shift/Space boost · R reset
            <br />
            M system map · Esc release · Enter open project
          </div>

          {/* bottom-right speed */}
          <div className="mono absolute bottom-5 right-5 text-right">
            <div className="flex items-baseline justify-end gap-2">
              <span className="tabular-nums text-3xl font-semibold leading-none text-sky-100/90 hud-glow">
                {speed}
              </span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-sky-300/50">u/s</span>
            </div>
            <div className="mt-2 h-0.5 w-40 overflow-hidden bg-sky-300/10">
              <div
                className="h-full bg-gradient-to-r from-sky-400/60 to-sky-200/90 transition-[width] duration-100"
                style={{ width: `${Math.min(100, (speed / 1100) * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-[0.25em] text-sky-300/40">
              <span>cruise 270</span>
              <span>boost 1100</span>
            </div>
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
                {repoStats(info.repo) && (
                  <div
                    className="mono mt-3 flex flex-wrap items-center gap-x-2 text-xs uppercase tracking-wider text-sky-300/60"
                    suppressHydrationWarning
                  >
                    <span className="text-sky-300/30">live</span>
                    <span>{repoStats(info.repo)}</span>
                  </div>
                )}
                <div className="mono mt-4 flex items-center justify-between text-sm uppercase tracking-widest">
                  <span className="text-sky-300/50">{info.link.replace('https://', '')}</span>
                  <a
                    href={info.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto text-amber-200/90 transition hover:text-white hud-glow"
                  >
                    open project ↗
                  </a>
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
