# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

- Added boot/loading screen overlay that tracks asset load progress (drei `useProgress`) and fades out when everything is loaded; all GLB/sky assets are now eagerly preloaded in `Experience.tsx` so the progress bar covers the full load.
- Intro launch button is now a `Launch` button that also triggers on Space.
