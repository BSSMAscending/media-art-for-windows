# AGENTS.md

## Project overview

Binary Media Art is a fullscreen Electron installation that turns a webcam feed
into real-time, computer-vision-driven visualizations. It uses TensorFlow.js,
MediaPipe Tasks Vision, and Canvas rendering.

## Commands

- `npm start` — run the Electron app in development mode.
- `npm test` — run the Vitest suite.
- `npm run lint` — run ESLint on `src/`.
- `npm run format` — format renderer source files with Prettier.
- `npm run package` — package the app for the current platform.
- `npm run make` — create distributable artifacts with Electron Forge.

## Architecture

- `src/main/index.js` — Electron main process, fullscreen window, custom asset
  protocol, and application lifecycle.
- `src/preload.js` — renderer preload entry point.
- `src/renderer/renderer.js` — camera startup, UI state, controls, and the
  frame-loop integration.
- `src/renderer/core/` — camera access, segmentation, hand gestures,
  and frame processing.
- `src/renderer/modes/` — visualization-specific Canvas renderers. `rgb.js` and
  `levels.js` draw numbered pixel cells over the WebGL layer in
  `core/channelOverlay.js`; `rgbTransition.js` animates the R/G/B layer split.
- `src/renderer/core/renderGeometry.js` — artwork area beside the side column,
  full-frame grid fitting, and RGB layer projection bounds.
- `src/renderer/data/modeExplanations.js` — metaphor copy for the explanation
  card; `src/renderer/ui/explainAnimations.js` builds its CSS animations.
- `src/renderer/ui/` — information, mathematics, education, background, and
  gesture overlay UI.
- `src/renderer/index.html` and `src/renderer/index.css` — renderer markup and
  visual system.

## Development guidelines

- Keep the main process, renderer state, and frame-processing responsibilities
  separate.
- Preserve fixed-width rendering for visual modes unless a mode explicitly
  requires a different treatment.
- Keep user-facing Korean copy consistent with the existing exhibition tone.
- The exhibit is touch-first: adjust settings with large buttons, not sliders,
  and explain ideas with metaphors and animation rather than formulas or long
  text.
- Add or update tests for configuration and logic changes when an existing test
  boundary covers them.
- Run `npm test` after application changes. Treat unrelated lint failures as
  pre-existing unless the current change touches their source.
- Do not commit credentials, generated artifacts, `.idea/`, or `.omo/`.

## Distribution

Electron Forge configuration lives in `forge.config.js`. The GitHub Actions
workflows live in `.github/workflows/`; the default development build produces
unsigned Windows artifacts.
