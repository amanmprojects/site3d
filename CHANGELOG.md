# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

- Starfield is now actual scattered star particles in world space (replaces the drei `<Stars>` shell): a dense 3D volume of 14,000 stars in a 1600-unit cube around the solar system plus a far shell of 6,000 stars (900–2400 units out) for depth — flying through them gives real traversal parallax. Custom shader (`createStarfieldMaterial` in `lib/geometry.ts`) drives per-star size, colour (white/warm/blue tinted), and a soft twinkle; field is deterministically seeded via `mulberry32`, so the sky is identical on every load.
- Ship hull now visibly leans into steering: the nose pitches up/down and the hull banks left/right in proportion to how fast you're pitching/yawing (attitude is cosmetic, applied to the model only — the camera doesn't follow it), so the ship looks like it's physically turning instead of snapping direction (`ATT_PITCH_MAX` / `ATT_ROLL_MAX` / `ATT_RATE_FULL` in `Ship.tsx`).
- Chase camera is now fixed to the centre of the ship's back (`CHASE_OFFSET`) and its orientation lags slightly behind the ship's pitch/yaw/roll (`CAM_LAG_K` in `Ship.tsx`), so on sharp turns you briefly see the top/side of the ship instead of it feeling like a 2D image pasted on the viewport. Camera snaps during warp.
- Ship no longer plays the baked fly-around animation from `ship.glb` (it tumbled/rotated the hull on loop); the model now stays at its authored rest pose and only the flight controls move it.
- Planets now glow: atmosphere shader layers a wide, smooth halo (soft `pow` falloffs at three widths) around a sharper core, planet body materials get a subtle per-planet emissive tint (cloned per planet so shared GLB nodes aren't mutated), and Bloom (threshold 0.85) keeps the halo soft while planet bodies stay crisp.
- Ship now banks (rolls) slightly into turns: roll proportional to yaw rate, easing in fast and unwinding slowly when you straighten out (`BANK_MAX` / `BANK_RATE_FULL` in `Ship.tsx`), so yawing feels more natural.
- Pitch/yaw (mouse + arrow keys) now ease toward the input target each frame (`LOOK_STICKINESS`), so the view feels slightly weighty like the ship's motion instead of snapping; thrust slide-back reduced to 1 unit.
- Camera is now rigidly anchored to the ship (always centered in POV); it slides back up to a fixed distance only while thrusting, then re-anchors (`CHASE_LAG_MAX` in `Ship.tsx`).
- Added boot/loading screen overlay that tracks asset load progress (drei `useProgress`) and fades out when everything is loaded; all GLB/sky assets are now eagerly preloaded in `Experience.tsx` so the progress bar covers the full load.
- Intro launch button is now a `Launch` button that also triggers on Space.
- Switched UI fonts to Google Fonts (`Space Grotesk` + `JetBrains Mono` via `next/font`) and increased all HUD/loading/planet-label font sizes for readability.
