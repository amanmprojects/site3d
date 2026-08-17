export const touchInput = {
  steerX: 0,
  steerY: 0,
  thrust: false,
  brake: false,
  boost: false,
}

let cached: boolean | null = null
export function isTouchDevice() {
  if (cached !== null) return cached
  if (typeof window === 'undefined') return false
  cached =
    'ontouchstart' in window ||
    (navigator.maxTouchPoints ?? 0) > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  return cached
}

export function resetTouchInput() {
  touchInput.steerX = 0
  touchInput.steerY = 0
  touchInput.thrust = false
  touchInput.brake = false
  touchInput.boost = false
}
