'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

export function NightSky() {
  const ref = useRef<THREE.Mesh>(null)
  const texture = useTexture('/sky/NightSkyHDRI008_8K.jpg')
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.0035
  })

  return (
    <mesh ref={ref} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[2400, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
