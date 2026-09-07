import { create } from 'zustand'
import { detectQuality, detectReducedMotion, QUALITY_ORDER, SETTINGS_KEYS, type QualityLevel } from './quality'

interface AppState {
  locked: boolean
  setLocked: (v: boolean) => void

  targetId: string | null
  targetDistance: number
  setTarget: (id: string | null, distance: number) => void

  infoId: string | null
  setInfo: (id: string | null) => void

  warpTo: string | null
  requestWarp: (id: string) => void
  cancelWarp: () => void

  mapOpen: boolean
  setMapOpen: (v: boolean) => void

  speed: number
  setSpeed: (n: number) => void

  muted: boolean
  toggleMuted: () => void

  quality: QualityLevel
  setQuality: (q: QualityLevel) => void
  qualityReady: boolean
  initSettings: () => void

  reducedMotion: boolean
  setReducedMotion: (v: boolean) => void
}

export const useApp = create<AppState>((set, get) => ({
  locked: false,
  setLocked: (v) => set({ locked: v }),

  targetId: null,
  targetDistance: 0,
  setTarget: (id, distance) =>
    set((s) =>
      s.targetId === id && s.targetDistance === distance
        ? s
        : { targetId: id, targetDistance: distance },
    ),

  infoId: null,
  setInfo: (id) => set((s) => (s.infoId === id ? s : { infoId: id })),

  warpTo: null,
  requestWarp: (id) => set({ warpTo: id }),
  cancelWarp: () => set({ warpTo: null }),

  mapOpen: false,
  setMapOpen: (v) => set({ mapOpen: v }),

  speed: 0,
  setSpeed: (n) => set((s) => (s.speed === n ? s : { speed: n })),

  muted: false,
  toggleMuted: () => set((s) => ({ muted: !s.muted })),

  quality: 'high',
  setQuality: (q) => set({ quality: q }),
  qualityReady: false,
  initSettings: () => {
    if (get().qualityReady) return
    let quality = detectQuality()
    try {
      const stored = localStorage.getItem(SETTINGS_KEYS.quality)
      if (stored && QUALITY_ORDER.includes(stored as QualityLevel)) {
        quality = stored as QualityLevel
      }
    } catch {
      /* private mode */
    }
    let muted = false
    try {
      muted = localStorage.getItem(SETTINGS_KEYS.muted) === '1'
    } catch {
      /* private mode */
    }
    let reducedMotion = detectReducedMotion()
    try {
      reducedMotion = reducedMotion || localStorage.getItem(SETTINGS_KEYS.motion) === '0'
    } catch {
      /* private mode */
    }
    set({ quality, muted, reducedMotion, qualityReady: true })
  },

  reducedMotion: false,
  setReducedMotion: (v) => set({ reducedMotion: v }),
}))
