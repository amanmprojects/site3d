'use client'

import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { Ship } from './Ship'
import { SolarSystem } from './SolarSystem'
import { Starfield } from './Starfield'
import { SpaceDust } from './SpaceDust'
import { NightSky } from './NightSky'
import { Effects } from './Effects'
import { useApp } from '@/lib/store'
import { PLANETS } from '@/lib/planets'
import { QUALITY } from '@/lib/quality'

if (webglSupported()) {
  useGLTF.preload('/planets/planet_of_phoenix.glb')
  useGLTF.preload('/ship/ship.glb')
  useGLTF.preload('/sun/stroming_sun.glb')
}

function WebGLFallback() {
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 overflow-y-auto bg-black px-6 py-10">
      <div className="flex min-h-full flex-col items-center justify-center text-center">
        <div className="mono text-sm uppercase tracking-[0.5em] text-sky-300/60 hud-glow">
          Orbital Portfolio
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          WebGL is unavailable
        </h1>
        <p className="mono mt-4 max-w-md text-sm uppercase leading-relaxed tracking-wider text-sky-100/60">
          This portfolio is a 3D flight sim — your browser or GPU driver blocked
          WebGL. Enable hardware acceleration or try another browser, or browse
          the plain project list below.
        </p>
        <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
          {PLANETS.map((p) => (
            <a
              key={p.id}
              href={p.link}
              target="_blank"
              rel="noopener noreferrer"
              className="panel corner group flex flex-col items-start gap-1 px-4 py-3 text-left transition hover:border-amber-300/50"
            >
              <span className="mono text-sm uppercase tracking-widest text-sky-100 group-hover:text-amber-200">
                {p.name}
              </span>
              <span className="mono truncate text-xs uppercase tracking-wider text-sky-300/50">
                {p.tags[0] ?? p.type}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function webglSupported() {
  try {
    const probe = document.createElement('canvas')
    return !!(probe.getContext('webgl2') ?? probe.getContext('webgl'))
  } catch {
    return false
  }
}

export function Experience() {
  const quality = useApp((s) => s.quality)
  const qualityReady = useApp((s) => s.qualityReady)
  const [noWebGL, setNoWebGL] = useState(false)

  useEffect(() => {
    if (!webglSupported()) setNoWebGL(true)
  }, [])

  if (noWebGL) return <WebGLFallback />

  return (
    <Canvas
      camera={{ position: [0, 90, 480], fov: 60, near: 0.1, far: 240000 }}
      dpr={QUALITY[quality].dpr}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <ambientLight intensity={0.22} />
      <Suspense fallback={null}>
        {qualityReady && <NightSky />}
        <SolarSystem />
        {qualityReady && <Starfield />}
        <SpaceDust />
        <Ship />
        <Effects />
      </Suspense>
    </Canvas>
  )
}
