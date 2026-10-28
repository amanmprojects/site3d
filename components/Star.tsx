'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { planetRegistry } from '@/lib/planetRegistry'

const MODEL_SCALE = 90 * 3.5
const GLOW_SIZE = 800 * 3.5
const SUN_CLEARANCE = 1.35
const EXTENT_INTERVAL = 0.5

const _sphere = new THREE.Sphere()
const _origin = new THREE.Vector3()

function meshExtent(model: THREE.Object3D, origin: THREE.Vector3) {
  let r = 0
  model.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere()
    _sphere.copy(mesh.geometry.boundingSphere!).applyMatrix4(mesh.matrixWorld)
    r = Math.max(r, _sphere.center.distanceTo(origin) + _sphere.radius)
  })
  return r
}

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
  const rootRef = useRef<THREE.Group>(null)
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

  const nextExtent = useRef(0)

  useEffect(() => {
    const root = rootRef.current
    const model = modelRef.current
    if (!root || !model) return
    root.updateWorldMatrix(true, true)
    planetRegistry.set('sun', {
      object: root,
      radius: meshExtent(model, root.getWorldPosition(_origin)) * SUN_CLEARANCE,
    })
    return () => {
      planetRegistry.delete('sun')
    }
  }, [])

  useFrame(({ clock }) => {
    const entry = planetRegistry.get('sun')
    const root = rootRef.current
    const model = modelRef.current
    if (!entry || !root || !model || clock.elapsedTime < nextExtent.current) return
    nextExtent.current = clock.elapsedTime + EXTENT_INTERVAL
    const r = meshExtent(model, root.getWorldPosition(_origin)) * SUN_CLEARANCE
    if (r > entry.radius) entry.radius = r
  })

  return (
    <group ref={rootRef}>
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
