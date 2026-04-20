# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Released]

## [0.1.1]

### Added

- Optional `drawWeight` on custom letter paths (`CustomLetterPath` /
  `ResolvedPath`) to weight subpaths in the stroke-reveal timeline when the
  naive path-length estimate is misleading.

### Fixed

- Lowercase **t** crossbar: use an explicit `L` segment instead of `H` so
  `estimatePathLength` counts the bar; pair with `drawWeight` on that path so
  the crossbar no longer snaps or races the stem during animation.

## [0.1.0]

### Added

- `<Letters />` component with Hershey layout, hand-tuned Bézier glyphs,
  and Framer Motion-driven reveal.
- Declarative props: `text`, `autoPlay`, `loop`, `progress`, `animation`,
  `overlap`, `strokeWidth`, `color`, `variant`, `opts`, `svgDefs`.
- Imperative ref (`LettersHandle`): `play`, `pause`, `replay`, `reset`,
  `isPlaying`, `subscribe`.
- `useLettersController()` hook with reactive `isPlaying` / `progress`.
- Event callbacks: `onComplete`, `onPlayingChange`, `onProgressChange`.
- `loop` cycles forever as forward (full duration) → reverse (½ duration) →
  forward → … Matches the original site demo's "write then un-write then
  re-write" pattern. `onComplete` fires once per forward iteration.
- `rewindBeforePlay` — when `play()` / `replay()` starts from a drawn state,
  first un-writes back to 0 (at ½ forward duration) before drawing forward.
  Only affects manual playback; looping always rewinds between iterations.
- `loopPauseMs` — hold the drawn state for N ms after each forward draw
  completes, before the reverse phase starts.
- Published as dual ESM + CJS with `"use client"` preserved for Next.js App
  Router. Peers: `react`, `react-dom`, `framer-motion`.
