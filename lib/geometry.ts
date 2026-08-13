import * as THREE from 'three'
import { mulberry32 } from './noise'

export function createAtmosphereMaterial(color: string, intensity: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vec3 viewDir = normalize(vViewPosition);
        float fres = 1.0 - abs(dot(viewDir, normalize(vNormal)));
        float core = pow(fres, 3.0) * uIntensity;
        float glow = pow(fres, 1.5) * uIntensity * 0.6;
        float haze = pow(fres, 0.6) * uIntensity * 0.3;
        gl_FragColor = vec4(uColor, 1.0) * (core + glow + haze);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  })
}

export function createRingTexture(inner: string, outer: string, seed: number) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = 8
  const ctx = canvas.getContext('2d')!
  const rng = mulberry32(seed)

  const innerCol = new THREE.Color(inner)
  const outerCol = new THREE.Color(outer)

  for (let x = 0; x < size; x++) {
    const t = x / (size - 1)
    let alpha = Math.sin(t * Math.PI) * 0.9
    alpha *= 0.35 + 0.65 * rng()

    const banded = 0.5 + 0.5 * Math.sin(t * 40 + rng() * 2)
    const col = innerCol.clone().lerp(outerCol, t)
    col.offsetHSL(0, 0, (banded - 0.5) * 0.35)

    const str = `rgba(${Math.round(col.r * 255)}, ${Math.round(col.g * 255)}, ${Math.round(col.b * 255)}, ${alpha})`
    ctx.fillStyle = str
    ctx.fillRect(x, 0, 1, 8)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function createStarfieldMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aTwinkle;
      attribute float aPhase;
      attribute vec3 aColor;
      uniform float uTime;
      varying vec3 vColor;
      varying float vTwinkle;
      varying float vFade;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float dist = -mvPosition.z;
        gl_PointSize = clamp(aSize * (320.0 / dist), 0.5, 28.0);
        gl_Position = projectionMatrix * mvPosition;
        vColor = aColor;
        vTwinkle = aTwinkle * (0.55 + 0.45 * sin(uTime * (1.2 + aPhase * 1.8) + aPhase * 40.0));
        vFade = 1.0 - smoothstep(20000.0, 60000.0, dist);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vTwinkle;
      varying float vFade;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p) * 2.0;
        float alpha = pow(smoothstep(1.0, 0.0, d), 2.0);
        vec3 col = vColor * (0.8 + vTwinkle);
        gl_FragColor = vec4(col, alpha * vFade);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}
