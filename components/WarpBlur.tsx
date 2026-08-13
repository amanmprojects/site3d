'use client'

import { forwardRef, useMemo } from 'react'
import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const FRAGMENT = /* glsl */ `
  uniform float strength;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    if (strength < 0.0001) {
      outputColor = inputColor;
      return;
    }
    vec2 dir = uv - vec2(0.5);
    float dist = length(dir) * 2.0;
    if (dist < 0.002) {
      outputColor = inputColor;
      return;
    }
    vec2 base = dir / max(length(dir), 1e-6);
    float radius = strength * dist * 0.05;
    vec4 sum = vec4(0.0);
    float acc = 0.0;
    for (int i = 0; i < 16; i++) {
      float t = (float(i) / 15.0 - 0.5) * 2.0;
      vec2 p = clamp(uv + base * radius * t, vec2(0.0), vec2(1.0));
      float w = 1.0 - abs(t);
      sum += texture2D(inputBuffer, p) * w;
      acc += w;
    }
    outputColor = sum / acc;
  }
`

export class WarpBlurEffect extends Effect {
  constructor({ strength = 0 }: { strength?: number } = {}) {
    super('WarpBlurEffect', FRAGMENT, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([['strength', new Uniform(strength)]]),
    })
  }
}

export const WarpBlur = forwardRef<WarpBlurEffect, { strength?: number }>(
  function WarpBlur({ strength = 0 }, ref) {
    const effect = useMemo(() => new WarpBlurEffect({ strength }), [strength])
    return <primitive ref={ref} object={effect} dispose={null} />
  },
)
