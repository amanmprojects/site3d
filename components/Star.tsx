'use client'

import { useMemo } from 'react'
import { createAtmosphereMaterial } from '@/lib/geometry'

export function Star() {
  const innerAtmo = useMemo(() => createAtmosphereMaterial('#ffb84d', 1.4), [])
  const outerAtmo = useMemo(() => createAtmosphereMaterial('#ff7a1a', 0.7), [])

  return (
    <group>
      <mesh>
        <sphereGeometry args={[6, 64, 64]} />
        <meshBasicMaterial color="#fff3c4" toneMapped={false} />
      </mesh>
      <mesh scale={1.35}>
        <sphereGeometry args={[6, 32, 32]} />
        <primitive object={innerAtmo} attach="material" />
      </mesh>
      <mesh scale={1.9}>
        <sphereGeometry args={[6, 32, 32]} />
        <primitive object={outerAtmo} attach="material" />
      </mesh>
      <pointLight color="#fff0d0" intensity={3} decay={0} />
    </group>
  )
}
