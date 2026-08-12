import type { Object3D } from 'three'

export interface PlanetWorld {
  object: Object3D
  radius: number
}

export const planetRegistry = new Map<string, PlanetWorld>()
