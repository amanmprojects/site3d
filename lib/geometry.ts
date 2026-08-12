import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import { fbm, mulberry32 } from './noise'
import type { Palette, PlanetType } from './planets'

export function buildPlanetGeometry(opts: {
  seed: number
  radius: number
  segments: number
  palette: Palette
  type: PlanetType
}) {
  const { seed, radius, segments, palette, type } = opts
  const noise3D = createNoise3D(mulberry32(seed))
  const geo = new THREE.SphereGeometry(radius, segments, segments)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)

  const low = new THREE.Color(palette.low)
  const mid = new THREE.Color(palette.mid)
  const high = new THREE.Color(palette.high)
  const emissive = palette.emissive ? new THREE.Color(palette.emissive) : null
  const tmp = new THREE.Color()
  const dir = new THREE.Vector3()

  const reliefAmp = type === 'gas' ? 0.025 : 0.13
  const frequency = type === 'gas' ? 1.1 : 1.6
  const octaves = type === 'gas' ? 4 : 5

  for (let i = 0; i < pos.count; i++) {
    dir.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize()

    let e = fbm(noise3D, dir.x * frequency, dir.y * frequency, dir.z * frequency, octaves)
    e = e * 0.5 + 0.5

    if (type === 'gas') {
      const warp = fbm(noise3D, dir.x * 3, dir.y * 3, dir.z * 3, 3)
      const band = Math.sin(dir.y * 9 + warp * 2.4) * 0.5 + 0.5
      e = band * 0.7 + e * 0.3
    }

    if (e < 0.5) tmp.copy(low).lerp(mid, e * 2)
    else tmp.copy(mid).lerp(high, (e - 0.5) * 2)

    if (emissive && e > 0.55) {
      tmp.lerp(emissive, (e - 0.55) / 0.45)
    }

    colors[i * 3] = tmp.r
    colors[i * 3 + 1] = tmp.g
    colors[i * 3 + 2] = tmp.b

    const disp = (e - 0.5) * 2 * radius * reliefAmp
    const r = radius + disp
    pos.setXYZ(i, dir.x * r, dir.y * r, dir.z * r)
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

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
