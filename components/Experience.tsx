'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { Ship } from './Ship'
import { SolarSystem } from './SolarSystem'
import { Starfield } from './Starfield'
import { NightSky } from './NightSky'
import { Effects } from './Effects'

useGLTF.preload('/planets/various_planets.glb')
useGLTF.preload('/ship/ship.glb')
useGLTF.preload('/sun/stroming_sun.glb')
useTexture.preload('/sky/NightSkyHDRI008_8K.jpg')

export function Experience() {
  return (
    <Canvas
      camera={{ position: [0, 90, 480], fov: 60, near: 0.1, far: 8000 }}
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
