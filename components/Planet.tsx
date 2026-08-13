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

const MODEL_URL = '/planets/various_planets.glb'

export function Planet({ planet }: { planet: PlanetDef }) {
  const revGroup = useRef<THREE.Group>(null)
  const spinGroup = useRef<THREE.Group>(null)
  const cloudRefs = useRef<THREE.Group[]>([])
  const requestWarp = useApp((s) => s.requestWarp)

  const { scene } = useGLTF(MODEL_URL)

  const model = useMemo(() => {
    const group = new THREE.Group()
    const center = new THREE.Vector3()
    const box = new THREE.Box3()
    cloudRefs.current = []
    for (const nodeName of planet.model) {
      const src = scene.getObjectByName(nodeName) as THREE.Group | null
      if (!src) continue
      const clone = src.clone(true) as THREE.Group
      clone.scale.setScalar(planet.radius)
      clone.updateMatrixWorld(true)
      box.setFromObject(clone).getCenter(center)
      clone.position.sub(center)
      group.add(clone)
      const hasCloud = src.children.some((c) => {
        const mesh = c as THREE.Mesh
        const mat = Array.isArray(mesh.material)
          ? mesh.material[0]
          : mesh.material
        return mesh.isMesh && mat?.transparent
      })
      if (hasCloud) cloudRefs.current.push(clone)
    }
    group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const mesh = o as THREE.Mesh
        mesh.castShadow = false
        mesh.receiveShadow = false
        mesh.frustumCulled = true
        const glow = planet.palette.emissive ?? planet.palette.atmosphere
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        mesh.material = mats.map((m) => {
          const mat = m.clone()
          if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            const std = mat as THREE.MeshStandardMaterial
            std.emissive.set(glow)
            std.emissiveIntensity = 0.3
          }
          return mat
        })
      }
    })
    return group
  }, [scene, planet])

  const atmosphere = useMemo(
    () => createAtmosphereMaterial(planet.palette.atmosphere, 1.6),
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
    if (spinGroup.current) {
      spinGroup.current.rotation.y += planet.spin * delta * 10
    }
    for (const cloud of cloudRefs.current) {
      cloud.rotation.y += delta * 0.08
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
