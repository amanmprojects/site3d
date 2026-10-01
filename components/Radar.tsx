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

      const sunX = -ship.x * scale
      const sunY = -ship.z * scale
      const sunD = Math.hypot(sunX, sunY)
      const sunMax = Math.min(w, h) / 2 - 6
      const sx = sunD > sunMax ? (sunX / sunD) * sunMax : sunX
      const sy = sunD > sunMax ? (sunY / sunD) * sunMax : sunY
      ctx.beginPath()
      ctx.fillStyle = '#ffb84d'
      ctx.globalAlpha = 0.95
      ctx.arc(sx, sy, 4.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.globalAlpha = 0.3
      ctx.arc(sx, sy, 7.5, 0, Math.PI * 2)
      ctx.fill()

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

      // Ship marker: drawn unrotated so the arrow points along the current
      // heading (the rotated context above handles everything else).
      ctx.beginPath()
      ctx.moveTo(0, -6.5)
      ctx.lineTo(5, 5.5)
      ctx.lineTo(0, 2.5)
      ctx.lineTo(-5, 5.5)
      ctx.closePath()
      ctx.fillStyle = '#ffd27a'
      ctx.fill()
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(10, 15, 25, 0.85)'
      ctx.stroke()
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [locked])

  if (!locked) return null

  return (
    <div className="pointer-events-none z-20 shrink-0">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label="Radar: an arrow shows the ship's heading; planets appear as colored dots relative to it"
        className="h-24 w-24 rounded-full border border-sky-300/20 bg-black/40 sm:h-[130px] sm:w-[130px]"
      />
      <div className="mono mt-1 text-center text-[9px] uppercase tracking-[0.3em] text-sky-300/40">
        radar
      </div>
    </div>
  )
}
