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
| M | System map (unlocks pointer, one-click warp to any planet) |
| Esc | Release cursor / back to launch screen (cancels any warp) |
| Enter | Open the targeted project's link |

On touch devices a virtual stick (steer) and thrust/brake/boost buttons appear instead of pointer lock, and an "exit" button sits in the top-right. The intro screen's planet grid is keyboard-navigable (arrows + Enter) and every planet can be warp-targeted with one tap/click.

## Features

- Three flight-input paths (pointer-locked mouse, arrow keys, touch stick), flight-assist steering, planet + sun collision with camera shake
- Autopilot warp to any planet from the intro grid, planet labels, radar/minimap, and proximity-scanned info panels with live GitHub repo stats
- Synthesized Web Audio engine (engine hum, boost roar, warp drone, pad, chimes) — no audio assets
- Quality presets (auto-detected, localStorage-persisted), reduced-motion mode, planet LOD, WebGL-unavailable fallback page
- Crawler-friendly: OG/Twitter image, JSON-LD project list, sr-only project index

## Commands

```bash
npm run dev          # dev server (Turbopack)
npm run build        # refresh repo data (GitHub API) + production build
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit
npm run fetch-repos  # refresh lib/repoData.json without building
```

## Tech highlights

- Client-only 3D scene (`<Canvas>` dynamically imported with `ssr: false`) with HUD overlay driven by a Zustand store
- Postprocessing: bloom, vignette, noise, and speed-scaled radial warp blur
- Full-system starfield (2.4M instanced-ish particles) + ship-relative streaming space dust
- Sketchfab models (`ship.glb`, `planet_of_phoenix.glb`, `stroming_sun.glb`) repacked with `scripts/optimize-glb.mjs` to keep embedded textures browser-safe
- Live repo metadata fetched at build time from the GitHub API into a committed snapshot (`lib/repoData.json`) — builds never depend on the network succeeding
- Graceful degradation: WebGL-unavailable fallback with the plain project list, quality presets, and reduced-motion support
- No server-side runtime — pure static deploy

Deployed with [Vercel](https://vercel.com).
