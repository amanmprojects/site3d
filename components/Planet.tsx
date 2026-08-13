'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { PlanetDef } from '@/lib/planets'
import {
  createAtmosphereMaterial,
  createRingTexture,
} from '@/lib/geometry'
import { planetRegistry } from '@/lib/planetRegistry'
import { useApp } from '@/lib/store'

const MODEL_URL = '/planets/planet_of_phoenix.glb'
const MODEL_NODE = 'Phoenix_LOD0__0'
const BODY_UNIT_RADIUS = 22

export function Planet({ planet }: { planet: PlanetDef }) {
  const revGroup = useRef<THREE.Group>(null)
  const spinGroup = useRef<THREE.Group>(null)
  const requestWarp = useApp((s) => s.requestWarp)

  const { scene } = useGLTF(MODEL_URL)

  const model = useMemo(() => {
    const group = new THREE.Group()
    const src = scene.getObjectByName(MODEL_NODE) as THREE.Mesh | null
    if (src) {
      const clone = src.clone(true) as THREE.Mesh
      clone.scale.setScalar(planet.radius / BODY_UNIT_RADIUS)
      clone.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(clone)
      const center = new THREE.Vector3()
      box.getCenter(center)
      clone.position.sub(center)
      clone.castShadow = false
      clone.receiveShadow = false
      clone.frustumCulled = true
      group.add(clone)
    }
    return group
  }, [scene, planet])

  const atmosphere = useMemo(
    () => createAtmosphereMaterial('#eef2f8', 0.7),
    [],
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
    if (spinGroup.current) {
      spinGroup.current.rotation.y += planet.spin * delta * 10
    }
    if (revGroup.current) {
      const dist = state.camera.position.distanceTo(revGroup.current.position)
      atmosphere.uniforms.uFade.value = THREE.MathUtils.smoothstep(
        dist,
        planet.radius * 2,
        planet.radius * 10,
      )
    }
  })

  return (
    <group ref={revGroup}>
      <group ref={spinGroup}>
        <primitive object={model} />
      </group>

      <mesh scale={1.45}>
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
        distanceFactor={planet.radius * 6.5}
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
