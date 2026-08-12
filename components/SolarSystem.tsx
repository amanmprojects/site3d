'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PLANETS } from '@/lib/planets'
import { planetRegistry } from '@/lib/planetRegistry'
import { useApp } from '@/lib/store'
import { Star } from './Star'
import { Planet } from './Planet'
import { OrbitLine } from './OrbitLine'

const _world = new THREE.Vector3()

export function SolarSystem() {
  const setTarget = useApp((s) => s.setTarget)
  const setInfo = useApp((s) => s.setInfo)
  const lastTarget = useRef<string | null>(null)
  const lastDist = useRef(-1)
  const lastInfo = useRef<string | null>(null)

  useFrame(({ camera }) => {
    let nearestId: string | null = null
    let nearestDist = Infinity

    for (const p of PLANETS) {
      const entry = planetRegistry.get(p.id)
      if (!entry) continue
      entry.object.getWorldPosition(_world)
      const d = camera.position.distanceTo(_world)
      if (d < nearestDist) {
        nearestDist = d
        nearestId = p.id
      }
    }

    if (nearestId) {
      const rounded = Math.round(nearestDist)
      if (lastTarget.current !== nearestId || lastDist.current !== rounded) {
        lastTarget.current = nearestId
        lastDist.current = rounded
        setTarget(nearestId, rounded)
      }

      const p = PLANETS.find((x) => x.id === nearestId)!
      const inRange = nearestDist < p.radius * 12 + 40
      const infoId = inRange ? nearestId : null
      if (lastInfo.current !== infoId) {
        lastInfo.current = infoId
        setInfo(infoId)
      }
    } else {
      setTarget(null, 0)
      setInfo(null)
      lastTarget.current = null
      lastDist.current = -1
      lastInfo.current = null
    }
  })

  return (
    <group>
      <Star />
      {PLANETS.map((p) => (
        <group key={p.id} rotation={[p.inclination[0], 0, p.inclination[1]]}>
          <OrbitLine radius={p.orbit} />
          <Planet planet={p} />
        </group>
      ))}
    </group>
  )
}
