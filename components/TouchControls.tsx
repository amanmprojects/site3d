'use client'

import { useEffect, useRef, useState } from 'react'
import { touchInput, resetTouchInput } from '@/lib/touchInput'
import { useApp } from '@/lib/store'

const STICK_RADIUS = 56

export function TouchControls() {
  const locked = useApp((s) => s.locked)
  const stickRef = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const stickId = useRef<number | null>(null)
  const stickCenter = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!locked) {
      resetTouchInput()
      setKnob({ x: 0, y: 0 })
      stickId.current = null
    }
  }, [locked])

  const onStickStart = (e: React.PointerEvent) => {
    if (stickId.current !== null) return
    e.preventDefault()
    stickId.current = e.pointerId
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const rect = stickRef.current!.getBoundingClientRect()
    stickCenter.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    moveStick(e.clientX, e.clientY)
  }

  const onStickMove = (e: React.PointerEvent) => {
    if (e.pointerId !== stickId.current) return
    e.preventDefault()
    moveStick(e.clientX, e.clientY)
  }

  const onStickEnd = (e: React.PointerEvent) => {
    if (e.pointerId !== stickId.current) return
    e.preventDefault()
    stickId.current = null
    setKnob({ x: 0, y: 0 })
    touchInput.steerX = 0
    touchInput.steerY = 0
  }

  const moveStick = (x: number, y: number) => {
    const dx = x - stickCenter.current.x
    const dy = y - stickCenter.current.y
    const len = Math.hypot(dx, dy)
    const clamped = Math.min(len, STICK_RADIUS)
    const nx = len > 0 ? (dx / len) * clamped : 0
    const ny = len > 0 ? (dy / len) * clamped : 0
    setKnob({ x: nx, y: ny })
    touchInput.steerX = nx / STICK_RADIUS
    touchInput.steerY = ny / STICK_RADIUS
  }

  const hold =
    (key: 'thrust' | 'brake' | 'boost') => (e: React.PointerEvent) => {
      e.preventDefault()
      touchInput[key] = true
    }
  const release =
    (key: 'thrust' | 'brake' | 'boost') => (e: React.PointerEvent) => {
      e.preventDefault()
      touchInput[key] = false
    }

  if (!locked) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none touch-none">
      {/* left virtual stick */}
      <div
        ref={stickRef}
        onPointerDown={onStickStart}
        onPointerMove={onStickMove}
        onPointerUp={onStickEnd}
        onPointerCancel={onStickEnd}
        className="pointer-events-auto absolute bottom-24 left-6 flex h-32 w-32 items-center justify-center rounded-full border border-sky-300/20 bg-sky-300/5"
      >
        <div
          className="h-14 w-14 rounded-full border border-amber-300/50 bg-amber-300/15"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      {/* right action buttons */}
      <div className="pointer-events-auto absolute bottom-24 right-6 flex flex-col items-end gap-3">
        <button
          type="button"
          onPointerDown={hold('boost')}
          onPointerUp={release('boost')}
          onPointerCancel={release('boost')}
          onContextMenu={(e) => e.preventDefault()}
          className="mono h-16 w-16 rounded-full border border-amber-300/50 bg-amber-300/15 text-xs uppercase tracking-widest text-amber-100 active:bg-amber-300/40"
        >
          boost
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onPointerDown={hold('brake')}
            onPointerUp={release('brake')}
            onPointerCancel={release('brake')}
            onContextMenu={(e) => e.preventDefault()}
            className="mono h-16 w-16 rounded-full border border-sky-300/40 bg-sky-300/10 text-xs uppercase tracking-widest text-sky-100 active:bg-sky-300/30"
          >
            brake
          </button>
          <button
            type="button"
            onPointerDown={hold('thrust')}
            onPointerUp={release('thrust')}
            onPointerCancel={release('thrust')}
            onContextMenu={(e) => e.preventDefault()}
            className="mono h-16 w-16 rounded-full border border-sky-300/40 bg-sky-300/10 text-xs uppercase tracking-widest text-sky-100 active:bg-sky-300/30"
          >
            thrust
          </button>
        </div>
      </div>
    </div>
  )
}
