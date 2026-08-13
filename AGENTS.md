# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this is

A 3D space-exploration portfolio: the visitor pilots a spaceship (third-person chase cam) through a solar system where each orbiting planet represents one of Aman Mehtar's projects. Fly close to a planet to scan it and see its info panel.

Built with **Next.js 16 (App Router) + React 19 + TypeScript + React Three Fiber (`@react-three/fiber` + `@react-three/drei`) + `@react-three/postprocessing`**, Tailwind CSS 4, and Zustand for UI state. Planet bodies come from a single Sketchfab GLB (`planet_of_phoenix.glb`, a phoenix-textured planet), cloned per project in its original colors.

## Commands

```bash
npm run dev        # dev server (Turbopack)
npm run build      # production build (runs its own TS check)
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
```

There is **no lint script**. Always run `npm run typecheck` (and ideally `npm run build`) after making changes. `tsconfig` is `strict: true`.

## Changelog

When you make a meaningful change to the codebase, add an entry under `[Unreleased]` in `CHANGELOG.md` (using the Keep a Changelog format). When a release is cut, move the unreleased entries into a new versioned section.

## Important conventions & gotchas

- **All 3D code is client-only.** The `Experience` component (the `<Canvas>`) is dynamically imported with `ssr: false` in `app/page.tsx`. Any new R3F component must start with `'use client'`.
- **Two DOM layers:** the full-screen Canvas (`components/Experience.tsx`) and the HUD overlay (`components/HUD.tsx`, `pointer-events-none`, z-10). The HUD root is `pointer-events-none`, and `pointer-events` is *inherited* — any new clickable overlay/button inside the HUD must explicitly add `pointer-events-auto`, otherwise clicks silently don't register.
- **Client-only shared state** is wired via:
  - `lib/store.ts` — Zustand store (`locked`, `targetId`, `infoId`, `warpTo`, `speed`). The HUD reads this.
  - `lib/controls.ts` — module singleton for the pointer-lock request function (set by `Ship`, called by `HUD`).
  - `lib/scene.ts` — holds a ref to the active camera (used by the DOM `TargetIndicator`).
  - `lib/planetRegistry.ts` — `Map<id, {object, radius}>` of live planet world positions, updated by each `Planet`.
- **Keep this file up to date:** when you change anything that alters a convention, file map entry, or "Where to change things" pointer, update `AGENTS.md` to match.
- **Do not add code comments** unless asked.
- Don't assume new libraries are installed — check `package.json` first. `@types/three` must stay in lockstep with the `three` version.

## File map

| Path | Purpose |
|------|---------|
| `app/page.tsx` | Entry; mounts `Experience` (dynamic, ssr:false) + `HUD` |
| `components/Experience.tsx` | `<Canvas>` setup (camera, dpr, lights) + scene composition |
| `components/Ship.tsx` | Ship (loads GLB model via `useGLTF`) + flight controls + chase camera |
| `components/SolarSystem.tsx` | Star + planets + orbit lines; proximity detection → store |
| `components/Planet.tsx` | One planet: clones the phoenix mesh from `planet_of_phoenix.glb` (original colors), optional rings, Html label |
| `components/Star.tsx` | Central sun (animated GLB `stroming_sun.glb` + radial-gradient glow sprite + point light) |
| `components/NightSky.tsx` | Background skybox (HDRI equirect texture, slowly rotating) |
| `components/Starfield.tsx` | Scattered star particles: a 3D volume (120k stars in a 24000-unit cube) you fly through + a far spherical shell (60k stars, 60000–128000 units) for depth; custom shader per-star size/color/twinkle |
| `components/Effects.tsx` | Postprocessing (Bloom, Vignette, Noise) + speed-scaled warp blur strength driver |
| `components/WarpBlur.tsx` | Custom radial motion-blur effect (`WarpBlurEffect`, 16-tap zoom blur toward screen center); strength driven per frame from `lib/motion.ts` |
| `components/HUD.tsx` | All DOM UI: intro/launch screen, crosshair, target indicator, info popup, bottom-right speedometer (`speed` from the store, cruise/boost marks hardcoded to 270/780) |
| `components/LoadingScreen.tsx` | Boot/loading overlay (z-40, covers Intro): shows asset load progress via drei `useProgress`, fades out when done |
| `lib/planets.ts` | **Single source of truth** for projects: name, description, link, tags, palette, orbit/radius/speed/phase/seed |
| `lib/geometry.ts` | Atmosphere shader + ring texture |
| `lib/noise.ts` | Seeded PRNG (`mulberry32`) |
| `lib/store.ts`, `lib/controls.ts`, `lib/scene.ts`, `lib/planetRegistry.ts` | Client state plumbing (see above) |
| `lib/motion.ts` | Module singleton holding the ship's actual per-frame speed (written by `Ship`, read by `Effects`) for speed-scaled motion blur |
| `public/sky/` | HDRI sky texture (`NightSkyHDRI008_8K.jpg`, ~22MB) |
| `public/ship/ship.glb` | Animated ship model (multi-universe space ship, ~21MB) |
| `public/planets/planet_of_phoenix.glb` | Phoenix planet model (~51MB, single mesh `Phoenix_LOD0__0`, body unit radius 22; `useGLTF.preload` in `Experience.tsx`) |
| `public/sun/stroming_sun.glb` | Animated sun model (layered rotating/scale-pulsing shells) |
| `my-info.md` | Content source (bio, socials, project list) |
| `CHANGELOG.md` | Log of notable changes (Keep a Changelog format) |

## Where to change things

- **Projects / content / planet look:** `lib/planets.ts` (add/edit entries in the `THEMES` array — id, name, description, link, tags, palette, rings). Every planet is a clone of the single phoenix mesh from `public/planets/planet_of_phoenix.glb` (`Phoenix_LOD0__0`, body unit radius 22 — `BODY_UNIT_RADIUS` in `Planet.tsx` scales it to `radius`). All planets keep the GLB's original colors (no per-planet tint or emissive) and have no glow or atmosphere effect. **System scale:** orbits are `6000 + i * 2800` (≈6000–36800), planet radii `(34 + (i % 4) * 14) * 3.5` (≈119–266 units), orbital speed `2 / Math.sqrt(orbit)` — bump these in the `PLANETS` map to resize the whole system. The sun (`Star.tsx`), skybox (`NightSky.tsx`), starfield (`Starfield.tsx`) and camera far plane (`Experience.tsx`) are sized to match.
- **Flight feel:** `components/Ship.tsx` — `CHASE_OFFSET` (camera distance from ship center, y = height above the ship's center so the ship sits slightly low in frame), `CAM_LAG_K` (how quickly the camera orientation catches up to the ship's pitch/yaw; lower = more lag), `CHASE_LAG_MAX` (thrust slide-back cap), `LOOK_STICKINESS` (pitch/yaw smoothing), `STEER_RATE` (flight-assist steering: how fast the velocity vector turns toward the ship's facing, so the ship flies where it points — there is no newtonian drift; mouse and A/D turns always curve the trajectory), attitude lean constants (`ATT_PITCH_MAX`, `ATT_ROLL_MAX`, `ATT_RATE_FULL` — how far the hull pitches/banks into steering, cosmetic on the model only, camera doesn't follow), `HOME`, `ACCEL`/`BOOST_ACCEL` (thrust, u/s²), `BRAKE_ACCEL` (S = reverse thrust along the velocity vector), `MAX_SPEED`/`BOOST_MAX_SPEED` (soft caps: thrust tapers to zero as speed approaches them via a throttle curve, no hard clamp), mouse sensitivity (`e.movementX * 0.0022`). There is **no friction in space** — coasting holds speed forever, but direction follows the nose via `STEER_RATE`; releasing boost above cruise bleeds speed back down to `MAX_SPEED` via over-speed drag.
- **Planet collision:** the ship bounces off planet surfaces instead of passing through — `SURFACE_CLEARANCE` in `components/Ship.tsx` is the stop distance off the surface (9 units; big enough that the chase camera never clips the planet). On impact the ship is pushed to the surface, the inward velocity component is reflected/damped, and the camera shakes (`shake` ref, decayed per frame). Autopilot warp aborts if its path hits a planet.
- **Ship model:** `public/ship/ship.glb` (swap the file to change the model). Orientation/scale via `MODEL_ROTATION` + `MODEL_SCALE` in `components/Ship.tsx`. The GLB's baked fly-around animation is not played (it tumbled the hull); the model rests at its authored pose.
- **Info popup trigger distance:** `components/SolarSystem.tsx` (`p.radius * 3 + 30`).
- **Lighting / bloom:** `components/Star.tsx` (point light) and `components/Effects.tsx` (`luminanceThreshold`, `intensity`).
- **Motion blur:** speed-scaled warp blur. The ship writes its actual per-frame speed to `lib/motion.ts` (`motion.speed`, covers manual flight + warp); `components/Effects.tsx` maps it linearly to strength (`min(1, speed / 2000)` — proportional to current speed) and eases per frame (asymmetric: ramps up at rate 6, wears off at rate 60); `components/WarpBlur.tsx` is the shader (16 taps, `radius = strength * dist * 0.05` — bump the multiplier for more smear).
- **HUD styling:** Tailwind classes in `components/HUD.tsx` + custom classes in `app/globals.css`. Fonts are loaded in `app/layout.tsx` via `next/font` (`Space Grotesk` → `var(--font-sans)`, `JetBrains Mono` → `var(--font-mono)`).

## Controls (for reference)

W thrust · S brake · Up/Down pitch · A/D yaw · mouse steer (pointer-locked) · Q/E roll · Shift boost · R reset · Esc release cursor · Space launch · Enter opens the targeted project link.
