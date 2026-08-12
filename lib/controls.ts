let lockImpl: (() => unknown) | null = null

export function setLockImpl(fn: () => unknown) {
  lockImpl = fn
}

export function requestLock() {
  const fn = lockImpl
  if (!fn) return
  try {
    const result = fn()
    if (result instanceof Promise) result.catch(() => {})
  } catch {
    // pointer lock can fail silently in some browsers; ignore
  }
}

export function requestUnlock() {
  if (document.pointerLockElement) document.exitPointerLock()
}
