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
   - `levels` (밝기 단계): The camera sampled into numbered pixel cells quantized to 2, 10 or 256 brightness steps (from the same rounded 0-255 grey the math view shows: step = floor(grey × levels ÷ 255)); in 2단계 the black/white threshold (0-255) is set with a lever
   - `math` (수학 처리): The camera as grey numbered cells with one calculation applied (`core/imageMath.js`): 밝기 adds, 대비 stretches around 128, 블러 is a Gaussian weighted average (3×3/5×5/7×7, Pascal-row weights, 3×3 = 1·2·4 ÷ 16), 선명 is an unsharp mask that adds back the difference from the 3×3 Gaussian average. Tapping the selected calculation again returns to the original numbers; the right lever sets its strength (`MATH_SLIDERS`). Its card writes the calculation as a formula with the lever's value; 밝기 and 대비 draw it as a linear function graph (`y = x + 60`, `y = 2(x − 128) + 128`) with the marked cell as a dot, blur and sharpen keep a 3×3 before → after example labelled 예시. Both use the same functions as the screen (#39)
   - Magnifier (`ui/magnifier.js`, #40): pressing the artwork shows a round lens with a fixed 3× view under the finger; it follows while held and stays on the released spot for 2 seconds (`HOLD_AFTER_RELEASE`), because the exhibit's radar sensor turns touches into short presses; a new press in that time moves it. The lens outlines the cell under the finger, a caption on the far side of the lens from the finger writes that cell's calculation, and for blur and sharpen it outlines the averaged neighbours with their 3×3 weights. The frame loop's `onDrawn` hook lets it copy each frame before the WebGL buffer is presented. Only `#magnifierArea` (the artwork area) takes touches
   - Marked cell (`ui/cellPicker.js`, `ui/cellCard.js`, `core/cellReadout.js`): one cell, outlined on the picture, starts mid-picture and moves to wherever the picture was last pressed. `readCell` reads it back from the frame that was just drawn (`onDrawn(frame)`) with the same buffers and functions, and the card under the controls writes its numbers into the view's rule (`(140 − 128) × 2 + 128 = 152`, `밝기 183 ÷ 25.5 = 7.1 → 7`); 미디어 아트 shows how much of the screen is 1 instead, and its lens caption shows the AI's person probability against the 63% threshold
   - 한국어 / English (`i18n.js`): a two-button switch in the control block's first row. Visible text in the data files is `{ ko, en }` pairs read through `t()`; switching redraws buttons, levers and the card but keeps the mode and lever values. The app starts in Korean; keep English captions short (~11 characters) so they fit the monospaced buttons
   - Pixels everywhere: there is no camera-quality view; cells too small for readable digits (< 7px font) stay plain colour
   - Blur tip (`ui/blurTip.js`, `BLUR_TIP` / `getBlurTipStep` in `data/modeOptions.js`): digits hide the blur at the 24px start, so picking 블러 floats a card under the levers, "① shrink the cells to 12px (`BLUR_CELL_SIZE`, the largest size without digits) ② change the blur size". It points at and lights the lever to move next, never takes touches, and leaves after 10s, once the blur size changes with small cells, or when the view changes
   - Levers (`ui/modeSliders.js`): a two-slot row under the option buttons. Left: cell size (`CELL_SIZES` in `config.js`, all modes, default 24px; floored at 24px in the combined RGB view so its three numbers always fit, `getCellSizeFloor`). Right: the view's own lever (`getModeSlider`), or a hint that keeps the slot in place
   - All touch controls sit in one block in the middle of the screen height in the side column; the rule card above gets a little more height (1.4 : 1) than the marked-cell card below, and the block keeps one height in every mode
   - Every mode draws in the same fixed screen left of the side column (whole camera frame fitted to whole cells); `rgb` and `levels` skip segmentation. The side column takes what a 4:3 picture leaves at full height (`--side-column-width`), so the visitor's picture is as large as the screen allows; below 900px of height the controls size with the screen
   - There are no F-key filter controls; touch buttons pick views and the two levers adjust them
   - The rule card above the controls holds a title, the rule as one calculation with the right lever's value written in, one picture and at most one short fact per mode/option (`data/modeExplanations.js`, `ui/explainAnimations.js`, `ui/mathPanel.js`). Keep it to that: the marked-cell card and the magnifier carry the visitor's own numbers

3. **Real-time Processing**: Uses TensorFlow.js BodyPix model for person segmentation with mirrored video display

### Project Site

- `site/` holds the GitHub Pages site (`index.html`, `patch-notes.html`, `credits.html`, `style.css`). `scripts/build-site.js` (`npm run site`) copies it to `_site/` with `docs/images/readme/*` as `images/` and renders `CHANGELOG.md` into the patch notes page; `.github/workflows/pages.yml` deploys it on main pushes that touch those files
- Pages are plain HTML with `{{VERSION}}`, `{{DOWNLOAD_URL}}`, `{{UPCOMING_NOTE}}` and `<!-- PATCH_NOTES -->` placeholders filled at build time; keep them dependency-free
- Both languages live in the markup as `data-l="ko"` / `data-l="en"` siblings (images use `data-alt-ko` / `data-alt-en`); `site/app.js` and the `<head>` snippet pick the language (`?lang=`, saved choice, then browser language) and the theme (saved choice, then the system's). Light theme tokens are in `site/style.css`
- English patch notes come from `CHANGELOG.en.md` (optional per version; missing versions show the Korean notes)
- The patch notes page keeps the version list in view: a sticky side list beside the notes, or a sideways bar under the header on narrow screens. `site/app.js` measures the sticky header (`--header-h`, on every page, so the home page's `.section` anchors land below it too) and bar (`--toc-h`) so anchors land below them, and marks the version being read with `aria-current`
- `credits.html` lists the makers (the teacher who shaped the project's direction, shown with the school logo and a LinkedIn link, then the BSSM Ascending team with GitHub avatars) and the partners with their logos (`site/assets/credits/`). Logos keep their own colors on a light plate (`--logo-plate`) in both themes.
- The header menu has four tabs on every page: 프로젝트 (the home page), 패치노트, 기여자 and GitHub, which opens in a new tab and carries an external-link arrow. Below 740px the menu moves to its own row
- The home page opens with a 3D animation (`site/hero.js`, Three.js 0.160.0 from jsDelivr as an ES module): the drawn scene as 64×48 blocks (`site/assets/scene-64x48.png`, `person-64x48.png`) going photo → brightness as height → R/G/B layers fanned like the app → person as 1. Captions follow one sample cell in both languages; it pauses off screen, shows a still frame for reduced motion, and keeps the hero screenshot if WebGL or the module fails. `window.__heroSeek(seconds)` jumps to a moment for screenshots
- `forge.config.js` keeps `assets/`, `docs/`, `site/`, `tests/`, `scripts/`, dot folders and root Markdown out of the installer

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
- App icon: `assets/icon/` (`icon.icns`, `icon.ico`, `icon.png`) is the site's 3×3 brand mark on a dark rounded plate, drawn by `scripts/build-app-icons.js` (run it on macOS to regenerate); `forge.config.js` hands it to the packager and the Squirrel installer

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
