# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron application called "Binary Media Art" that creates real-time media art visualizations using computer vision. It uses TensorFlow.js and BodyPix for human body segmentation to transform webcam feed into artistic representations.

## Development Commands

- `npm start` - Start the Electron application in development mode
- `npm run package` - Package the application for distribution
- `npm run make` - Create distributable packages/installers
- `npm run publish` - Publish the application
- `npm run lint` - Run linting (currently just echoes "No linting configured")

## Architecture

### Core Components

- **Main Process** (`src/index.js`): Electron main process that creates a fullscreen window with camera and TensorFlow.js integration
- **Renderer Process** (`src/renderer.js`): Contains the main application logic for camera handling, AI model loading, and real-time visualization
- **Preload Script** (`src/preload.js`): Provides access to TensorFlow.js and BodyPix models in the renderer process

### Key Features

1. **Camera Selection**: Users can select from available cameras via dropdown
2. **Multiple Visualization Modes** (touch buttons; keys 1-4, legacy modes on 5-9):
   - `original` (미디어 아트): Every cell is a bit: cells where segmentation found a person are `1` in the camera colour pulled toward cyan (bright ones glow), all other cells are a dim `0`; an empty room is a screen of zeros
   - `rgb` (색 RGB): The camera sampled into numbered pixel cells, drawn as additive WebGL R/G/B layers; each cell shows its 0-255 value for the selected light, or all three stacked values in the full colour once cells are 24px or larger. The mode button opens the full colour, R/G/B buttons split the layers apart (1.8s transition) and a second tap on the selected light returns to the full colour (`data/modeOptions.js`)
   - `levels` (밝기 단계): The camera sampled into numbered pixel cells quantized to 2, 10 or 256 brightness steps; in 2단계 the black/white threshold (0-255) is set with a lever
   - `math` (수학 처리): The camera as grey numbered cells with one calculation applied (`core/imageMath.js`): 밝기 adds, 대비 stretches around 128, 블러 is a Gaussian weighted average (3×3/5×5/7×7, Pascal-row weights, 3×3 = 1·2·4 ÷ 16), 선명 is an unsharp mask that adds back the difference from the 3×3 Gaussian average. Tapping the selected calculation again returns to the original numbers; the right lever sets its strength (`MATH_SLIDERS`). Its card shows a one-line formula and a 3×3 before → after example computed with the same functions (#39)
   - Magnifier (`ui/magnifier.js`, #40): pressing the artwork shows a round lens with a fixed 3× view under the finger; it follows while held and hides on release. The frame loop's `onDrawn` hook lets it copy each frame before the WebGL buffer is presented. Only `#magnifierArea` (the artwork area) takes touches
   - 한국어 / English (`i18n.js`): a two-button switch in the control block's first row. Visible text in the data files is `{ ko, en }` pairs read through `t()`; switching redraws buttons, levers and the card but keeps the mode and lever values. The app starts in Korean; keep English captions short (~11 characters) so they fit the monospaced buttons
   - Pixels everywhere: there is no camera-quality view; cells too small for readable digits (< 7px font) stay plain colour
   - Levers (`ui/modeSliders.js`): a two-slot row under the option buttons. Left: cell size (`CELL_SIZES` in `config.js`, all modes, default 24px; floored at 24px in the combined RGB view so its three numbers always fit, `getCellSizeFloor`). Right: the view's own lever (`getModeSlider`), or a hint that keeps the slot in place
   - All touch controls sit in one block at exactly mid screen height in the side column; the explanation is split into equal cards above and below it
   - Every mode draws in the same fixed screen left of the side column (whole camera frame fitted to whole cells); `rgb` and `levels` skip segmentation
   - There are no F-key filter controls; touch buttons pick views and the two levers adjust them
   - The side column's explanation card uses metaphors, a CSS animation and term chips per mode/option (`data/modeExplanations.js`, `ui/explainAnimations.js`)

3. **Real-time Processing**: Uses TensorFlow.js BodyPix model for person segmentation with mirrored video display

### Project Site

- `site/` holds the GitHub Pages site (`index.html`, `patch-notes.html`, `style.css`). `scripts/build-site.js` (`npm run site`) copies it to `_site/` with `docs/images/readme/*` as `images/` and renders `CHANGELOG.md` into the patch notes page; `.github/workflows/pages.yml` deploys it on main pushes that touch those files
- Pages are plain HTML with `{{VERSION}}`, `{{DOWNLOAD_URL}}`, `{{UPCOMING_NOTE}}` and `<!-- PATCH_NOTES -->` placeholders filled at build time; keep them dependency-free
- `forge.config.js` keeps `docs/`, `site/`, `tests/`, `scripts/`, dot folders and root Markdown out of the installer

### Technology Stack

- **Electron 41.1.0**: Desktop application framework
- **TensorFlow.js**: Machine learning framework for body segmentation
- **BodyPix**: Pre-trained model for human pose estimation and body segmentation
- **Canvas API**: For real-time video processing and text rendering

### Key Configuration

- Application runs in fullscreen mode with no frame
- Window dimensions: 1920x1080 (default)
- Font size: 8px Courier New for text rendering
- ESC key quits the application
- Node integration enabled with context isolation disabled for TensorFlow.js access

### File Structure

- `src/index.js` - Electron main process
- `src/renderer.js` - Main application logic (384 lines)
- `src/preload.js` - TensorFlow.js module loading
- `src/index.html` - Application UI structure
- `src/index.css` - Application styles

### Development Notes

- The application requires camera permissions to function
- BodyPix model loading can take time on first startup
- Video processing runs at display refresh rate using requestAnimationFrame
- All text rendering uses fixed-width font for consistent visual output
- Person segmentation threshold is set to 0.5 for optimal detection
