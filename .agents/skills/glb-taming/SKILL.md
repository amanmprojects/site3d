---
name: glb-taming
description: "Work with GLB/GLTF 3D models you didn't author — inspect the node hierarchy and materials to identify what each part is, inventory and analyze animation tracks (including detecting unwanted baked-in motion like rolls), surgically filter animation clips to keep only the tracks you want, and hide/show or fade model parts at runtime. Use when playing with GLB/GLTF models: figuring out model structure, disabling or removing animations, isolating effect parts (fire, glows, rings), making parts appear conditionally, or debugging weird model behavior."
---

# GLB Taming

For 3D models where you don't have the source file. Covers: understanding the model, animation surgery, and runtime part control.

## When to use

- You need to know what a GLB contains: parts, materials, animations
- A part misbehaves (e.g. "the fire rolls") — find where the motion lives
- You want to play only *some* of a baked animation, or hide/fade parts at runtime
- You swapped a model file and things look wrong

## Step 1 — Inspect

Run from the project root (needs `three` in `node_modules`):

```bash
node .agents/skills/glb-taming/scripts/inspect-glb.mjs public/ship/ship.glb
```

Output: node hierarchy with vertex/morph counts, per-mesh world center/size + material colors, and per-animation-track stats including **max deviation from the first keyframe** — for quaternion tracks this prints the rotation angle AND axis (e.g. `maxDev=3.14rad(180deg) axis=(0.00,0.00,1.00)` = a half-turn around the model's Z axis = a roll), for position/scale tracks the travel distance.

`Couldn't load texture blob:...` warnings in Node are harmless — embedded textures just don't decode outside a browser.

## Step 2 — Identify parts

- GLB node names survive as `Object3D.name` — trustworthy if the artist named things (`Torus000_13`, `Circle_11`, `Material.001`)
- Material `emissive` color is the best part classifier: it's what the part actually glows (orange = flame, green = glow disc)
- World center/size tells you where a part sits relative to the hull — parts stacked behind the hull along the ship axis = exhaust/engines
- `morphs=N` on a mesh means it has blend shapes (often flame/flicker shapes) — driven by `morphTargetInfluences` tracks
- Shared materials: many meshes can share ONE material — opacity/color changes affect them all

## Step 3 — Find baked motion

The key insight: **unwanted motion (rolls, tumbling) can be baked into EVERY track of a clip, not just the root node's.** The root track being "the ship roll" doesn't mean the child tracks are clean — children often carry a copy of the same roll (e.g. 180° flips around the ship's long axis).

Detect it with the script: quaternion tracks with `maxDev≈π` around the longitudinal axis = roll. Position tracks with large travel = orbit/swing. Then:

- If only `*.scale` + `*.morphTargetInfluences` tracks animate: that's the "effect core" (flame breathing/flare) — safe to keep
- If position/quaternion tracks carry the roll: drop them

## Step 4 — Filter the clip

```ts
const { scene, animations } = useGLTF('/ship/ship.glb')
const clip = animations[0]
const fireClip = new THREE.AnimationClip(
  'fire',
  clip.duration,
  clip.tracks.filter((t) => /\.(scale|morphTargetInfluences)$/.test(t.name)),
)
const mixer = new THREE.AnimationMixer(scene)
const action = mixer.clipAction(fireClip)
action.play()
```

- The mixer resolves tracks by node NAME — filtered tracks simply don't run
- Dropping tracks leaves nodes at their **static GLB pose** (the pose you see with no animation at all) — usually the authored rest pose, which is what you want
- Call `mixer.update(delta)` in `useFrame`; `action.paused = true` freezes the effect mid-flicker and resumes naturally

## Step 5 — Runtime part control (R3F)

Collect parts by name pattern once in a `useMemo` (`useGLTF` suspends, so the scene exists on first render):

```ts
const fireNodes = useMemo(() => {
  const nodes: THREE.Object3D[] = []
  scene.traverse((o) => {
    if (/^(Torus|Circle)/.test(o.name)) {
      nodes.push(o)
      o.visible = false
    }
  })
  return nodes
}, [scene])
```

Fade instead of pop: set `material.transparent = true` once, animate `material.opacity` per frame (shared materials = one opacity drives the whole group), flip `visible` only when opacity crosses ~0.01, and pause the action when fully hidden.

## Gotchas

- Static pose vs keyframe pose: playing a clip snaps parts to the keyframe pose at t=0 — if that looks wrong (e.g. flames vanish because the first keyframe scale is near zero), don't play that track
- Node scripts need `globalThis.self = globalThis` before importing three (the script does this for you)
- `Box3().setFromObject` gives correct world size including node scale
- If a part "rolls" or "flies around" only while an animation plays, the motion is in the clip, not the geometry — filter, don't remodel
- After changing model behavior, note it in `AGENTS.md` + `CHANGELOG.md` (repo convention)

## See also

- `r3f-animation` — clip mixing, blending, morph targets
- `r3f-loaders` — useGLTF, preloading, gltfjsx typed access
