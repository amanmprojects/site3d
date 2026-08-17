import { create } from 'zustand'

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

  speed: number
  setSpeed: (n: number) => void

  muted: boolean
  toggleMuted: () => void
}

export const useApp = create<AppState>((set) => ({
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

  speed: 0,
  setSpeed: (n) => set((s) => (s.speed === n ? s : { speed: n })),

  muted: false,
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
}))
