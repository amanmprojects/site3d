'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '@/lib/noise'
import { starColor } from './Starfield'
import { motion } from '@/lib/motion'

const DUST_COUNT = 2400
const DUST_RADIUS = 1200
const DUST_INNER = 150
const DUST_HALF = 6000
const RESPAWN_MIN = 3000
const RESPAWN_MAX = DUST_HALF

const _axis = new THREE.Vector3(0, 0, 1)
const _b1 = new THREE.Vector3()
const _b2 = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)
const RIGHT = new THREE.Vector3(1, 0, 0)
const rng = mulberry32(20260815)

function buildDustGeometry() {
  const rng = mulberry32(20260816)
  const positions = new Float32Array(DUST_COUNT * 3)
  const colors = new Float32Array(DUST_COUNT * 3)
  const sizes = new Float32Array(DUST_COUNT)
  for (let i = 0; i < DUST_COUNT; i++) {
    const theta = rng() * Math.PI * 2
    const r = DUST_INNER + rng() * (DUST_RADIUS - DUST_INNER)
    const s = (rng() * 2 - 1) * DUST_HALF
    positions[i * 3] = r * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(theta)
    positions[i * 3 + 2] = s
    starColor(rng, colors, i)
    sizes[i] = 2 + Math.pow(rng(), 2.2) * 5
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  return geo
}

function createDustMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSpeed: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute vec3 aColor;
      uniform float uSpeed;
      varying vec3 vColor;
      varying float vFade;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float dist = -mvPosition.z;
        gl_PointSize = clamp(aSize * (1280.0 / dist), 0.5, 28.0);
        gl_Position = projectionMatrix * mvPosition;
        vColor = aColor;
        vFade = smoothstep(60.0, 500.0, uSpeed);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vFade;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p) * 2.0;
        float alpha = pow(smoothstep(1.0, 0.0, d), 2.0);
        gl_FragColor = vec4(vColor, alpha * vFade);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

export function SpaceDust() {
  const posAttr = useRef<THREE.BufferAttribute | null>(null)
  const geometry = useMemo(() => {
    const geo = buildDustGeometry()
    posAttr.current = geo.getAttribute('position') as THREE.BufferAttribute
    return geo
  }, [])
  const material = useMemo(createDustMaterial, [])

  useFrame(() => {
    const speed = motion.speed
    material.uniforms.uSpeed.value = speed
    if (speed > 0.5) _axis.copy(motion.velocity).normalize()

    _b1.crossVectors(_axis, UP)
    if (_b1.lengthSq() < 1e-6) _b1.crossVectors(_axis, RIGHT)
    _b1.normalize()
    _b2.crossVectors(_axis, _b1)

    const pos = posAttr.current
    if (!pos) return
    const arr = pos.array as Float32Array
    const ship = motion.position
    let dirty = false
    for (let i = 0; i < DUST_COUNT; i++) {
      const dx = arr[i * 3] - ship.x
      const dy = arr[i * 3 + 1] - ship.y
      const dz = arr[i * 3 + 2] - ship.z
      const proj = dx * _axis.x + dy * _axis.y + dz * _axis.z
      if (proj > -DUST_HALF && proj < DUST_HALF) {
        const px = dx - _axis.x * proj
        const py = dy - _axis.y * proj
        const pz = dz - _axis.z * proj
        if (px * px + py * py + pz * pz <= DUST_RADIUS * DUST_RADIUS) continue
      }
      const theta = rng() * Math.PI * 2
      const r = DUST_INNER + rng() * (DUST_RADIUS - DUST_INNER)
      const s = RESPAWN_MIN + rng() * (RESPAWN_MAX - RESPAWN_MIN)
      const c = Math.cos(theta)
      const sn = Math.sin(theta)
      arr[i * 3] = ship.x + _axis.x * s + (_b1.x * c + _b2.x * sn) * r
      arr[i * 3 + 1] = ship.y + _axis.y * s + (_b1.y * c + _b2.y * sn) * r
      arr[i * 3 + 2] = ship.z + _axis.z * s + (_b1.z * c + _b2.z * sn) * r
      dirty = true
    }
    if (dirty) pos.needsUpdate = true
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
