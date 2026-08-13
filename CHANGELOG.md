# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

- Reverse-thrust braking softened: `BRAKE_ACCEL` reduced from 800 to 400 u/s² (full stop from cruise in ~0.7s instead of ~0.3s; from boost ~2.7s), so the S brake coasts you down instead of slamming you to a halt.

- Fixed the movement/direction mismatch: the ship now flies where it points. Added flight-assist steering — the velocity vector continuously turns toward the ship's facing at `STEER_RATE` (2.2 rad/s, `components/Ship.tsx`) instead of drifting forever in the original direction, so mouse and A/D turns now visibly change the trajectory (previously the throttle curve hit zero at cruise speed and steering had no effect on motion at all). Corrected the intro control hints (A/D turn, arrow keys pitch).

- Flight feel buffed: acceleration (`ACCEL` 400 u/s², was 135) and reverse-thrust braking (`BRAKE_ACCEL` 800 u/s², was 260) are much faster, boost thrust raised to 1000 u/s² (was 390), and the boost speed cap raised to 1100 u/s (was 780). HUD speedometer bar and boost mark updated to match.

- Removed the planet glow sprite entirely — planets now render as plain phoenix bodies with no halo or atmosphere effect.

- Universe scaled up ~4× to match the bigger planets: orbits now span ≈6000–36800 units (was ≈1500–9200), skybox grew to 180000 units, camera far plane to 240000, and the starfield volume/shell distances scaled to match (24000-unit cube, 60000–128000 far shell). Ship spawn (`HOME`) moved out to stay near the inner orbit.
- Star particles multiplied ~5×: 120k fly-through volume stars (was 26k) + 60k far-shell stars (was 12k).
- Planet glow switched from a fresnel rim shader on a sphere (read as a hard boundary) to a soft billboard glow sprite — a white radial-gradient texture, additive-blended, no hard edge — whose opacity fades with distance (`smoothstep(radius*2, radius*10, dist)`), so it dims as you get closer and disappears near the surface.

- Spaceship flight now has real inertia: thrust builds speed smoothly (`ACCEL` 135 / `BOOST_ACCEL` 390 u/s²) and tapers off via a throttle curve as you near the soft speed caps (`MAX_SPEED` 270 / `BOOST_MAX_SPEED` 780 u/s) instead of a hard clamp; there's no friction in space, so coasting keeps your speed forever and steering drifts. S applies reverse thrust to brake (`BRAKE_ACCEL` 260 u/s²), and releasing boost above cruise bleeds speed back down to `MAX_SPEED`. HUD speed readout moved from top-left to a proper bottom-right speedometer (live u/s counter + bar + cruise/boost marks); it now shows actual per-frame speed, including autopilot warp (~2700 u/s).

- Planets and the sun are now ~3.5× bigger: planet radii scale up to ≈119–266 units (`radius` in `lib/planets.ts`) and the sun's model scale + glow sprite tripled-and-a-half (`MODEL_SCALE` / `GLOW_SIZE` in `Star.tsx`), so both read much larger against the skybox.

- Planets now all show the phoenix GLB's original colors (no per-planet tint or emissive), and the colored atmosphere glow was replaced with a faint white glow (`#eef2f8`, intensity 0.7) that fades with camera distance (`uFade` uniform, `smoothstep(radius*2, radius*10, dist)` in `Planet.tsx`) — visible from afar, softening and disappearing as you fly closer.
- All planets now use the single `planet_of_phoenix.glb` model (replaces `various_planets.glb`, ~110MB → ~51MB): each planet clones the `Phoenix_LOD0__0` mesh (body unit radius 22, scaled to `radius`), tinted by its project palette — body color, emissive, and atmosphere glow all use `palette.atmosphere`, so every planet gets its own hue and the glow matches the surface color. The `model` field was removed from `lib/planets.ts` and `Planet.tsx`.
- Speed-proportional motion blur: a custom radial warp-blur effect (16-tap zoom blur toward screen center, `components/WarpBlur.tsx`) whose strength scales with the ship's actual per-frame speed (`lib/motion.ts`, written by `Ship` — covers normal flight, boost, and autopilot warp) via an exponential curve smoothed per frame in `Effects.tsx`; at cruise the scene softens slightly, at boost/warp it streaks into warp lines.

- Solar system scaled up roughly 15×: orbit radii now span ≈1500–9200 units (was 108–486) and planet radii 34–76 (was 1.5–3.2, so planets are now ~10–20× the ship's size and read as real worlds). The sun, skybox (45000 units), camera far plane (60000) and starfield were scaled to match, so planets are visible from spawn and inter-planet flight genuinely takes time.
- Ship now collides with planets instead of passing through: the hull is pushed out to `SURFACE_CLEARANCE` (9 units) off the surface, the inward velocity is reflected and damped, and the camera shakes on impact. Autopilot warp aborts if its flight path clips a planet, and warp speed was raised to 2700 u/s so cross-system hops take a few seconds of travel.
- Orbit lines dimmed way down (opacity 0.07) and recolored near-white so the ring system reads as a faint guide instead of glowing blue.
- Planet info scan range tightened to `p.radius * 3 + 30` (was `p.radius * 12 + 40`) so the popup only appears once you're actually close to the (much bigger) surface; HUD speed bar recalibrated for the new boost cap.

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
