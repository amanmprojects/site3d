/** Opt-in render diagnostics, enabled with `?debug=1` in the URL. */

export const DEBUG_KEYS = ['debug'] as const

export function debugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return new URLSearchParams(window.location.search).get('debug') === '1'
  } catch {
    return false
  }
}

export interface RenderStats {
  /** Smoothed frame time in ms. */
  frameMs: number
  /** Worst frame time seen since the last reset. */
  worstMs: number
  fps: number
  calls: number
  triangles: number
  points: number
  programs: number
  textures: number
  renderer: string
}

export function emptyStats(renderer = ''): RenderStats {
  return {
    frameMs: 0,
    worstMs: 0,
    fps: 0,
    calls: 0,
    triangles: 0,
    points: 0,
    programs: 0,
    textures: 0,
    renderer,
  }
}
