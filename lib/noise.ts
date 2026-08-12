export function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Noise3 = (x: number, y: number, z: number) => number

export function fbm(
  noise: Noise3,
  x: number,
  y: number,
  z: number,
  octaves: number,
) {
  let value = 0
  let amp = 0.5
  let freq = 1
  let total = 0
  for (let i = 0; i < octaves; i++) {
    value += noise(x * freq, y * freq, z * freq) * amp
    total += amp
    amp *= 0.5
    freq *= 2.02
  }
  return value / total
}

export function hashString(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
