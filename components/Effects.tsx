'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { WarpBlur, WarpBlurEffect } from './WarpBlur'
import { motion } from '@/lib/motion'
import { useApp } from '@/lib/store'
import { QUALITY } from '@/lib/quality'

const WARP_MIN = 900
const WARP_FULL = 2600

export function Effects() {
  const quality = useApp((s) => s.quality)
  const reducedMotion = useApp((s) => s.reducedMotion)
  const warp = useRef<WarpBlurEffect | null>(null)

  useFrame((_, deltaRaw) => {
    const effect = warp.current
    if (!effect) return
    const delta = Math.min(deltaRaw, 0.05)
    const target = reducedMotion
      ? 0
      : THREE.MathUtils.smoothstep(motion.speed, WARP_MIN, WARP_FULL)
    const uniform = effect.uniforms.get('strength')!
    const current = uniform.value as number
    const k = 1 - Math.exp(-(target > current ? 6 : 60) * delta)
    uniform.value = current + (target - current) * k
  })

  return (
    <EffectComposer key={quality} multisampling={QUALITY[quality].multisampling}>
      <Bloom
        intensity={1.25}
        luminanceThreshold={0.85}
        luminanceSmoothing={0.35}
        mipmapBlur
      />
      <WarpBlur ref={warp} />
      {!reducedMotion && <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.04} />}
      <Vignette offset={0.35} darkness={0.85} />
    </EffectComposer>
  )
}
