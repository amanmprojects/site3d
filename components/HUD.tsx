'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { useApp } from '@/lib/store'
import { requestLock, requestUnlock } from '@/lib/controls'
import { planetRegistry } from '@/lib/planetRegistry'
import { sceneRef } from '@/lib/scene'
import { motion } from '@/lib/motion'
import { PLANETS, projectById, type PlanetDef } from '@/lib/planets'
import { startAudio, setAudioMuted, audioScanChime, audioWarpWhoosh } from '@/lib/audio'
import { TouchControls } from '@/components/TouchControls'
import { Radar } from '@/components/Radar'
import { isTouchDevice } from '@/lib/touchInput'
import { QUALITY_ORDER, SETTINGS_KEYS, formatStars, starCeiling } from '@/lib/quality'

const CHIP =
  'mono inline-flex items-center gap-2 border border-sky-300/20 bg-[#060e1a]/60 px-3 py-1.5 text-[11px] uppercase tracking-[0.25em] text-sky-300/60 transition hover:border-amber-300/50 hover:text-amber-100'

const noopSubscribe = () => () => {}

function useTouch() {
  return useSyncExternalStore(noopSubscribe, isTouchDevice, () => false)
}

const subscribePointerLock = (cb: () => void) => {
  document.addEventListener('pointerlockchange', cb)
  return () => document.removeEventListener('pointerlockchange', cb)
}

function usePointerFree() {
  return useSyncExternalStore(
    subscribePointerLock,
    () => !document.pointerLockElement,
    () => false,
  )
}

function formatDistance(u: number) {
  if (u < 1000) return `${Math.round(u)} u`
  return `${(u / 1000).toFixed(u < 10000 ? 1 : 0)}k u`
}

const STAR_STEP_KEYS: Record<string, number> = {
  Equal: 1,
  NumpadAdd: 1,
  Minus: -1,
  NumpadSubtract: -1,
}

function stepStars(dir: number) {
  const state = useApp.getState()
  const max = starCeiling(state.quality)
  if (max <= 0) return
  const pct = Math.round((state.starCount / max) * 10) * 10
  const next = Math.max(0, Math.min(100, pct + dir * 10))
  state.setStarCount((next / 100) * max)
}

const _planet = new THREE.Vector3()

function surfaceDistance(id: string, from: THREE.Vector3) {
  const entry = planetRegistry.get(id)
  if (!entry) return null
  entry.object.getWorldPosition(_planet)
  return Math.max(0, _planet.distanceTo(from) - entry.radius)
}

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

function onGridKeyDown(e: React.KeyboardEvent<HTMLElement>) {
  const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'))
  if (!buttons.length) return
  const cols = buttons.filter((b) => b.offsetTop === buttons[0].offsetTop).length || 1
  const dirs: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -cols,
    ArrowDown: cols,
  }
  const delta = dirs[e.key]
  if (!delta) return
  e.preventDefault()
  const idx = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const base = idx === -1 ? 0 : idx
  const next = Math.max(0, Math.min(buttons.length - 1, base + delta))
  buttons[next]?.focus()
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mono inline-flex min-w-[1.6em] items-center justify-center rounded-[3px] border border-sky-300/30 bg-sky-300/[0.06] px-1.5 py-px text-[11px] font-medium normal-case tracking-normal text-sky-100/90">
      {children}
    </kbd>
  )
}

function Dot({ color, className = '' }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${className}`}
      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
    />
  )
}

function Toggle({
  label,
  value,
  on,
  onClick,
  ariaLabel,
  pressed,
}: {
  label: string
  value: string
  on: boolean
  onClick: () => void
  ariaLabel: string
  pressed?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={CHIP}
      aria-label={ariaLabel}
      aria-pressed={pressed}
    >
      <span>{label}</span>
      <span className={on ? 'text-amber-200/90' : 'text-sky-300/35'}>{value}</span>
    </button>
  )
}

function SettingsRow() {
  const muted = useApp((s) => s.muted)
  const quality = useApp((s) => s.quality)
  const reducedMotion = useApp((s) => s.reducedMotion)

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Toggle
        label="sound"
        value={muted ? 'off' : 'on'}
        on={!muted}
        onClick={() => useApp.getState().toggleMuted()}
        ariaLabel="Sound"
        pressed={!muted}
      />
      <Toggle
        label="gfx"
        value={quality}
        on
        onClick={() => {
          const order = QUALITY_ORDER
          useApp
            .getState()
            .setQuality(order[(order.indexOf(useApp.getState().quality) + 1) % order.length])
        }}
        ariaLabel={`Graphics quality: ${quality}. Click to change`}
      />
      <Toggle
        label="motion"
        value={reducedMotion ? 'off' : 'on'}
        on={!reducedMotion}
        onClick={() => useApp.getState().setReducedMotion(!useApp.getState().reducedMotion)}
        ariaLabel="Motion effects"
        pressed={!reducedMotion}
      />
    </div>
  )
}

function StarSlider({ className = '' }: { className?: string }) {
  const touch = useTouch()
  const quality = useApp((s) => s.quality)
  const starCount = useApp((s) => s.starCount)
  const max = starCeiling(quality)
  const value = Math.max(0, Math.min(max, starCount))
  // The input is a 0-100 percentage; the store keeps an absolute count so the
  // value survives a quality change.
  const pct = max > 0 ? Math.round((value / max) * 100) : 0

  return (
    <label
      className={`mono flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] ${className}`}
    >
      <span className="text-sky-300/60">stars</span>
      <input
        type="range"
        className="hud-range w-28 sm:w-36"
        min={0}
        max={100}
        step={1}
        value={pct}
        onChange={(e) =>
          useApp.getState().setStarCount((Number(e.target.value) / 100) * max)
        }
        aria-label="Starfield star count"
        aria-valuetext={`${value.toLocaleString()} of ${max.toLocaleString()} stars`}
      />
      <span className="w-12 text-right tabular-nums text-amber-200/90 sm:w-14">
        {formatStars(value)}
      </span>
      {!touch && (
        <span className="flex items-center gap-1" aria-hidden>
          <Key>−</Key>
          <Key>+</Key>
        </span>
      )}
    </label>
  )
}

function Settings() {
  return (
    <div className="flex flex-col items-center gap-3">
      <SettingsRow />
      <StarSlider />
    </div>
  )
}

function PlanetCard({
  planet,
  onWarp,
  aside,
  highlight = false,
}: {
  planet: PlanetDef
  onWarp: (id: string) => void
  aside?: React.ReactNode
  highlight?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onWarp(planet.id)}
      data-highlight={highlight || undefined}
      className={`panel corner group flex flex-col items-start gap-1.5 px-4 py-3 text-left transition hover:border-amber-300/50 ${highlight ? 'border-amber-300/40' : ''}`}
    >
      <span className="flex w-full items-center gap-2.5">
        <Dot color={planet.palette.atmosphere} />
        <span className="mono min-w-0 flex-1 break-words text-sm uppercase tracking-wider text-sky-100 group-hover:text-amber-200">
          {planet.name}
        </span>
        {aside}
      </span>
      <span className="mono flex w-full items-center justify-between gap-2 pl-[18px] text-xs uppercase tracking-wider text-sky-300/50">
        <span className="truncate">{planet.tags[0] ?? planet.type}</span>
        {planet.repo?.language && (
          <span className="shrink-0 text-sky-300/40">{planet.repo.language}</span>
        )}
      </span>
    </button>
  )
}

function ControlsGuide({ touch }: { touch: boolean }) {
  const items: [React.ReactNode, string][] = touch
    ? [
        [<Key>left stick</Key>, 'steer'],
        [<Key>thrust</Key>, 'fly'],
        [<Key>brake</Key>, 'slow / cancel autopilot'],
        [<Key>boost</Key>, 'speed'],
        [<Key>map</Key>, 'warp to a project'],
      ]
    : [
        [<><Key>W</Key><Key>S</Key></>, 'thrust / brake'],
        [<Key>mouse</Key>, 'steer'],
        [<><Key>A</Key><Key>D</Key></>, 'roll'],
        [<Key>shift</Key>, 'boost'],
        [<Key>M</Key>, 'map'],
        [<Key>esc</Key>, 'menu'],
      ]
  return (
    <ul className="mono flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-2.5 text-xs uppercase tracking-wider text-sky-200/60">
      {items.map(([keys, label]) => (
        <li key={label} className="flex items-center gap-1.5">
          {keys}
          <span className="ml-1">{label}</span>
        </li>
      ))}
    </ul>
  )
}

function TargetIndicator() {
  const rootRef = useRef<HTMLDivElement>(null)
  const bracketRef = useRef<HTMLDivElement>(null)
  const arrowRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLSpanElement>(null)
  const distRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    let shownId: string | null = null
    const v = new THREE.Vector3()
    const ndc = new THREE.Vector3()
    const hide = () => {
      if (rootRef.current) rootRef.current.style.opacity = '0'
    }
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const cam = sceneRef.camera
      const root = rootRef.current
      const bracket = bracketRef.current
      const arrow = arrowRef.current
      const label = labelRef.current
      if (!cam || !root || !bracket || !arrow || !label) return
      const s = useApp.getState()
      const id = s.warpTo ?? s.targetId
      const entry = id ? planetRegistry.get(id) : null
      const proj = id ? projectById(id) : null
      if (!s.locked || s.mapOpen || !id || !entry || !proj || (!s.warpTo && s.infoId === id)) {
        hide()
        return
      }

      if (shownId !== id) {
        shownId = id
        root.style.color = proj.palette.atmosphere
        if (nameRef.current) nameRef.current.textContent = proj.name
      }

      entry.object.getWorldPosition(v)
      const dist = v.distanceTo(cam.position)
      if (distRef.current) {
        distRef.current.textContent = formatDistance(Math.max(0, dist - entry.radius))
      }

      ndc.copy(v).project(cam)
      const behind = ndc.z > 1
      const nx = behind ? -ndc.x : ndc.x
      const ny = behind ? -ndc.y : ndc.y
      const w = window.innerWidth
      const h = window.innerHeight
      const m = 40
      const sx = (nx * 0.5 + 0.5) * w
      const sy = (1 - (ny * 0.5 + 0.5)) * h
      const lw = label.offsetWidth
      const lh = label.offsetHeight
      let lx: number
      let ly: number

      if (!behind && sx >= m && sx <= w - m && sy >= m && sy <= h - m) {
        const halfFov = (cam.fov * Math.PI) / 360
        const projR = (entry.radius / (dist * Math.tan(halfFov))) * (h / 2)
        const size = Math.max(28, Math.min(180, projR * 2 + 18))
        bracket.style.display = 'block'
        arrow.style.display = 'none'
        bracket.style.width = `${size}px`
        bracket.style.height = `${size}px`
        bracket.style.transform = `translate(${sx - size / 2}px, ${sy - size / 2}px)`
        lx = sx - lw / 2
        ly = sy + size / 2 + 8
      } else {
        const cx = w / 2
        const cy = h / 2
        let dx = sx - cx
        let dy = sy - cy
        if (Math.abs(dx) < 1e-3 && Math.abs(dy) < 1e-3) dy = 1
        const k = Math.min((cx - m / 2) / Math.abs(dx || 1e-6), (cy - m / 2) / Math.abs(dy || 1e-6))
        const ex = cx + dx * k
        const ey = cy + dy * k
        const angle = Math.atan2(dy, dx)
        bracket.style.display = 'none'
        arrow.style.display = 'block'
        arrow.style.transform = `translate(${ex}px, ${ey}px) rotate(${angle}rad)`
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const off = 22 + Math.abs(cos) * (lw / 2) + Math.abs(sin) * (lh / 2)
        lx = ex - cos * off - lw / 2
        ly = ey - sin * off - lh / 2
      }
      lx = Math.max(8, Math.min(w - lw - 8, lx))
      ly = Math.max(8, Math.min(h - lh - 8, ly))
      label.style.transform = `translate(${lx}px, ${ly}px)`
      root.style.opacity = '1'
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-20 transition-opacity duration-200"
      style={{ opacity: 0 }}
      aria-hidden
    >
      <div ref={bracketRef} className="absolute left-0 top-0" style={{ display: 'none' }}>
        <span className="absolute left-0 top-0 h-2.5 w-2.5 border-l border-t border-current" />
        <span className="absolute right-0 top-0 h-2.5 w-2.5 border-r border-t border-current" />
        <span className="absolute bottom-0 left-0 h-2.5 w-2.5 border-b border-l border-current" />
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 border-b border-r border-current" />
      </div>
      <div ref={arrowRef} className="absolute left-0 top-0" style={{ display: 'none' }}>
        <svg width="14" height="14" viewBox="-7 -7 14 14" className="-translate-x-1/2 -translate-y-1/2 overflow-visible">
          <path d="M7 0 L-5 -6 L-2 0 L-5 6 Z" fill="currentColor" />
        </svg>
      </div>
      <div
        ref={labelRef}
        className="mono absolute left-0 top-0 flex items-center gap-2 whitespace-nowrap text-xs uppercase tracking-[0.2em]"
      >
        <span ref={nameRef} className="text-sky-50 hud-glow" />
        <span ref={distRef} className="tabular-nums text-amber-200/90" />
      </div>
    </div>
  )
}

function Intro({ onWarp, touch }: { onWarp: (id: string) => void; touch: boolean }) {
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

  return (
    <div className="hud-scroll pointer-events-auto absolute inset-0 z-30 overflow-y-auto bg-black/60 backdrop-blur-[2px]">
      <div className="flex min-h-full flex-col items-center justify-center gap-7 px-5 py-8 sm:px-6">
        <header className="flex flex-col items-center text-center">
          <div className="mono mb-3 text-xs uppercase tracking-[0.4em] text-sky-300/70 hud-glow sm:text-sm sm:tracking-[0.5em]">
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
        </header>

        <ControlsGuide touch={touch} />

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => {
              startAudio()
              requestLock()
            }}
            className="mono panel corner px-12 py-3.5 text-sm uppercase tracking-[0.35em] text-amber-200 transition hover:text-white hover:border-amber-300/60 hud-glow"
          >
            Launch
          </button>
          {!touch && (
            <div className="mono text-[11px] uppercase tracking-[0.3em] text-sky-300/40">
              or press <Key>space</Key>
            </div>
          )}
        </div>

        <section className="w-full max-w-5xl" aria-labelledby="intro-planets">
          <h2
            id="intro-planets"
            className="mono mb-3 text-center text-xs uppercase tracking-[0.35em] text-sky-300/50"
          >
            Or autopilot straight to a project
          </h2>
          <div
            onKeyDown={onGridKeyDown}
            className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            {PLANETS.map((p) => (
              <PlanetCard key={p.id} planet={p} onWarp={onWarp} />
            ))}
          </div>
        </section>

        <Settings />
      </div>
    </div>
  )
}

function SystemMap({ onWarp, touch }: { onWarp: (id: string) => void; touch: boolean }) {
  const targetId = useApp((s) => s.targetId)
  const gridRef = useRef<HTMLDivElement>(null)
  const [distances, setDistances] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(PLANETS.map((p) => [p.id, surfaceDistance(p.id, motion.position)])),
  )

  const close = () => {
    useApp.getState().setMapOpen(false)
    requestLock()
  }

  useEffect(() => {
    const grid = gridRef.current
    const first =
      grid?.querySelector<HTMLButtonElement>('button[data-highlight]') ??
      grid?.querySelector<HTMLButtonElement>('button')
    first?.focus({ preventScroll: true })

    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyM' && e.code !== 'Escape') return
      e.preventDefault()
      useApp.getState().setMapOpen(false)
      if (e.code === 'KeyM') requestLock()
    }
    window.addEventListener('keydown', onKey)
    const timer = window.setInterval(() => {
      setDistances(
        Object.fromEntries(PLANETS.map((p) => [p.id, surfaceDistance(p.id, motion.position)])),
      )
    }, 500)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearInterval(timer)
    }
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-map-title"
      className="hud-scroll pointer-events-auto absolute inset-0 z-30 overflow-y-auto bg-black/75 backdrop-blur-[3px]"
    >
      <div className="flex min-h-full flex-col items-center justify-center px-5 py-10 sm:px-6">
        <div className="w-full max-w-5xl">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="system-map-title"
                className="mono text-sm uppercase tracking-[0.4em] text-sky-200/80 hud-glow"
              >
                System map
              </h2>
              <p className="mono mt-1 text-[11px] uppercase tracking-[0.25em] text-sky-300/50">
                Select a planet to autopilot there
              </p>
            </div>
            <button type="button" onClick={close} className={CHIP}>
              back to flight
              {!touch && <Key>M</Key>}
            </button>
          </div>
          <div
            ref={gridRef}
            onKeyDown={onGridKeyDown}
            className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            {PLANETS.map((p) => {
              const d = distances[p.id]
              const nearest = p.id === targetId
              return (
                <PlanetCard
                  key={p.id}
                  planet={p}
                  onWarp={onWarp}
                  highlight={nearest}
                  aside={
                    d != null && (
                      <span
                        className={`mono shrink-0 text-[11px] tabular-nums tracking-wider ${nearest ? 'text-amber-200/90' : 'text-sky-300/45'}`}
                      >
                        {formatDistance(d)}
                      </span>
                    )
                  }
                />
              )
            })}
          </div>

          <div className="mt-8">
            <Settings />
          </div>
        </div>
      </div>
    </div>
  )
}

function ResumePrompt() {
  const pointerFree = usePointerFree()
  const mapOpen = useApp((s) => s.mapOpen)
  const show = pointerFree && !mapOpen
  return (
    <div
      className={`absolute inset-x-0 top-[60%] flex justify-center transition-opacity duration-300 ${show ? 'opacity-100 delay-300' : 'opacity-0'}`}
      aria-hidden={!show}
    >
      <div className="panel corner mono px-5 py-2.5 text-xs uppercase tracking-[0.35em] text-amber-200/90 hud-glow">
        Click to resume flight
      </div>
    </div>
  )
}

function FlightHints({ hidden }: { hidden: boolean }) {
  return (
    <div
      className={`mono absolute bottom-5 left-5 hidden max-w-[calc(100vw-16rem)] flex-wrap items-center gap-x-4 gap-y-2 text-[11px] uppercase tracking-wider text-sky-300/55 transition-opacity duration-300 md:flex ${hidden ? 'opacity-0' : 'opacity-100'}`}
    >
      <span className="flex items-center gap-1"><Key>W</Key><Key>S</Key> thrust / brake</span>
      <span className="flex items-center gap-1"><Key>mouse</Key> steer</span>
      <span className="flex items-center gap-1"><Key>A</Key><Key>D</Key> roll</span>
      <span className="flex items-center gap-1"><Key>shift</Key> boost</span>
      <span className="flex items-center gap-1"><Key>R</Key> reset</span>
      <span className="flex items-center gap-1"><Key>M</Key> map &amp; settings</span>
      <span className="flex items-center gap-1"><Key>−</Key><Key>+</Key> stars</span>
      <span className="flex items-center gap-1"><Key>esc</Key> menu</span>
    </div>
  )
}

function AutopilotBanner({ touch }: { touch: boolean }) {
  const warpTo = useApp((s) => s.warpTo)
  const p = warpTo ? projectById(warpTo) : null
  if (!p) return null
  return (
    <div className="fade-in absolute inset-x-0 top-[24%] flex justify-center px-5 sm:top-[15%]">
      <div className="panel mono flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-[11px] uppercase tracking-[0.25em]">
        <span className="loading-pulse h-1.5 w-1.5 rounded-full bg-amber-300" />
        <span className="text-amber-200/90">Autopilot</span>
        <span className="flex items-center gap-2 text-sky-50">
          <Dot color={p.palette.atmosphere} />
          {p.name}
        </span>
        <span className="flex items-center gap-1.5 text-sky-300/50">
          {touch ? 'brake' : <Key>S</Key>} cancel
        </span>
      </div>
    </div>
  )
}

function InfoPanel({ touch }: { touch: boolean }) {
  const infoId = useApp((s) => s.infoId)
  const holdingId = useApp((s) => s.holdingId)
  const targetDistance = useApp((s) => s.targetDistance)
  const info = infoId ? projectById(infoId) : null
  if (!info) return null
  const stats = repoStats(info.repo)
  const holding = holdingId === info.id
  const color = info.palette.atmosphere

  return (
    <div
      className={`fade-in absolute ${touch ? 'left-1/2 top-36 w-[min(92vw,640px)] -translate-x-1/2' : 'left-1/2 top-44 w-[min(92vw,640px)] -translate-x-1/2 lg:top-auto lg:bottom-5 lg:left-5 lg:w-[min(calc(50vw-9rem),520px)] lg:translate-x-0'}`}
      role="status"
      aria-live="polite"
    >
      <div
        className="hud-scroll panel corner relative max-h-[52vh] overflow-y-auto px-5 py-4 sm:px-6 sm:py-5"
        style={{ background: 'rgba(6, 14, 26, 0.9)' }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, ${color}, transparent 70%)` }}
        />
        <div className="mono flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.3em]">
          <span className="flex items-center gap-2 text-amber-300/80">
            <Dot color={color} />
            Scan locked
          </span>
          <span className="text-right text-sky-300/50">
            {holding ? (
              <span className="flex items-center gap-1.5">
                holding orbit · {touch ? 'thrust' : <Key>W</Key>} to leave
              </span>
            ) : (
              formatDistance(Math.max(0, targetDistance - info.radius))
            )}
          </span>
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{info.name}</h2>
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
        <p className="mt-3 text-sm leading-relaxed text-sky-100/80 sm:text-base">
          {info.description}
        </p>
        {stats && (
          <div
            className="mono mt-3 flex flex-wrap items-center gap-x-2 text-xs uppercase tracking-wider text-sky-300/60"
            suppressHydrationWarning
          >
            <span className="text-sky-300/30">live</span>
            <span>{stats}</span>
          </div>
        )}
        <div className="mono mt-4 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-widest">
          <span className="min-w-0 truncate text-sky-300/50">
            {info.link.replace('https://', '')}
          </span>
          <a
            href={info.link}
            target="_blank"
            rel="noopener noreferrer"
            className={
              touch
                ? 'pointer-events-auto border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-amber-100 transition active:bg-amber-300/30'
                : 'pointer-events-auto flex items-center gap-2 text-amber-200/90 transition hover:text-white hud-glow'
            }
          >
            {!touch && <Key>enter</Key>}
            open project ↗
          </a>
        </div>
      </div>
    </div>
  )
}

function StarToast() {
  const quality = useApp((s) => s.quality)
  const starCount = useApp((s) => s.starCount)
  const max = starCeiling(quality)
  const pct = max > 0 ? Math.round((Math.min(max, starCount) / max) * 100) : 0
  return (
    <div className="toast absolute left-1/2 top-5 z-40 -translate-x-1/2" role="status">
      <div className="panel mono flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-[0.25em]">
        <span className="text-sky-300/60">stars</span>
        <span className="h-0.5 w-20 overflow-hidden bg-sky-300/15">
          <span className="block h-full bg-amber-300/90" style={{ width: `${pct}%` }} />
        </span>
        <span className="w-12 text-right tabular-nums text-amber-200/90">
          {formatStars(Math.min(max, starCount))}
        </span>
      </div>
    </div>
  )
}

export function HUD() {
  const locked = useApp((s) => s.locked)
  const infoId = useApp((s) => s.infoId)
  const speed = useApp((s) => s.speed)
  const muted = useApp((s) => s.muted)
  const reducedMotion = useApp((s) => s.reducedMotion)
  const requestWarp = useApp((s) => s.requestWarp)
  const setLocked = useApp((s) => s.setLocked)
  const cancelWarp = useApp((s) => s.cancelWarp)
  const mapOpen = useApp((s) => s.mapOpen)
  const touch = useTouch()
  const [starToast, setStarToast] = useState(0)

  useEffect(() => {
    if (!starToast) return
    const timer = window.setTimeout(() => setStarToast(0), 1600)
    return () => window.clearTimeout(timer)
  }, [starToast])

  useEffect(() => {
    useApp.getState().initSettings()
    return useApp.subscribe((s, prev) => {
      if (
        s.quality === prev.quality &&
        s.muted === prev.muted &&
        s.reducedMotion === prev.reducedMotion &&
        s.starCount === prev.starCount
      )
        return
      try {
        localStorage.setItem(SETTINGS_KEYS.quality, s.quality)
        localStorage.setItem(SETTINGS_KEYS.muted, s.muted ? '1' : '0')
        localStorage.setItem(SETTINGS_KEYS.motion, s.reducedMotion ? '0' : '1')
        localStorage.setItem(SETTINGS_KEYS.stars, String(s.starCount))
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
        if (state.locked && state.infoId && !state.mapOpen) {
          const p = projectById(state.infoId)
          if (p) window.open(p.link, '_blank', 'noopener')
        }
      } else if (e.code === 'KeyM') {
        const state = useApp.getState()
        if (!state.locked || state.mapOpen) return
        state.setMapOpen(true)
        requestUnlock()
      } else if (STAR_STEP_KEYS[e.code] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return
        e.preventDefault()
        stepStars(STAR_STEP_KEYS[e.code])
        setStarToast(performance.now())
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

  useEffect(() => {
    return useApp.subscribe((s, prev) => {
      if (s.warpTo && s.warpTo !== prev.warpTo) audioWarpWhoosh()
    })
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
      {starToast > 0 && <StarToast key={starToast} />}

      {locked ? (
        <>
          {/* crosshair */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="crosshair-dot h-1.5 w-1.5 rounded-full bg-amber-200/90" />
            <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/30" />
          </div>

          {touch && <TouchControls />}
          {!touch && <ResumePrompt />}
          {mapOpen && <SystemMap onWarp={handleWarp} touch={touch} />}

          {/* Top bar: identity (+ touch map/exit) on the left, radar on the
              right. Settings live in the system map — with the pointer locked
              they could not be clicked here anyway. */}
          <div className="absolute inset-x-5 top-5 flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col items-start gap-3">
              <div className="mono pt-1 text-xs uppercase tracking-[0.3em] text-sky-300/60 hud-glow sm:text-sm sm:tracking-[0.4em]">
                Aman Mehtar
              </div>
              {touch && (
                <div className="pointer-events-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => useApp.getState().setMapOpen(true)}
                    className={CHIP}
                  >
                    map
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      cancelWarp()
                      setLocked(false)
                    }}
                    className={CHIP}
                  >
                    exit
                  </button>
                </div>
              )}
            </div>

            <Radar />
          </div>

          <AutopilotBanner touch={touch} />

          {!touch && <FlightHints hidden={!!infoId} />}

          {/* bottom-right speed */}
          <div className="mono absolute bottom-5 right-5 w-44 text-right">
            <div className="flex items-baseline justify-end gap-2">
              <span className="tabular-nums text-3xl font-semibold leading-none text-sky-100/90 hud-glow">
                {speed}
              </span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-sky-300/50">u/s</span>
            </div>
            <div className="mt-2 h-0.5 w-full overflow-hidden bg-sky-300/10">
              <div
                className={`h-full bg-gradient-to-r transition-[width] duration-100 ${speed > 270 ? 'from-amber-400/60 to-amber-200/90' : 'from-sky-400/60 to-sky-200/90'}`}
                style={{ width: `${Math.min(100, (speed / 1100) * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-[0.15em] text-sky-300/40">
              <span>cruise 270</span>
              <span>boost 1100</span>
            </div>
          </div>

          <InfoPanel touch={touch} />
        </>
      ) : (
        <Intro onWarp={handleWarp} touch={touch} />
      )}
    </div>
  )
}
