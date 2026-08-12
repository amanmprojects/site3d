# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this is

A 3D space-exploration portfolio: the visitor pilots a spaceship (third-person chase cam) through a solar system where each orbiting planet represents one of Aman Mehtar's projects. Fly close to a planet to scan it and see its info panel.

Built with **Next.js 16 (App Router) + React 19 + TypeScript + React Three Fiber (`@react-three/fiber` + `@react-three/drei`) + `@react-three/postprocessing`**, Tailwind CSS 4, Zustand for UI state, and `simplex-noise` for procedural planet surfaces.

## Commands

```bash
npm run dev        # dev server (Turbopack)
npm run build      # production build (runs its own TS check)
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
```

There is **no lint script**. Always run `npm run typecheck` (and ideally `npm run build`) after making changes. `tsconfig` is `strict: true`.

## Important conventions & gotchas

- **All 3D code is client-only.** The `Experience` component (the `<Canvas>`) is dynamically imported with `ssr: false` in `app/page.tsx`. Any new R3F component must start with `'use client'`.
- **Two DOM layers:** the full-screen Canvas (`components/Experience.tsx`) and the HUD overlay (`components/HUD.tsx`, `pointer-events-none`, z-10). The HUD root is `pointer-events-none`, and `pointer-events` is *inherited* — any new clickable overlay/button inside the HUD must explicitly add `pointer-events-auto`, otherwise clicks silently don't register.
- **Client-only shared state** is wired via:
  - `lib/store.ts` — Zustand store (`locked`, `targetId`, `infoId`, `warpTo`, `speed`). The HUD reads this.
  - `lib/controls.ts` — module singleton for the pointer-lock request function (set by `Ship`, called by `HUD`).
  - `lib/scene.ts` — holds a ref to the active camera (used by the DOM `TargetIndicator`).
  - `lib/planetRegistry.ts` — `Map<id, {object, radius}>` of live planet world positions, updated by each `Planet`.
- **Do not add code comments** unless asked.
- Don't assume new libraries are installed — check `package.json` first. `@types/three` must stay in lockstep with the `three` version.

## File map

| Path | Purpose |
|------|---------|
| `app/page.tsx` | Entry; mounts `Experience` (dynamic, ssr:false) + `HUD` |
| `components/Experience.tsx` | `<Canvas>` setup (camera, dpr, lights) + scene composition |
| `components/Ship.tsx` | Spaceship model + flight controls + chase camera + thruster visuals |
| `components/SolarSystem.tsx` | Star + planets + orbit lines; proximity detection → store |
| `components/Planet.tsx` | One planet: procedural geometry, atmosphere, rings, Html label |
| `components/Star.tsx` | Central star (emissive core, atmosphere shells, point light) |
| `components/NightSky.tsx` | Background skybox (HDRI equirect texture, slowly rotating) |
| `components/Starfield.tsx` | Near-field parallax stars (drei `<Stars>`) |
| `components/Effects.tsx` | Postprocessing (Bloom, Vignette, Noise) |
| `components/HUD.tsx` | All DOM UI: intro/launch screen, crosshair, target indicator, info popup |
| `lib/planets.ts` | **Single source of truth** for projects: name, description, link, tags, palette, orbit/radius/speed/phase/seed |
| `lib/geometry.ts` | Procedural planet geometry, atmosphere shader, ring texture |
| `lib/noise.ts` | Seeded PRNG (`mulberry32`) + fbm noise helper |
| `lib/store.ts`, `lib/controls.ts`, `lib/scene.ts`, `lib/planetRegistry.ts` | Client state plumbing (see above) |
| `public/sky/` | HDRI sky texture (`NightSkyHDRI008_8K.jpg`, ~22MB) |
| `my-info.md` | Content source (bio, socials, project list) |

## Where to change things

- **Projects / content / planet look:** `lib/planets.ts` (add/edit entries in the `THEMES` array — id, name, description, link, tags, palette, rings). Orbit/radius/speed/phase are computed automatically per index.
- **Flight feel:** `components/Ship.tsx` — `CHASE_OFFSET` (camera distance/height), `HOME`, `accel`, `maxSpeed`, damping, mouse sensitivity (`e.movementX * 0.0022`).
- **Ship model:** the JSX meshes at the bottom of `components/Ship.tsx`.
- **Info popup trigger distance:** `components/SolarSystem.tsx` (`p.radius * 6 + 12`).
- **Lighting / bloom:** `components/Star.tsx` (point light) and `components/Effects.tsx` (`luminanceThreshold`, `intensity`).
- **HUD styling:** Tailwind classes in `components/HUD.tsx` + custom classes in `app/globals.css`.

## Controls (for reference)

WASD fly · mouse steer (pointer-locked) · Q/E roll · Space/Ctrl up/down · Shift boost · R reset · Esc release cursor · Enter opens the targeted project link.
