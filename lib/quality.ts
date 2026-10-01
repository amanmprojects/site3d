export type QualityLevel = 'low' | 'medium' | 'high'

export const SETTINGS_KEYS = {
  quality: 'op:quality',
  muted: 'op:muted',
  motion: 'op:motion',
  stars: 'op:stars',
} as const

/** Geometry allocation size for space dust; the quality tier caps how many draw. */
export const DUST_MAX = 2400

/** Near-field and far-shell star budgets, at gfx high. */
export const STAR_FIELD_MAX = 2400000
export const STAR_SHELL_MAX = 60000

/** Ceiling for the starfield slider, across every quality level. */
export const STAR_MAX = STAR_FIELD_MAX + STAR_SHELL_MAX

export interface QualitySettings {
  starFraction: number
  dustCount: number
  multisampling: number
  dpr: [number, number]
  skyUrl: string
}

export const QUALITY: Record<QualityLevel, QualitySettings> = {
  low: {
    starFraction: 0.25,
    dustCount: 1000,
    multisampling: 0,
    dpr: [0.75, 1],
    skyUrl: '/sky/NightSkyHDRI008_2K.jpg',
  },
  medium: {
    starFraction: 0.5,
    dustCount: 1800,
    multisampling: 0,
    dpr: [1, 1.5],
    skyUrl: '/sky/NightSkyHDRI008_4K.jpg',
  },
  high: {
    starFraction: 1,
    dustCount: 2400,
    multisampling: 0,
    dpr: [1, 2],
    skyUrl: '/sky/NightSkyHDRI008_8K.jpg',
  },
}

export const QUALITY_ORDER: QualityLevel[] = ['low', 'medium', 'high']

/** Most stars the given quality tier will ever draw — the slider's ceiling. */
export function starCeiling(quality: QualityLevel): number {
  return Math.round(STAR_MAX * QUALITY[quality].starFraction)
}

/** Compact star count for the HUD: 2460000 -> "2.46M", 615000 -> "615k". */
export function formatStars(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 2)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(Math.round(n))
}

export function detectQuality(): QualityLevel {
  if (typeof window === 'undefined') return 'high'
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const cores = navigator.hardwareConcurrency ?? 8
  if (coarse || cores <= 4) return 'low'
  if (cores <= 6) return 'medium'
  return 'high'
}

export function detectReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
