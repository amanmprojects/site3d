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
