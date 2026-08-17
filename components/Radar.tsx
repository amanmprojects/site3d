'use client'

import { useEffect, useRef } from 'react'
import { useApp } from '@/lib/store'
import { planetRegistry } from '@/lib/planetRegistry'
import { PLANETS } from '@/lib/planets'
import { motion } from '@/lib/motion'
import { sceneRef } from '@/lib/scene'

const SIZE = 130
const RANGE = 42000

export function Radar() {
  const locked = useApp((s) => s.locked)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!locked) return
    let raf = 0
    const ctx = canvasRef.current?.getContext('2d') ?? null
    if (!ctx) return

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const c = ctx.canvas
      const w = c.width
      const h = c.height
      const cx = w / 2
      const cy = h / 2
      ctx.clearRect(0, 0, w, h)

      const ship = motion.position
      const cam = sceneRef.camera
      const heading = cam ? Math.atan2(-cam.matrixWorld.elements[8], -cam.matrixWorld.elements[10]) : 0

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(-heading)

      const scale = (Math.min(w, h) / 2) / RANGE

      for (const p of PLANETS) {
        const entry = planetRegistry.get(p.id)
        if (!entry) continue
        const px = entry.object.position.x - ship.x
        const pz = entry.object.position.z - ship.z
        let x = px * scale
        let y = pz * scale
        const d = Math.hypot(x, y)
        const max = Math.min(w, h) / 2 - 4
        if (d > max) {
          x = (x / d) * max
          y = (y / d) * max
        }
        ctx.beginPath()
        ctx.fillStyle = p.palette.atmosphere
        ctx.globalAlpha = 0.85
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.restore()

      ctx.beginPath()
      ctx.arc(cx, cy, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#ffd27a'
      ctx.fill()
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [locked])

  if (!locked) return null

  return (
    <div className="pointer-events-none absolute right-5 top-5 z-20">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="rounded-full border border-sky-300/20 bg-black/40"
      />
      <div className="mono mt-1 text-center text-[9px] uppercase tracking-[0.3em] text-sky-300/40">
        radar
      </div>
    </div>
  )
}
