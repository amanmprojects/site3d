# Roadmap

## Phase 2

Phase 1 shipped a working 3D space-exploration portfolio: pilot a ship through a
solar system where each orbiting planet is a project, fly close to scan it.
Phase 2 builds on that foundation across four pillars, delivered as one
focused PR per pillar.

> Tracking note: the GitHub connection used for this work exposes no
> "create issue" tool, so the pillars are tracked here and in the in-session
> task list rather than as GitHub issues. Each PR references this roadmap.

### Pillar 1 — Distinctive planets  ·  **SHIPPED (PR #1)**

Every planet is now visually unique instead of a raw clone of the phoenix mesh:
per-planet material tint from `palette`/`type`, a distance-faded fresnel
atmosphere halo in each project's color, emissive pulse on lava/tech planets
(Bloom picks it up), and banded rings on purr, grok-token-tracker, chess, kairo.
Branch: `phase2/distinctive-planets`.

### Pillar 2 — Audio  ·  **SHIPPED (PR #2)**

A thin, fully-synthesized Web Audio layer (no asset files): engine hum that
tracks `motion.speed`, filtered-noise boost roar above cruise, a warp drone
while autopilot-warping, a low ambient pad, a two-note scan chime when an info
panel opens, and a noise-sweep whoosh on warp start. Mute toggle in the HUD
(`muted` in the Zustand store). Audio is lazily created and resumed on the first
user gesture (Launch / Space) to satisfy autoplay policy.
Files: `lib/audio.ts` (new), `lib/store.ts`, `components/HUD.tsx`.
Branch: `phase2/audio`.

### Pillar 3a — Touch controls + navigation aids  ·  **SHIPPED (PR #3)**

Virtual stick (steer) + thrust/boost buttons, optional gyro; pointer-lock path
gated behind a touch check so desktop mouse/keyboard is untouched. A corner
radar/minimap showing planets + ship heading, and a system-map overlay to
jump/warp with one tap (helps because planets move and the system is large).

### Pillar 3b — Live GitHub content  ·  **SHIPPED**

Enrich `THEMES` with live repo metadata (stars, primary language, last-updated)
via the GitHub REST API at build time or a cached client fetch, so `planets.ts`
stays in sync with the real repos. `my-info.md` stays the curated list of *which*
repos to feature; the API fills in live data.
Shipped as: `scripts/fetch-github.mjs` → committed `lib/repoData.json` snapshot
(refreshed at build time, never fails the build), `repo` field on every planet,
live stats line in the info popup, language badges in the intro grid.

### Pillar 4 — Polish, performance, accessibility  ·  **SHIPPED**

Quality presets (Low/Med/High) toggling starfield/dust counts, bloom
multisampling, HDRI resolution — adaptive on first load. LOD for planet meshes
(12 clones). Retuned warp blur (speed-scaled smoothstep, only smears at
warp-class speeds). Reduced-motion mode (kills twinkle/shake/blur/pulse), full
keyboard flow for the intro (autofocused Launch, arrow-key planet grid), focus
styles on every `pointer-events-auto` control, radar `aria-label`, real OG image
+ sr-only project list + JSON-LD so links and crawlers preview correctly.
Touch users can open project links from the info popup.

---

## PR sequence

1. **PR-1** — Pillar 1 (distinctive planets)  ·  shipped
2. **PR-2** — Pillar 2 (audio)  ·  shipped
3. **PR-3** — Pillar 3a (touch + nav aids)  ·  shipped
4. **PR-4** — Pillar 3b (live GitHub content)  ·  shipped
5. **PR-5** — Pillar 4 (polish/perf/a11y)  ·  shipped

Every PR follows the repo conventions in `AGENTS.md`: client-only `'use client'`
on new R3F components, `pointer-events-auto` on clickable HUD elements,
`npm run typecheck` + `npm run build` green, a `CHANGELOG.md` `[Unreleased]`
entry, and an `AGENTS.md` update where conventions move.
