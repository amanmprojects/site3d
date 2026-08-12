'use client'

import { Stars } from '@react-three/drei'

export function Starfield() {
  return (
    <Stars
      radius={600}
      depth={120}
      count={7000}
      factor={5}
      saturation={0}
      fade
      speed={0.4}
    />
  )
}
