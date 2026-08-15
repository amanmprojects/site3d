'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { PlanetDef, PlanetType } from '@/lib/planets'
import { planetRegistry } from '@/lib/planetRegistry'
import { useApp } from '@/lib/store'
import { createAtmosphereMaterial, createRingTexture } from '@/lib/geometry'

const MODEL_URL = '/planets/planet_of_phoenix.glb'
const MODEL_NODE = 'Phoenix_LOD0__0'
const BODY_UNIT_RADIUS = 22

interface TypePreset {
  roughness: number
  metalness: number
  emissiveBase: number
  toneMapped: boolean
  pulse: boolean
}

const TYPE_PRESETS: Record<PlanetType, TypePreset> = {
  rocky: { roughness: 0.95, metalness: 0.05, emissiveBase: 0.0, toneMapped: true, pulse: false },
  gas: { roughness: 0.7, metalness: 0.0, emissiveBase: 0.18, toneMapped: true, pulse: false },
  ice: { roughness: 0.25, metalness: 0.15, emissiveBase: 0.12, toneMapped: true, pulse: false },
  lava: { roughness: 0.8, metalness: 0.0, emissiveBase: 1.5, toneMapped: false, pulse: true },
  ocean: { roughness: 0.35, metalness: 0.1, emissiveBase: 0.1, toneMapped: true, pulse: false },
  tech: { roughness: 0.5, metalness: 0.4, emissiveBase: 1.1, toneMapped: false, pulse: true },
}

const _world = new THREE.Vector3()
const _white = new THREE.Color('#ffffff')

function tintBodyMaterial(mat: THREE.Material, planet: PlanetDef, preset: TypePreset) {
  const m = mat as THREE.MeshStandardMaterial
  const mid = new THREE.Color(planet.palette.mid)
  if (m.isMeshStandardMaterial) {
    m.color.copy(mid).lerp(_white, 0.4)
    m.roughness = preset.roughness
    m.metalness = preset.metalness
    const emissiveColor = planet.palette.emissive ?? planet.palette.atmosphere
    m.emissive = new THREE.Color(emissiveColor)
    m.emissiveIntensity = preset.emissiveBase
    m.toneMapped = preset.toneMapped
  } else if ('color' in m && m.color) {
    m.color.copy(mid).lerp(_white, 0.4)
  }
}

function buildRingGeometry(inner: number, outer: number, segments = 128) {
  const geo = new THREE.RingGeometry(inner, outer, segments, 1)
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    uv.setXY(i, 0.5 + x / (2 * outer), 0.5 + y / (2 * outer))
  }
  uv.needsUpdate = true
  return geo
}

export function Planet({ planet }: { planet: PlanetDef }) {
  const revGroup = useRef<THREE.Group>(null)
  const spinGroup = useRef<THREE.Group>(null)
  const atmoMatRef = useRef<THREE.ShaderMaterial | null>(null)
  const requestWarp = useApp((s) => s.requestWarp)

  const { scene } = useGLTF(MODEL_URL)

  const { model, bodyMats, preset } = useMemo(() => {
    const group = new THREE.Group()
    const p = TYPE_PRESETS[planet.type]
    const src = scene.getObjectByName(MODEL_NODE) as THREE.Mesh | null
    const mats: THREE.MeshStandardMaterial[] = []
    if (src) {
      const clone = src.clone(true) as THREE.Mesh
      clone.scale.setScalar(planet.radius / BODY_UNIT_RADIUS)
      clone.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(clone)
      const center = new THREE.Vector3()
      box.getCenter(center)
      clone.position.sub(center)
      clone.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        const arr = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        const next = arr.map((mat) => {
          if (!mat) return mat
          const c = mat.clone()
          tintBodyMaterial(c, planet, p)
          if ((c as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            mats.push(c as THREE.MeshStandardMaterial)
          }
          return c
        })
        mesh.material = Array.isArray(mesh.material) ? next : next[0]
      })
      clone.castShadow = false
      clone.receiveShadow = false
      clone.frustumCulled = true
      group.add(clone)
    }
    return { model: group, bodyMats: mats, preset: p }
  }, [scene, planet])

  const atmoMat = useMemo(() => {
    const m = createAtmosphereMaterial()
    m.uniforms.uColor.value = new THREE.Color(planet.palette.atmosphere)
    m.uniforms.uIntensity.value = planet.type === 'rocky' ? 0.5 : 1.0
    return m
  }, [planet])

  const ringTex = useMemo(
    () => (planet.rings ? createRingTexture(512) : null),
    [planet.rings],
  )
  const ringGeo = useMemo(
    () =>
      planet.rings
        ? buildRingGeometry(planet.radius * 1.4, planet.radius * 2.2)
        : null,
    [planet.rings, planet.radius],
  )

  useEffect(() => {
    atmoMatRef.current = atmoMat
    return () => {
      atmoMat.dispose()
      ringTex?.dispose()
      ringGeo?.dispose()
    }
  }, [atmoMat, ringTex, ringGeo])

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
      spinGroup.current.rotation.y += planet.spin * delta * 5
    }

    if (revGroup.current && atmoMatRef.current) {
      revGroup.current.getWorldPosition(_world)
      const dist = state.camera.position.distanceTo(_world)
      const fade = THREE.MathUtils.smoothstep(dist, planet.radius * 2, planet.radius * 10)
      atmoMatRef.current.uniforms.uFade.value = fade
    }

    if (preset.pulse) {
      const flicker = 0.8 + 0.2 * Math.sin(t * (planet.type === 'lava' ? 3 : 2) + planet.seed)
      for (const m of bodyMats) m.emissiveIntensity = preset.emissiveBase * flicker
    }
  })

  return (
    <group ref={revGroup}>
      <group ref={spinGroup}>
        <primitive object={model} />
      </group>

      <mesh material={atmoMat} scale={1.12} renderOrder={2}>
        <sphereGeometry args={[planet.radius, 32, 32]} />
      </mesh>

      {ringTex && ringGeo && (
        <mesh geometry={ringGeo} rotation={[-1.15, 0.4, 0]} renderOrder={1}>
          <meshBasicMaterial
            map={ringTex}
            color={planet.palette.high}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
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
