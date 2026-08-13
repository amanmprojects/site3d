'use client'

import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '@/lib/noise'
import { createStarfieldMaterial } from '@/lib/geometry'

const FIELD_COUNT = 26000
const FIELD_BOX = 6000
const FAR_COUNT = 12000
const FAR_MIN = 15000
const FAR_MAX = 32000

function starColor(rng: () => number, out: Float32Array, i: number) {
  const t = rng()
  const b = 0.55 + rng() * 0.75
  if (t < 0.7) {
    out[i * 3] = 0.85 * b
    out[i * 3 + 1] = 0.9 * b
    out[i * 3 + 2] = b
  } else if (t < 0.85) {
    out[i * 3] = b
    out[i * 3 + 1] = 0.82 * b
    out[i * 3 + 2] = 0.6 * b
  } else {
    out[i * 3] = 0.62 * b
    out[i * 3 + 1] = 0.78 * b
    out[i * 3 + 2] = b
  }
}

function buildFieldGeometry() {
  const rng = mulberry32(20260813)
  const positions = new Float32Array(FIELD_COUNT * 3)
  const colors = new Float32Array(FIELD_COUNT * 3)
  const sizes = new Float32Array(FIELD_COUNT)
  const twinkles = new Float32Array(FIELD_COUNT)
  const phases = new Float32Array(FIELD_COUNT)

  for (let i = 0; i < FIELD_COUNT; i++) {
    positions[i * 3] = (rng() * 2 - 1) * FIELD_BOX
    positions[i * 3 + 1] = (rng() * 2 - 1) * FIELD_BOX
    positions[i * 3 + 2] = (rng() * 2 - 1) * FIELD_BOX
    starColor(rng, colors, i)
    sizes[i] = 2 + Math.pow(rng(), 2.2) * 4
    twinkles[i] = rng() > 0.68 ? 1 : 0
    phases[i] = rng() * Math.PI * 2
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geo.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkles, 1))
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  return geo
}

function buildShellGeometry() {
  const rng = mulberry32(20260814)
  const positions = new Float32Array(FAR_COUNT * 3)
  const colors = new Float32Array(FAR_COUNT * 3)
  const sizes = new Float32Array(FAR_COUNT)
  const twinkles = new Float32Array(FAR_COUNT)
  const phases = new Float32Array(FAR_COUNT)

  for (let i = 0; i < FAR_COUNT; i++) {
    const theta = rng() * Math.PI * 2
    const z = rng() * 2 - 1
    const r = FAR_MIN + rng() * (FAR_MAX - FAR_MIN)
    const s = Math.sqrt(1 - z * z)
    positions[i * 3] = r * s * Math.cos(theta)
    positions[i * 3 + 1] = r * s * Math.sin(theta)
    positions[i * 3 + 2] = r * z
    starColor(rng, colors, i)
    sizes[i] = 40 + Math.pow(rng(), 2.2) * 100
    twinkles[i] = rng() > 0.68 ? 1 : 0
    phases[i] = rng() * Math.PI * 2
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geo.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkles, 1))
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  return geo
}

export function Starfield() {
  const field = useMemo(buildFieldGeometry, [])
  const shell = useMemo(buildShellGeometry, [])
  const material = useMemo(createStarfieldMaterial, [])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <group>
      <points geometry={field} material={material} frustumCulled={false} />
      <points geometry={shell} material={material} frustumCulled={false} />
    </group>
  )
}
