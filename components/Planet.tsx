'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { PlanetDef } from '@/lib/planets'
import {
  buildPlanetGeometry,
  createAtmosphereMaterial,
  createRingTexture,
} from '@/lib/geometry'
import { planetRegistry } from '@/lib/planetRegistry'
import { useApp } from '@/lib/store'

export function Planet({ planet }: { planet: PlanetDef }) {
  const revGroup = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const requestWarp = useApp((s) => s.requestWarp)

  const geometry = useMemo(
    () =>
      buildPlanetGeometry({
        seed: planet.seed,
        radius: planet.radius,
        segments: planet.type === 'gas' ? 96 : 72,
        palette: planet.palette,
        type: planet.type,
      }),
    [planet],
  )

  const atmosphere = useMemo(
    () => createAtmosphereMaterial(planet.palette.atmosphere, 1.1),
    [planet.palette.atmosphere],
  )

  const ringTexture = useMemo(
    () =>
      planet.rings
        ? createRingTexture(planet.rings.inner, planet.rings.outer, planet.seed)
        : null,
    [planet],
  )

  useEffect(() => {
    if (revGroup.current) {
      planetRegistry.set(planet.id, {
        object: revGroup.current,
        radius: planet.radius,
      })
    }
    return () => {
      planetRegistry.delete(planet.id)
    }
  }, [planet])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const a = planet.phase + t * planet.speed
    if (revGroup.current) {
      revGroup.current.position.set(
        Math.cos(a) * planet.orbit,
        0,
        Math.sin(a) * planet.orbit,
      )
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += planet.spin * delta * 10
    }
  })

  const emissive = planet.palette.emissive

  return (
    <group ref={revGroup}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          roughness={0.9}
          metalness={0.05}
          emissive={emissive ?? '#000000'}
          emissiveIntensity={emissive ? 0.35 : 0}
        />
      </mesh>

      <mesh scale={1.09}>
        <sphereGeometry args={[planet.radius, 32, 32]} />
        <primitive object={atmosphere} attach="material" />
      </mesh>

      {ringTexture && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry
            args={[planet.radius * 1.5, planet.radius * 2.35, 128]}
          />
          <meshBasicMaterial
            map={ringTexture}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      <Html
        position={[0, planet.radius + 1.6, 0]}
        center
        distanceFactor={18}
        zIndexRange={[20, 0]}
      >
        <button
          type="button"
          className="planet-label"
          onClick={() => requestWarp(planet.id)}
        >
          {planet.name}
        </button>
      </Html>
    </group>
  )
}
