'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const MODEL_SCALE = 90 * 3.5
const GLOW_SIZE = 800 * 3.5

function createGlowTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255, 210, 120, 1)')
  g.addColorStop(0.18, 'rgba(255, 154, 42, 0.7)')
  g.addColorStop(0.4, 'rgba(255, 122, 26, 0.3)')
  g.addColorStop(0.65, 'rgba(255, 95, 15, 0.12)')
  g.addColorStop(0.85, 'rgba(255, 85, 10, 0.04)')
  g.addColorStop(1, 'rgba(255, 80, 10, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function Star() {
  const modelRef = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF('/sun/stroming_sun.glb')
  const { actions } = useAnimations(animations, modelRef)

  const glowTexture = useMemo(() => createGlowTexture(), [])

  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const mat = mesh.material as THREE.MeshPhysicalMaterial
      mat.emissive = new THREE.Color('#ff9a2a')
      mat.emissiveIntensity = 2.5
      mat.toneMapped = false
      mat.blending = THREE.AdditiveBlending
      mat.depthWrite = false
      mat.opacity = 0.05
    })
  }, [scene])

  useEffect(() => {
    const clip = animations[0]
    if (!clip) return
    const action = actions[clip.name]
    if (action) action.reset().play()
  }, [animations, actions])

  return (
    <group>
      <group ref={modelRef} scale={MODEL_SCALE}>
        <primitive object={scene} />
      </group>
      <sprite scale={[GLOW_SIZE, GLOW_SIZE, 1]}>
        <spriteMaterial
          map={glowTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      <pointLight color="#fff0d0" intensity={3.5} decay={0} />
    </group>
  )
}
