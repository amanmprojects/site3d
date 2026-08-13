# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this is

A 3D space-exploration portfolio: the visitor pilots a spaceship (third-person chase cam) through a solar system where each orbiting planet represents one of Aman Mehtar's projects. Fly close to a planet to scan it and see its info panel.

Built with **Next.js 16 (App Router) + React 19 + TypeScript + React Three Fiber (`@react-three/fiber` + `@react-three/drei`) + `@react-three/postprocessing`**, Tailwind CSS 4, and Zustand for UI state. Planet bodies come from a single Sketchfab GLB (`various_planets.glb`, 7 planets: smac, gas, continental, frozen, lava, barren, gas_cloud_02 — with cloud layers), cloned per project.

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
| `components/Ship.tsx` | Ship (loads GLB model via `useGLTF` + `useAnimations`) + flight controls + chase camera |
| `components/SolarSystem.tsx` | Star + planets + orbit lines; proximity detection → store |
| `components/Planet.tsx` | One planet: clones the assigned node(s) from `various_planets.glb`, atmosphere glow, optional rings, Html label |
| `components/Star.tsx` | Central sun (animated GLB `stroming_sun.glb` + radial-gradient glow sprite + point light) |
| `components/NightSky.tsx` | Background skybox (HDRI equirect texture, slowly rotating) |
| `components/Starfield.tsx` | Near-field parallax stars (drei `<Stars>`) |
| `components/Effects.tsx` | Postprocessing (Bloom, Vignette, Noise) |
| `components/HUD.tsx` | All DOM UI: intro/launch screen, crosshair, target indicator, info popup |
| `components/LoadingScreen.tsx` | Boot/loading overlay (z-40, covers Intro): shows asset load progress via drei `useProgress`, fades out when done |
| `lib/planets.ts` | **Single source of truth** for projects: name, description, link, tags, palette, `model` (GLB node names), orbit/radius/speed/phase/seed |
| `lib/geometry.ts` | Atmosphere shader + ring texture |
| `lib/noise.ts` | Seeded PRNG (`mulberry32`) |
| `lib/store.ts`, `lib/controls.ts`, `lib/scene.ts`, `lib/planetRegistry.ts` | Client state plumbing (see above) |
| `public/sky/` | HDRI sky texture (`NightSkyHDRI008_8K.jpg`, ~22MB) |
| `public/ship/ship.glb` | Animated ship model (multi-universe space ship, ~21MB) |
| `public/planets/various_planets.glb` | All planet models in one file (~110MB, 7 planets + cloud layers; `useGLTF.preload` in `Experience.tsx`) |
| `public/sun/stroming_sun.glb` | Animated sun model (layered rotating/scale-pulsing shells) |
| `my-info.md` | Content source (bio, socials, project list) |
| `CHANGELOG.md` | Log of notable changes (Keep a Changelog format) |

## Where to change things

- **Projects / content / planet look:** `lib/planets.ts` (add/edit entries in the `THEMES` array — id, name, description, link, tags, palette, rings). The `model` array picks which node(s) from `public/planets/various_planets.glb` render as that planet (e.g. `['planet_lava_7']`, or `['planet_smac_0', 'planet_smac_cloud_1']` for body + cloud). Model unit radius is 1.0; `Planet.tsx` scales by `radius`. Available nodes: `planet_smac_0`/`planet_smac_cloud_1`, `planet_gas_2`/`planet_gas_cloud_01_3`, `planet_continental_4`/`planet_continental_clouds_5`, `planet_frozen_6`, `planet_lava_7`, `planet_barren_8`, `planet_gas_cloud_02_9`.
- **Flight feel:** `components/Ship.tsx` — `CHASE_OFFSET` (camera distance/height), `HOME`, `accel`, `maxSpeed`, damping, mouse sensitivity (`e.movementX * 0.0022`).
- **Ship model:** `public/ship/ship.glb` (swap the file to change the model). Orientation/scale via `MODEL_ROTATION` + `MODEL_SCALE` in `components/Ship.tsx`. Animation speed scales with thrust (`0.25 + v.thrust * 1.75`).
- **Info popup trigger distance:** `components/SolarSystem.tsx` (`p.radius * 6 + 12`).
- **Lighting / bloom:** `components/Star.tsx` (point light) and `components/Effects.tsx` (`luminanceThreshold`, `intensity`).
- **HUD styling:** Tailwind classes in `components/HUD.tsx` + custom classes in `app/globals.css`.

## Controls (for reference)

W thrust · S brake · Up/Down pitch · A/D yaw · mouse steer (pointer-locked) · Q/E roll · Shift boost · R reset · Esc release cursor · Space launch · Enter opens the targeted project link.
