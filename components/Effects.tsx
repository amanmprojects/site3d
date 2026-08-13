'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { WarpBlur, WarpBlurEffect } from './WarpBlur'
import { motion } from '@/lib/motion'

export function Effects() {
  const blurRef = useRef<WarpBlurEffect>(null)
  const cur = useRef(0)

  useFrame((_, deltaRaw) => {
    const delta = Math.min(deltaRaw, 0.05)
    const target = Math.min(1, motion.speed / 2000)
    const k = target > cur.current ? 6 : 60
    cur.current += (target - cur.current) * (1 - Math.exp(-k * delta))
    const strength = blurRef.current?.uniforms.get('strength')
    if (strength) strength.value = cur.current
  })

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={1.25}
        luminanceThreshold={0.85}
        luminanceSmoothing={0.35}
        mipmapBlur
      />
      <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.04} />
      <WarpBlur ref={blurRef} />
      <Vignette offset={0.35} darkness={0.85} />
    </EffectComposer>
  )
}
