# Site 3D — Space Exploration Portfolio

A 3D space-exploration portfolio: pilot a spaceship (third-person chase cam) through a solar system where each orbiting planet represents one of Aman Mehtar's projects. Fly close to a planet to scan it and read its info panel.

Built with **Next.js 16 (App Router) + React 19 + TypeScript + React Three Fiber**, Tailwind CSS 4, and Zustand for UI state. Planet bodies come from a single Sketchfab GLB, cloned per project.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Controls

| Input | Action |
|---|---|
| Mouse | Pitch / yaw steer (pointer-locked) |
| W / S | Thrust / brake |
| A / D | Roll |
| Shift / Space | Boost |
| R | Reset |
| Esc | Release cursor / back to launch screen |
| Enter | Open the targeted project's link |

## Commands

```bash
npm run dev        # dev server (Turbopack)
npm run build      # production build (runs its own TS check)
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
```

## Tech highlights

- Client-only 3D scene (`<Canvas>` dynamically imported with `ssr: false`) with HUD overlay driven by a Zustand store
- Postprocessing: bloom, vignette, noise, and speed-scaled radial warp blur
- Full-system starfield (2.4M instanced-ish particles) + ship-relative streaming space dust
- Sketchfab models (`ship.glb`, `planet_of_phoenix.glb`, `stroming_sun.glb`) repacked with `scripts/optimize-glb.mjs` to keep embedded textures browser-safe
- No server-side runtime — pure static deploy

Deployed with [Vercel](https://vercel.com).
