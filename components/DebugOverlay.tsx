'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { debugEnabled, emptyStats, type RenderStats } from '@/lib/debug'

const UPDATE_MS = 250

function rendererName(gl: THREE.WebGLRenderer): string {
  try {
    const ctx = gl.getContext()
    const ext = ctx.getExtension('WEBGL_debug_renderer_info')
    return String(ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER))
  } catch {
    return 'unknown'
  }
}

/**
 * Frame-time and draw-call readout, shown only with `?debug=1`. Reports the
 * smoothed frame time, the worst frame since load, and what the renderer is
 * actually submitting — enough to tell a slow frame apart from a shading
 * artifact without attaching a profiler.
 */
export function DebugOverlay() {
  const gl = useThree((s) => s.gl)
  const enabled = debugEnabled()
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const stats = useRef<RenderStats>(emptyStats())
  const rows = useRef<Record<string, HTMLSpanElement | null>>({})
  const last = useRef(0)
  const shown = useRef(0)

  useEffect(() => {
    if (!enabled) return
    const el = document.createElement('div')
    el.style.cssText =
      'position:fixed;left:8px;bottom:8px;z-index:60;pointer-events:none;' +
      'font:12px/1.5 ui-monospace,monospace;color:#9fd8ff;background:rgba(6,14,26,.85);' +
      'border:1px solid rgba(120,180,255,.25);padding:8px 10px;white-space:pre;'
    document.body.appendChild(el)
    setHost(el)
    return () => {
      el.remove()
    }
  }, [enabled])

  useFrame(() => {
    if (!enabled) return
    const now = performance.now()
    if (!last.current) last.current = now
    const dt = now - last.current
    last.current = now

    const s = stats.current
    s.frameMs = s.frameMs ? s.frameMs * 0.9 + dt * 0.1 : dt
    s.worstMs = Math.max(s.worstMs, dt)
    if (now - shown.current < UPDATE_MS) return
    shown.current = now

    const info = gl.info
    s.fps = Math.round(1000 / Math.max(s.frameMs, 0.001))
    s.calls = info.render.calls
    s.triangles = info.render.triangles
    s.points = info.render.points
    s.programs = info.programs?.length ?? 0
    s.textures = info.memory.textures
    if (!s.renderer) s.renderer = rendererName(gl)

    const set = (k: string, v: string) => {
      const el = rows.current[k]
      if (el && el.textContent !== v) el.textContent = v
    }
    const ms = s.frameMs.toFixed(1)
    set('a', `frame   ${ms} ms   ${s.fps} fps`)
    set('b', `worst   ${s.worstMs.toFixed(1)} ms`)
    set('c', `calls   ${s.calls}`)
    set('d', `points  ${s.points.toLocaleString()}`)
    set('e', `tris    ${s.triangles.toLocaleString()}`)
    set('f', `gpu     ${s.programs} prog / ${s.textures} tex`)
  })

  if (!enabled || !host) return null
  return createPortal(
    <div>
      {['a', 'b', 'c', 'd', 'e', 'f'].map((k) => (
        <span key={k} ref={(el) => { rows.current[k] = el }} />
      ))}
      <br />
      <span ref={(el) => { rows.current.g = el }} />
    </div>,
    host,
  )
}
