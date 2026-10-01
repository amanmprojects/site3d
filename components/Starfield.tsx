'use client'

import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '@/lib/noise'
import { createStarfieldMaterial } from '@/lib/geometry'
import { useApp } from '@/lib/store'
import { QUALITY, STAR_FIELD_MAX as FIELD_COUNT, STAR_SHELL_MAX as FAR_COUNT, starCeiling } from '@/lib/quality'

const FIELD_RADIUS = 48000
const FIELD_HALF_H = 10000
const FAR_MIN = 60000
const FAR_MAX = 128000

export function starColor(rng: () => number, out: Float32Array, i: number) {
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

function buildFieldGeometry(count: number) {
  const rng = mulberry32(20260813)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const twinkles = new Float32Array(count)
  const phases = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const theta = rng() * Math.PI * 2
    const r = FIELD_RADIUS * Math.sqrt(rng())
    positions[i * 3] = r * Math.cos(theta)
    positions[i * 3 + 1] = ((rng() + rng() + rng()) / 3 - 0.5) * 2 * FIELD_HALF_H
    positions[i * 3 + 2] = r * Math.sin(theta)
    starColor(rng, colors, i)
    sizes[i] = 2 + Math.pow(rng(), 2.2) * 6
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

function buildShellGeometry(count: number) {
  const rng = mulberry32(20260814)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const twinkles = new Float32Array(count)
  const phases = new Float32Array(count)

  for (let i = 0; i < count; i++) {
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
  const quality = useApp((s) => s.quality)
  const reducedMotion = useApp((s) => s.reducedMotion)
  const starCount = useApp((s) => s.starCount)
  const frac = QUALITY[quality].starFraction
  const field = useMemo(() => buildFieldGeometry(Math.floor(FIELD_COUNT * frac)), [frac])
  const shell = useMemo(() => buildShellGeometry(Math.floor(FAR_COUNT * frac)), [frac])
  const material = useMemo(createStarfieldMaterial, [])

  // The slider scales the draw range rather than rebuilding the buffers, so
  // dragging it never reallocates the 2.4M-point field.
  useEffect(() => {
    const ceiling = starCeiling(quality)
    const frac = ceiling > 0 ? Math.min(1, Math.max(0, starCount) / ceiling) : 0
    const fieldTotal = (field.getAttribute('position') as THREE.BufferAttribute).count
    const shellTotal = (shell.getAttribute('position') as THREE.BufferAttribute).count
    field.setDrawRange(0, Math.floor(fieldTotal * frac))
    shell.setDrawRange(0, Math.floor(shellTotal * frac))
  }, [starCount, quality, field, shell])

  useEffect(
    () => () => {
      field.dispose()
      shell.dispose()
    },
    [field, shell],
  )

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uTwinkle.value = reducedMotion ? 0 : 1
  })

  return (
    <group>
      <points geometry={field} material={material} frustumCulled={false} />
      <points geometry={shell} material={material} frustumCulled={false} />
    </group>
  )
}

