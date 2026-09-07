export type QualityLevel = 'low' | 'medium' | 'high'

export const SETTINGS_KEYS = {
  quality: 'op:quality',
  muted: 'op:muted',
  motion: 'op:motion',
} as const

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
    multisampling: 2,
    dpr: [1, 1.5],
    skyUrl: '/sky/NightSkyHDRI008_4K.jpg',
  },
  high: {
    starFraction: 1,
    dustCount: 2400,
    multisampling: 4,
    dpr: [1, 2],
    skyUrl: '/sky/NightSkyHDRI008_8K.jpg',
  },
}

export const QUALITY_ORDER: QualityLevel[] = ['low', 'medium', 'high']

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
