'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useApp } from '@/lib/store'
import { QUALITY } from '@/lib/quality'

export function NightSky() {
  const ref = useRef<THREE.Mesh>(null)
  const reducedMotion = useApp((s) => s.reducedMotion)
  const quality = useApp((s) => s.quality)
  const texture = useTexture(QUALITY[quality].skyUrl)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.rotation.y += delta * (reducedMotion ? 0.0005 : 0.0035)
  })

  return (
    <mesh ref={ref} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[180000, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
