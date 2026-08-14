'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useApp } from '@/lib/store'
import { requestLock, setLockImpl } from '@/lib/controls'
import { planetRegistry } from '@/lib/planetRegistry'
import { sceneRef } from '@/lib/scene'
import { motion } from '@/lib/motion'

const keys = {
  fwd: false,
  brake: false,
  pitchUp: false,
  pitchDown: false,
  left: false,
  right: false,
  rollL: false,
  rollR: false,
  boost: false,
}

const HOME = new THREE.Vector3(0, 260, 5400)

const _fwd = new THREE.Vector3()
const _acc = new THREE.Vector3()
const _tmp = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _hold = new THREE.Vector3()
const _toHold = new THREE.Vector3()
const _target = new THREE.Vector3()
const _offset = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _q2 = new THREE.Quaternion()

const CHASE_OFFSET = new THREE.Vector3(0, 1.2, 8)
const CAM_LAG_K = 7
const CHASE_LAG_MAX = 1
const SURFACE_CLEARANCE = 9
const ACCEL = 400
const BOOST_ACCEL = 1000
const BRAKE_ACCEL = 400
const MAX_SPEED = 270
const BOOST_MAX_SPEED = 1100
const LOOK_STICKINESS = 14
const STEER_RATE = 2.2
const FIRE_FADE_IN = 12
const FIRE_FADE_OUT = 10
const BANK_MAX = 0.2
const BANK_RATE_FULL = 3.5
const ATT_PITCH_MAX = 0.32
const ATT_ROLL_MAX = 0.6
const ATT_RATE_FULL = 3.5
const FWD = new THREE.Vector3(0, 0, -1)

const MODEL_SCALE = 0.42
const MODEL_ROTATION: [number, number, number] = [0, Math.PI, 0]

export function Ship() {
  const { camera, gl } = useThree()
  const shipRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)

  const vel = useRef(new THREE.Vector3())
  const euler = useRef(new THREE.Euler(-0.18, 0, 0, 'YXZ'))
  const look = useRef({ x: -0.18, y: 0 })
  const vis = useRef({ thrust: 0 })
  const camLag = useRef(0)
  const roll = useRef(0)
  const bank = useRef(0)
  const lastYaw = useRef(0)
  const lastPitch = useRef(0)
  const attPitch = useRef(0)
  const attRoll = useRef(0)
  const camQ = useRef(new THREE.Quaternion())
  const shake = useRef(0)
  const lastPos = useRef(new THREE.Vector3(HOME.x, HOME.y, HOME.z))
  const exitIntentional = useRef(false)
  const relockTimer = useRef(0)

  const setLocked = useApp((s) => s.setLocked)
  const setSpeed = useApp((s) => s.setSpeed)
  const warpTo = useApp((s) => s.warpTo)
  const cancelWarp = useApp((s) => s.cancelWarp)

  const { scene, animations } = useGLTF('/ship/ship.glb')

  // booster fire: the green Circle* nozzle discs (burn in normal thrust) and
  // the Torus* flame rings (only at full power: boost or warp)
  const { fireCones, fireConeMats, fireDiscs, fireDiscMats } = useMemo(() => {
    const cones: THREE.Object3D[] = []
    const discs: THREE.Object3D[] = []
    const coneMats = new Set<THREE.Material>()
    const discMats = new Set<THREE.Material>()
    const collect = (node: THREE.Object3D, list: THREE.Object3D[], mats: Set<THREE.Material>) => {
      list.push(node)
      node.visible = false
      node.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh) return
        const mesh = o as THREE.Mesh
        const ms = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of ms) {
          if (!m) continue
          m.transparent = true
          mats.add(m)
        }
      })
    }
    scene.traverse((o) => {
      if (/^Torus/.test(o.name)) collect(o, cones, coneMats)
      else if (/^Circle/.test(o.name)) collect(o, discs, discMats)
    })
    return { fireCones: cones, fireConeMats: coneMats, fireDiscs: discs, fireDiscMats: discMats }
  }, [scene])

  const mixer = useRef<THREE.AnimationMixer | null>(null)
  const fireAction = useRef<THREE.AnimationAction | null>(null)
  const fireShown = useRef(false)
  const coneOpacity = useRef(0)
  const discOpacity = useRef(0)

  useEffect(() => {
    if (!animations.length) return
    // play only the fire flicker tracks (torus/circle scale pulse + flame
    // morphs); everything else in this clip is roll motion baked into the fire
    // nodes too (180 deg flips around the ship's long axis) or the root roll
    const clip = animations[0]
    const fireClip = new THREE.AnimationClip(
      'fire',
      clip.duration,
      clip.tracks.filter((t) => /\.(scale|morphTargetInfluences)$/.test(t.name)),
    )
    const m = new THREE.AnimationMixer(scene)
    const action = m.clipAction(fireClip)
    action.play()
    mixer.current = m
    fireAction.current = action
    return () => {
      m.stopAllAction()
    }
  }, [animations, scene])

  useEffect(() => {
    sceneRef.camera = camera as THREE.PerspectiveCamera
    setLockImpl(() => gl.domElement.requestPointerLock())
    camQ.current.copy(shipRef.current?.quaternion ?? new THREE.Quaternion())
    lastPitch.current = euler.current.x

    const makeKeyHandler = (down: boolean) => (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
          keys.fwd = down
          break
        case 'KeyS':
          keys.brake = down
          break
        case 'ArrowUp':
          keys.pitchUp = down
          break
        case 'ArrowDown':
          keys.pitchDown = down
          break
        case 'KeyA':
          keys.rollL = down
          break
        case 'KeyD':
          keys.rollR = down
          break
        case 'ArrowLeft':
          keys.left = down
          break
        case 'ArrowRight':
          keys.right = down
          break
        case 'Space':
          if (down) e.preventDefault()
          keys.boost = down
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
            look.current.x = -0.18
            look.current.y = 0
            roll.current = 0
            bank.current = 0
            lastYaw.current = 0
            lastPitch.current = -0.18
            attPitch.current = 0
            attRoll.current = 0
            shake.current = 0
            lastPos.current.copy(HOME)
          }
          break
        case 'Escape':
          if (down) exitIntentional.current = true
          break
        default:
          break
      }
    }
    const kd = makeKeyHandler(true)
    const ku = makeKeyHandler(false)

    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return
      look.current.y -= e.movementX * 0.0011
      look.current.x -= e.movementY * 0.0011
      look.current.x = Math.max(-1.45, Math.min(1.45, look.current.x))
    }

    const onLockChange = () => {
      if (document.pointerLockElement === gl.domElement) {
        exitIntentional.current = false
        setLocked(true)
      } else if (exitIntentional.current) {
        exitIntentional.current = false
        setLocked(false)
      }
    }

    const tryRelock = () => {
      if (document.visibilityState !== 'visible') return
      if (!document.hasFocus()) return
      if (!useApp.getState().locked) return
      if (document.pointerLockElement === gl.domElement) return
      requestLock()
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (relockTimer.current) window.clearTimeout(relockTimer.current)
      relockTimer.current = window.setTimeout(tryRelock, 50)
    }
    const onLockError = () => {
      if (
        document.visibilityState === 'visible' &&
        document.hasFocus() &&
        useApp.getState().locked
      ) {
        setLocked(false)
      }
    }
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      if (document.visibilityState !== 'visible') return
      if (document.pointerLockElement === gl.domElement) return
      if (useApp.getState().locked) requestLock()
    }

    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    document.addEventListener('pointerlockchange', onLockChange)
    document.addEventListener('pointerlockerror', onLockError)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      if (relockTimer.current) window.clearTimeout(relockTimer.current)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('pointerlockerror', onLockError)
      document.removeEventListener('mousedown', onMouseDown)
      sceneRef.camera = null
    }
  }, [camera, gl, setLocked])

  useFrame((_, deltaRaw) => {
    const delta = Math.min(deltaRaw, 0.05)
    const locked = document.pointerLockElement === gl.domElement
    const ship = shipRef.current
    if (!ship) return

    mixer.current?.update(delta)

    const lookK = 1 - Math.exp(-LOOK_STICKINESS * delta)
    euler.current.x += (look.current.x - euler.current.x) * lookK
    euler.current.y += (look.current.y - euler.current.y) * lookK

    const yawVel = euler.current.y - lastYaw.current
    lastYaw.current = euler.current.y
    const pitchVel = euler.current.x - lastPitch.current
    lastPitch.current = euler.current.x
    const bankTarget = Math.sign(yawVel) * Math.min(1, Math.abs(yawVel) / (delta * BANK_RATE_FULL)) * BANK_MAX
    const entering = Math.abs(bank.current) < Math.abs(bankTarget)
    bank.current += (bankTarget - bank.current) * (1 - Math.exp(-(entering ? 10 : 5) * delta))
    euler.current.z = roll.current + bank.current

    const attPitchTarget = -THREE.MathUtils.clamp(pitchVel / (delta * ATT_RATE_FULL), -1, 1) * ATT_PITCH_MAX
    const attRollTarget = -THREE.MathUtils.clamp(yawVel / (delta * ATT_RATE_FULL), -1, 1) * ATT_ROLL_MAX
    attPitch.current += (attPitchTarget - attPitch.current) * (1 - Math.exp(-10 * delta))
    const rollEntering = Math.abs(attRoll.current) < Math.abs(attRollTarget)
    attRoll.current += (attRollTarget - attRoll.current) * (1 - Math.exp(-(rollEntering ? 9 : 5) * delta))
    ship.quaternion.setFromEuler(euler.current)
    modelRef.current?.rotation.set(attPitch.current, MODEL_ROTATION[1], attRoll.current, 'YXZ')

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
          const step = Math.min(dist, 450 * delta * 6)
          ship.position.addScaledVector(_toHold.normalize(), step)
          _target.copy(_tmp).sub(ship.position).normalize()
          _q.setFromUnitVectors(FWD, _target)
          ship.quaternion.copy(_q)
          euler.current.setFromQuaternion(ship.quaternion, 'YXZ')
          look.current.x = euler.current.x
          look.current.y = euler.current.y
          lastYaw.current = euler.current.y
          lastPitch.current = euler.current.x
          attPitch.current = 0
          attRoll.current = 0
          camQ.current.copy(ship.quaternion)
        }
      } else {
        cancelWarp()
      }
    } else if (locked) {
      _fwd.set(0, 0, -1).applyQuaternion(ship.quaternion)

      if (keys.pitchUp) look.current.x += 1.3 * delta
      if (keys.pitchDown) look.current.x -= 1.3 * delta
      look.current.x = Math.max(-1.45, Math.min(1.45, look.current.x))

      let rollInput = 0
      if (keys.rollL) rollInput += 1
      if (keys.rollR) rollInput -= 1
      roll.current += rollInput * 1.2 * delta
      roll.current *= Math.exp(-3 * delta)
      euler.current.z = roll.current + bank.current

      let yawInput = 0
      if (keys.right) yawInput += 1
      if (keys.left) yawInput -= 1
      look.current.y -= yawInput * 1.6 * delta

      const boosting = keys.boost
      const maxSpeed = boosting ? BOOST_MAX_SPEED : MAX_SPEED
      const spd = vel.current.length()
      if (spd > 0.5) {
        _dir.copy(vel.current).normalize()
        const angle = Math.acos(THREE.MathUtils.clamp(_dir.dot(_fwd), -1, 1))
        if (angle > 1e-4) {
          _q.setFromUnitVectors(_dir, _fwd)
          _q2.identity()
          _q2.slerp(_q, Math.min(1, (STEER_RATE * delta) / angle))
          vel.current.copy(_dir).applyQuaternion(_q2).multiplyScalar(spd)
        }
      }
      const throttle = 1 - Math.min(1, (spd / maxSpeed) ** 2)

      _acc.set(0, 0, 0)
      if (keys.fwd) _acc.addScaledVector(_fwd, (boosting ? BOOST_ACCEL : ACCEL) * throttle)
      if (keys.brake && spd > 0.01) _acc.addScaledVector(vel.current, -BRAKE_ACCEL / spd)

      vel.current.addScaledVector(_acc, delta)
      if (!boosting && spd > MAX_SPEED) {
        vel.current.multiplyScalar(Math.exp(-0.3 * (spd / MAX_SPEED - 1) * delta))
      }
      ship.position.addScaledVector(vel.current, delta)
    }

    // ---- planet collision: push out of the surface, bounce, shake ----
    for (const entry of planetRegistry.values()) {
      entry.object.getWorldPosition(_tmp)
      _dir.copy(ship.position).sub(_tmp)
      const dist = _dir.length()
      const minDist = entry.radius + SURFACE_CLEARANCE
      if (dist >= minDist || dist < 1e-4) continue
      _dir.divideScalar(dist)
      ship.position.copy(_tmp).addScaledVector(_dir, minDist)
      const vn = vel.current.dot(_dir)
      if (vn < 0) {
        vel.current.addScaledVector(_dir, -vn * 1.35)
        vel.current.multiplyScalar(0.86)
      }
      shake.current = Math.min(1.4, shake.current + Math.min(0.9, (minDist - dist) * 0.12))
      if (warpTo) cancelWarp()
    }

    // ---- actual per-frame motion (feeds motion blur + star dust) ----
    if (delta > 0) {
      _tmp.copy(ship.position).sub(lastPos.current).divideScalar(delta)
      motion.velocity.copy(_tmp)
    } else {
      motion.velocity.set(0, 0, 0)
    }
    motion.speed = motion.velocity.length()
    motion.position.copy(ship.position)
    lastPos.current.copy(ship.position)

    // ---- thruster visuals ----
    const v = vis.current
    const k = 1 - Math.exp(-12 * delta)

    const thrustTarget = keys.fwd ? (keys.boost ? 1 : 0.75) : 0
    v.thrust += (thrustTarget - v.thrust) * k

    // booster fire: green discs burn with thrust, flame rings only at full
    // power (boost/warp); each fades separately, flicker pauses when all off
    const discTarget = keys.fwd || !!warpTo ? 1 : 0
    const coneTarget = (keys.fwd && keys.boost) || !!warpTo ? 1 : 0
    const dk = 1 - Math.exp(-(discTarget > discOpacity.current ? FIRE_FADE_IN : FIRE_FADE_OUT) * delta)
    const ck = 1 - Math.exp(-(coneTarget > coneOpacity.current ? FIRE_FADE_IN : FIRE_FADE_OUT) * delta)
    discOpacity.current += (discTarget - discOpacity.current) * dk
    coneOpacity.current += (coneTarget - coneOpacity.current) * ck
    const anyShown = discOpacity.current > 0.01 || coneOpacity.current > 0.01
    if (anyShown !== fireShown.current) {
      fireShown.current = anyShown
      if (fireAction.current) fireAction.current.paused = !anyShown
    }
    for (const n of fireDiscs) n.visible = discOpacity.current > 0.01
    for (const n of fireCones) n.visible = coneOpacity.current > 0.01
    for (const m of fireDiscMats) m.opacity = discOpacity.current
    for (const m of fireConeMats) m.opacity = coneOpacity.current

    // ---- chase camera (rigidly anchored; slides back slightly under thrust) ----
    _fwd.set(0, 0, -1).applyQuaternion(ship.quaternion)
    camLag.current += ((v.thrust > 0.01 ? CHASE_LAG_MAX : 0) - camLag.current) * (1 - Math.exp(-6 * delta))
    shake.current *= Math.exp(-4 * delta)

    _offset.copy(CHASE_OFFSET).applyQuaternion(ship.quaternion)
    _target.copy(ship.position).add(_offset).addScaledVector(_fwd, -camLag.current)
    if (shake.current > 0.003) {
      _tmp.set(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
      )
      _target.addScaledVector(_tmp, shake.current * 0.7)
    }

    camera.position.copy(_target)
    camQ.current.slerp(ship.quaternion, 1 - Math.exp(-CAM_LAG_K * delta))
    camera.quaternion.copy(camQ.current)

    setSpeed(Math.round(motion.speed))
  })

  return (
    <group ref={shipRef} position={[0, 260, 5400]}>
      <group ref={modelRef} rotation={MODEL_ROTATION} scale={MODEL_SCALE}>
        <primitive object={scene} />
      </group>

      {/* self-fill light so the ship reads in any sun angle */}
      <pointLight intensity={6} distance={30} decay={2} color="#cfe8ff" position={[0, 1, 4]} />
    </group>
  )
}
