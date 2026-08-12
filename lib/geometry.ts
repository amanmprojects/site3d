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
        float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.5);
        gl_FragColor = vec4(uColor, 1.0) * fresnel * uIntensity;
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
