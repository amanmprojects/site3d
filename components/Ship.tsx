'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useApp } from '@/lib/store'
import { setLockImpl } from '@/lib/controls'
import { planetRegistry } from '@/lib/planetRegistry'
import { sceneRef } from '@/lib/scene'

const keys = {
  fwd: false,
  back: false,
  left: false,
  right: false,
  up: false,
  down: false,
  rollL: false,
  rollR: false,
  boost: false,
}

const HOME = new THREE.Vector3(0, 90, 480)

const _fwd = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)
const _acc = new THREE.Vector3()
const _tmp = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _hold = new THREE.Vector3()
const _toHold = new THREE.Vector3()
const _target = new THREE.Vector3()
const _offset = new THREE.Vector3()
const _camPos = new THREE.Vector3()
const _shipPos = new THREE.Vector3()
const _q = new THREE.Quaternion()

const CHASE_OFFSET = new THREE.Vector3(0, 1.6, 8)
const FWD = new THREE.Vector3(0, 0, -1)

const MODEL_SCALE = 0.42
const MODEL_ROTATION: [number, number, number] = [0, Math.PI, 0]

export function Ship() {
  const { camera, gl } = useThree()
  const shipRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)

  const vel = useRef(new THREE.Vector3())
  const euler = useRef(new THREE.Euler(-0.18, 0, 0, 'YXZ'))
  const vis = useRef({ thrust: 0 })
  const animAction = useRef<THREE.AnimationAction | null>(null)
  const camPos = useRef(new THREE.Vector3())
  const camQuat = useRef(new THREE.Quaternion())
  const camInit = useRef(false)

  const setLocked = useApp((s) => s.setLocked)
  const setSpeed = useApp((s) => s.setSpeed)
  const warpTo = useApp((s) => s.warpTo)
  const cancelWarp = useApp((s) => s.cancelWarp)

  const { scene, animations } = useGLTF('/ship/ship.glb')
  const { actions } = useAnimations(animations, modelRef)

  useEffect(() => {
    const clip = animations[0]
    if (!clip) return
    const action = actions[clip.name]
    if (action) {
      animAction.current = action
      action.reset().play()
    }
  }, [animations, actions])

  useEffect(() => {
    sceneRef.camera = camera as THREE.PerspectiveCamera
    setLockImpl(() => gl.domElement.requestPointerLock())

    const makeKeyHandler = (down: boolean) => (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.fwd = down
          break
        case 'KeyS':
        case 'ArrowDown':
          keys.back = down
          break
        case 'KeyA':
        case 'ArrowLeft':
          keys.left = down
          break
        case 'KeyD':
        case 'ArrowRight':
          keys.right = down
          break
        case 'Space':
          keys.up = down
          break
        case 'ControlLeft':
        case 'KeyC':
          keys.down = down
          break
        case 'KeyQ':
          keys.rollL = down
          break
        case 'KeyE':
          keys.rollR = down
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.boost = down
          break
        case 'KeyR':
          if (down) {
            shipRef.current?.position.copy(HOME)
            vel.current.set(0, 0, 0)
            euler.current.set(-0.18, 0, 0, 'YXZ')
          }
          break
        default:
          break
      }
    }
    const kd = makeKeyHandler(true)
    const ku = makeKeyHandler(false)

    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return
      euler.current.y -= e.movementX * 0.0022
      euler.current.x -= e.movementY * 0.0022
      euler.current.x = Math.max(-1.45, Math.min(1.45, euler.current.x))
    }

    const onLockChange = () => {
      setLocked(document.pointerLockElement === gl.domElement)
    }

    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    window.addEventListener('mousemove', onMove)
    document.addEventListener('pointerlockchange', onLockChange)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('pointerlockchange', onLockChange)
      sceneRef.camera = null
    }
  }, [camera, gl, setLocked])

  useFrame((_, deltaRaw) => {
    const delta = Math.min(deltaRaw, 0.05)
    const locked = document.pointerLockElement === gl.domElement
    const ship = shipRef.current
    if (!ship) return

    ship.quaternion.setFromEuler(euler.current)

    if (warpTo) {
      const entry = planetRegistry.get(warpTo)
      if (entry) {
        entry.object.getWorldPosition(_tmp)
        _dir.copy(_tmp).sub(ship.position).normalize()
        const holdDist = entry.radius * 4 + 18
        _hold.copy(_tmp).addScaledVector(_dir, holdDist)

        _toHold.copy(_hold).sub(ship.position)
        const dist = _toHold.length()
        if (dist < holdDist + 2) {
          cancelWarp()
        } else {
          const step = Math.min(dist, 160 * delta * 6)
          ship.position.addScaledVector(_toHold.normalize(), step)
          _target.copy(_tmp).sub(ship.position).normalize()
          _q.setFromUnitVectors(FWD, _target)
          ship.quaternion.copy(_q)
          euler.current.setFromQuaternion(ship.quaternion, 'YXZ')
        }
      } else {
        cancelWarp()
      }
    } else if (locked) {
      _fwd.set(0, 0, -1).applyQuaternion(ship.quaternion)

      const accel = keys.boost ? 390 : 135
      const maxSpeed = keys.boost ? 780 : 270

      _acc.set(0, 0, 0)
      if (keys.fwd) _acc.addScaledVector(_fwd, accel)
      if (keys.back) _acc.addScaledVector(_fwd, -accel * 0.7)
      if (keys.up) _acc.addScaledVector(_up, accel * 0.9)
      if (keys.down) _acc.addScaledVector(_up, -accel * 0.9)

      let rollInput = 0
      if (keys.rollL) rollInput += 1
      if (keys.rollR) rollInput -= 1
      euler.current.z += rollInput * 1.2 * delta
      euler.current.z *= Math.exp(-3 * delta)

      let yawInput = 0
      if (keys.right) yawInput += 1
      if (keys.left) yawInput -= 1
      euler.current.y -= yawInput * 1.6 * delta

      vel.current.addScaledVector(_acc, delta)
      vel.current.multiplyScalar(Math.exp(-0.6 * delta))
      if (vel.current.length() > maxSpeed) vel.current.setLength(maxSpeed)
      ship.position.addScaledVector(vel.current, delta)
    }

    // ---- thruster visuals ----
    const v = vis.current
    const k = 1 - Math.exp(-12 * delta)

    const thrustTarget = keys.fwd ? (keys.boost ? 1 : 0.75) : 0
    v.thrust += (thrustTarget - v.thrust) * k

    if (animAction.current) {
      animAction.current.timeScale = 0.25 + v.thrust * 1.75
    }

    // ---- chase camera ----
    _shipPos.copy(ship.position)
    _offset.copy(CHASE_OFFSET).applyQuaternion(ship.quaternion)
    _target.copy(_shipPos).add(_offset)

    if (!camInit.current) {
      camPos.current.copy(_target)
      camQuat.current.copy(ship.quaternion)
      camInit.current = true
    }

    const stiff = warpTo ? 10 : 6
    camPos.current.lerp(_target, 1 - Math.exp(-stiff * delta))
    camQuat.current.slerp(ship.quaternion, 1 - Math.exp(-(stiff + 1) * delta))
    camera.position.copy(camPos.current)
    camera.quaternion.copy(camQuat.current)

    setSpeed(Math.round(vel.current.length()))
  })

  return (
    <group ref={shipRef} position={[0, 30, 160]}>
      <group ref={modelRef} rotation={MODEL_ROTATION} scale={MODEL_SCALE}>
        <primitive object={scene} />
      </group>

      {/* self-fill light so the ship reads in any sun angle */}
      <pointLight intensity={6} distance={30} decay={2} color="#cfe8ff" position={[0, 1, 4]} />
    </group>
  )
}
