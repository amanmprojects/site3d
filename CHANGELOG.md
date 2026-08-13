# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

- Pitch/yaw (mouse + arrow keys) now ease toward the input target each frame (`LOOK_STICKINESS`), so the view feels slightly weighty like the ship's motion instead of snapping; thrust slide-back reduced to 1 unit.
- Camera is now rigidly anchored to the ship (always centered in POV); it slides back up to a fixed distance only while thrusting, then re-anchors (`CHASE_LAG_MAX` in `Ship.tsx`).
- Added boot/loading screen overlay that tracks asset load progress (drei `useProgress`) and fades out when everything is loaded; all GLB/sky assets are now eagerly preloaded in `Experience.tsx` so the progress bar covers the full load.
- Intro launch button is now a `Launch` button that also triggers on Space.
- Switched UI fonts to Google Fonts (`Space Grotesk` + `JetBrains Mono` via `next/font`) and increased all HUD/loading/planet-label font sizes for readability.
