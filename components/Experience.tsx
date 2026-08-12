'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Ship } from './Ship'
import { SolarSystem } from './SolarSystem'
import { Starfield } from './Starfield'
import { NightSky } from './NightSky'
import { Effects } from './Effects'

export function Experience() {
  return (
    <Canvas
      camera={{ position: [0, 30, 160], fov: 60, near: 0.1, far: 4000 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <ambientLight intensity={0.22} />
      <Suspense fallback={null}>
        <NightSky />
        <SolarSystem />
        <Starfield />
        <Ship />
        <Effects />
      </Suspense>
    </Canvas>
  )
}
