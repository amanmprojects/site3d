'use client'

import { useMemo } from 'react'
import { Line } from '@react-three/drei'

export function OrbitLine({ radius }: { radius: number }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = []
    const seg = 160
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2
      pts.push([Math.cos(a) * radius, 0, Math.sin(a) * radius])
    }
    return pts
  }, [radius])

  return (
    <Line
      points={points}
      color="#e6ecff"
      transparent
      opacity={0.07}
      lineWidth={1}
    />
  )
}
