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
2. **Multiple Visualization Modes** (touch buttons; keys 1-3, legacy modes on 4-8):
   - `original` (원본): Binary overlay (0/1) with cyan color effects on the segmented person silhouette
   - `rgb` (색 RGB): Full camera frame as additive WebGL R/G/B layers; 전체/R/G/B buttons split the layers apart (1.8s transition) and settled channels show each cell's 0-255 value
   - `levels` (밝기 단계): Full camera frame quantized to 2, 10 or 256 brightness steps (buttons, no sliders); each cell shows its step number over the matching grey
   - Full-frame modes (`rgb`, `levels`) skip segmentation and fit the whole camera into the area left of the side column
   - The side column's explanation card uses metaphors, a CSS animation and term chips per mode/option (`data/modeExplanations.js`, `ui/explainAnimations.js`)

3. **Real-time Processing**: Uses TensorFlow.js BodyPix model for person segmentation with mirrored video display

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
