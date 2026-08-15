import * as THREE from 'three'

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
        gl_PointSize = clamp(aSize * (1280.0 / dist), 0.5, 28.0);
        gl_Position = projectionMatrix * mvPosition;
        vColor = aColor;
        vTwinkle = aTwinkle * (0.55 + 0.45 * sin(uTime * (1.2 + aPhase * 1.8) + aPhase * 40.0));
        vFade = 1.0 - smoothstep(80000.0, 240000.0, dist);
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

export function createAtmosphereMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#ffffff') },
      uFade: { value: 1 },
      uPower: { value: 3.0 },
      uIntensity: { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uFade;
      uniform float uPower;
      uniform float uIntensity;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(0.0, dot(viewDir, vNormal)), uPower);
        float alpha = fresnel * uIntensity * uFade;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  })
}

export function createRingTexture(size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2
  const inner = size * 0.28
  const outer = size * 0.5
  const img = ctx.createImageData(size, size)
  const data = img.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const r = Math.sqrt(dx * dx + dy * dy)
      const i = (y * size + x) * 4
      if (r < inner || r > outer) continue
      const t = (r - inner) / (outer - inner)
      const band = 0.5 + 0.5 * Math.sin(t * 40.0)
      const gap = Math.abs(Math.sin(t * Math.PI * 1.0))
      const a = Math.max(0, gap) * (0.45 + 0.55 * band)
      const edge = Math.min(
        smoothstep(0, 0.06, t),
        smoothstep(1, 0.94, t),
      )
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = Math.round(a * edge * 255)
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}
