#!/usr/bin/env node
// inspect-glb.mjs — understand a GLB/GLTF you didn't author.
// Usage: node inspect-glb.mjs <model.glb>   (run from a dir where `three` is installed)
//
// Prints:
//   1. Node hierarchy (names, mesh vertex counts, morph target counts)
//   2. Per-mesh world center/size + material colors
//   3. Per-animation-track stats, including max deviation from the first
//      keyframe: for quaternion tracks the rotation angle AND axis (detects
//      baked-in rolls), for position/scale tracks the travel distance.

globalThis.self = globalThis
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { readFileSync } from 'fs'

const file = process.argv[2]
if (!file) {
  console.error('usage: node inspect-glb.mjs <model.glb>')
  process.exit(1)
}

const sample = (track, time) => {
  const times = track.times
  const vals = track.values
  const stride = vals.length / times.length
  if (time <= times[0]) return vals.slice(0, stride)
  if (time >= times[times.length - 1]) return vals.slice(-stride)
  let i = 0
  while (times[i + 1] < time) i++
  const f = (time - times[i]) / (times[i + 1] - times[i])
  if (track instanceof THREE.QuaternionKeyframeTrack) {
    const a = new THREE.Quaternion().fromArray(vals, i * 4)
    const b = new THREE.Quaternion().fromArray(vals, (i + 1) * 4)
    return new THREE.Quaternion().slerpQuaternions(a, b, f).toArray()
  }
  const out = []
  for (let j = 0; j < stride; j++)
    out[j] = vals[i * stride + j] + (vals[(i + 1) * stride + j] - vals[i * stride + j]) * f
  return out
}

// relative rotation q * q0^-1, returns { ang: radians, axis: [x,y,z] }
const quatDeviation = (q, q0) => {
  const [ax, ay, az, aw] = q
  const [bx, by, bz, bw] = q0
  const rx = aw * -bx + ax * bw + ay * -bz - az * -by
  const ry = aw * -by - ax * -bz + ay * bw + az * -bx
  const rz = aw * -bz + ax * -by - ay * -bx + az * bw
  const rw = aw * bw - ax * -bx - ay * -by - az * -bz
  const ang = 2 * Math.acos(Math.min(1, Math.abs(rw)))
  const s = Math.sqrt(Math.max(0, 1 - rw * rw))
  const axis = s > 1e-6 ? [rx / s, ry / s, rz / s].map((v) => +v.toFixed(2)) : [0, 0, 0]
  return { ang, axis }
}

const fmt3 = (v) => v.toArray().map((n) => n.toFixed(1)).join(',')

const data = readFileSync(file)
new GLTFLoader().parse(
  data.buffer,
  '',
  (gltf) => {
    const out = { lines: [], meshes: [] }
    const walk = (obj, depth) => {
      const pad = '  '.repeat(depth)
      let line = pad + obj.name
      if (obj.isMesh) {
        const verts = obj.geometry.attributes.position?.count ?? '?'
        const morphs = obj.geometry.morphAttributes?.position?.length
        line += `  [MESH verts=${verts}${morphs ? ` morphs=${morphs}` : ''}]`
        out.meshes.push(obj)
      }
      out.lines.push(line)
      obj.children.forEach((c) => walk(c, depth + 1))
    }
    gltf.scene.children.forEach((c) => walk(c, 0))

    console.log('=== NODE HIERARCHY ===')
    out.lines.forEach((l) => console.log(l))

    console.log('\n=== MESH DETAILS ===')
    for (const m of out.meshes) {
      const box = new THREE.Box3().setFromObject(m)
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      console.log(
        `${m.name}: center=(${fmt3(box.getCenter(new THREE.Vector3()))}) size=(${fmt3(box.getSize(new THREE.Vector3()))})`,
      )
      for (const mat of mats) {
        if (!mat) continue
        const color = mat.color ? '#' + mat.color.getHexString() : '-'
        const emissive = mat.emissive ? '#' + mat.emissive.getHexString() : '-'
        console.log(
          `   mat ${mat.name} type=${mat.type} color=${color} emissive=${emissive} transparent=${mat.transparent} opacity=${mat.opacity}`,
        )
      }
    }

    console.log('\n=== ANIMATIONS ===')
    for (const clip of gltf.animations) {
      console.log(`clip "${clip.name}" duration=${clip.duration.toFixed(2)}s tracks=${clip.tracks.length}`)
      for (const t of clip.tracks) {
        const prop = t.name.slice(t.name.lastIndexOf('.') + 1)
        const vals = t.values
        const stride = vals.length / t.times.length
        let min = Infinity
        let max = -Infinity
        for (const v of vals) {
          if (v < min) min = v
          if (v > max) max = v
        }
        let extra = ''
        const t0 = t.times[0]
        const t1 = t.times[t.times.length - 1]
        const N = 48
        if (prop === 'quaternion') {
          const base = vals.slice(0, 4)
          let best = { ang: 0, axis: [0, 0, 0], at: 0 }
          let bestAxis = { ang: 0, axis: [0, 0, 0], at: 0 }
          for (let i = 1; i <= N; i++) {
            const time = t0 + ((t1 - t0) * i) / N
            const d = quatDeviation(sample(t, time), base)
            if (d.ang > best.ang) best = { ang: d.ang, axis: d.axis, at: time }
            // axis is noisy at exactly 180deg; prefer a mid-range sample
            if (d.ang > bestAxis.ang && d.ang > 0.5 && d.ang < 2.8)
              bestAxis = { ang: d.ang, axis: d.axis, at: time }
          }
          const axisSample = bestAxis.ang > 0 ? bestAxis : best
          extra = ` maxDev=${best.ang.toFixed(2)}rad(${Math.round((best.ang * 180) / Math.PI)}deg) axis=(${axisSample.axis.join(',')}) @t=${best.at.toFixed(1)}`
        } else if (prop === 'position' || prop === 'scale') {
          const base = vals.slice(0, stride)
          let best = { d: 0, at: 0 }
          for (let i = 1; i <= N; i++) {
            const time = t0 + ((t1 - t0) * i) / N
            const v = sample(t, time)
            let d = 0
            for (let j = 0; j < stride; j++) d += (v[j] - base[j]) ** 2
            d = Math.sqrt(d)
            if (d > best.d) best = { d, at: time }
          }
          extra = ` maxDev=${best.d.toFixed(2)} @t=${best.at.toFixed(1)}`
        }
        console.log(
          `   ${t.name.padEnd(52)} keys=${String(t.times.length).padStart(3)} min=${min.toFixed(2).padStart(7)} max=${max.toFixed(2).padStart(7)}${extra}`,
        )
      }
    }
  },
  (err) => {
    console.error('load error:', err.message)
    process.exit(1)
  },
)
