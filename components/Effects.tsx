'use client'

import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

export function Effects() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={1.25}
        luminanceThreshold={0.85}
        luminanceSmoothing={0.35}
        mipmapBlur
      />
      <Vignette offset={0.35} darkness={0.85} />
      <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.04} />
    </EffectComposer>
  )
}
