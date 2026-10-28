# Changelog

English patch notes for the project site. CHANGELOG.md (Korean) is the source of
the Release notes; each version here mirrors its entry, and a version missing from
this file is shown in Korean on the site.

## [Unreleased]

### New

- The exhibit now has four modes: Media Art, RGB Color, Brightness and Image Math.
- RGB Color: the camera is shown as pixel cells with their numbers. Pressing `R`, `G` or `B` separates the red, green and blue layers of light and keeps the one you picked, with its strength (0~255) in every cell. Press it again to return to full color, where large cells show all three numbers.
- Brightness: the camera's brightness is cut into 2, 10 or 256 steps, with the step number in every cell.
- Cell size lever: every mode can use 8~48px cells. It starts at 24px.
- Threshold lever: in 2 steps, move the 0~255 point that separates 0 from 1.
- 한국어 / English: a switch in the first row of the controls changes every word to English, keeping the mode and lever values.
- Magnifier: press and hold the picture and a 3× lens floats above your finger, so even small numbers are readable. It outlines the pressed cell and writes its calculation beside the lens; for blur and sharpen it also marks the neighbours that are averaged and their weights.
- Image Math: pick brighten (add), contrast (multiply), blur (Gaussian weighted average) or sharpen (boost the difference) and see how every number changes. A lever sets the strength; brighten and contrast are drawn as linear function graphs (`y = x + 60`), blur and sharpen as a 3×3 example.
- Rule card: each mode shows its name, its rule as one calculation with the lever's value, and one picture.
- Marked cell: one cell of the picture is outlined, and the card right under the levers puts its real numbers into the rule (`(140 − 128) × 2 + 128 = 152`). Moving a lever changes the calculation, and pressing the picture moves the mark to that cell.
- Media Art: the magnifier shows the AI's chance that the pressed cell is a person (63% or more becomes 1), and the marked-cell card shows how much of the screen is 1.

### Changed

- Media Art: cells with a person are 1 and every other cell is 0, filling the whole screen. An empty room is a screen of zeros.
- Every touch control now sits at the vertical middle of the screen.
- Media Art draws into the same fixed screen as the other modes.
- The side column is narrower so the picture fills the screen height: 1320×984 at 1920×1080. Mode and calculation buttons sit in two rows.
- Brightness steps are taken from the whole-number 0~255 brightness written on screen.
- The F-key filter panel is gone.

### Fixed

- Buttons no longer shift by 7px when switching modes.

## [1.0.2] - 2026-08-27 - Kid-friendly buttons

### Changed

- Mode buttons are stacked vertically so children can use them easily.
- The mode hint wraps and centres more neatly.
- The project text is rewritten for children.

## [1.0.1] - 2026-08-27 - Steady explanation card

A patch for the top card changing height when a mode description wrapped on Windows.

### Fixed

- The mode description always keeps room for two lines.
- The card keeps its size whatever the screen ratio or the platform's line breaking.

## [1.0.0] - 2026-08-25 - First stable version

The first stable version, with the final feedback from the Busan Mathematical Culture Center.

### Exhibit

- The app opens straight into the media art, with no setup screen.
- The mode buttons are tidier and the selected one stands out more.
- The silhouette is drawn above the interface, so it reads naturally.
- The heart-gesture screen is switched off to keep the exhibit clean.

### Stability and performance

- Drawing and AI person detection run on separate schedules, so the screen stays smooth after hours of running.
- Frame, person-mask and filter memory is reused instead of reallocated.
- Cleaning up the person mask no longer allocates memory over and over.

## [0.3.1] - 2026-07-30 - Camera fit

### Fixed

- The camera fills the media art screen with no empty space.
- Tall phone cameras (iPhone, DroidCam) and 4:3 cameras keep people in proportion.
- Only the overflow is cropped, evenly around the centre.
- The silhouette and hand detection line up with the camera more precisely.

## [0.3.0] - 2026-07-30 - Window mode and easier reading

### New

- The app starts in a window and one button switches between full screen and window. Full screen also works on macOS.

### Changed

- The text size control is simpler.
- The live info panel's text and screen-size layout are easier to read.

### Release

- The public Release notes now come from the release pull request.

## [0.2.0] - 2026-07-29 - Automatic updates

### New

- The app checks the public releases repository (`media-art-for-windows-releases`) and downloads new versions on its own.
- A small notice shows the download, then offers `Restart now` or `Later`.
- If the check fails, the exhibit carries on undisturbed.

### Docs

- Documents the existing desktop and Start menu shortcuts created on install.

## [0.1.0] - 2026-07-29 - First public version

The media art built since March 2026, released for the first time as a Windows installer.

### In this version

- **Four modes**: `Original` (the person in 0s and 1s), `Black & white` (crisp outline), `Binary` (0/1 characters) and `Numeric` (brightness as 0~9). Pick them with touch buttons or keys `1`~`4`.
- **Hidden modes**: keys `5`~`9` show Busan Mathematical Culture Center letters, pixel values, RGB, 8-bit grey and 4-bit color.
- **Precise person detection**: MediaPipe person segmentation together with hand tracking keeps fingers, and small false detections like wall clocks or pillars are removed.
- **Text size**: small, normal and large buttons and the `[` `]` keys change the character (cell) size between 4 and 32px.
- **Math explanations**: `M` opens a math panel with the mode's formula, the person's brightness average, minimum and maximum, and a color-depth table. `E` shows the exhibit text, `I` the info panel and `F` a brightness, blur, sharpen and edge filter panel.
- **Heart gesture**: making a heart with your hands in front of the camera shows a heart screen.

### Release

- The app and the Windows installer are both named `media-art-for-windows`.
- A release workflow uploads the unsigned Windows installer to the public releases repository.

### How it got to 0.1.0

- **March 2026**: the first media art drawing the person in 0s and 1s with TensorFlow BodyPix, and camera selection
- **April**: numeric and Busan letter modes; pixel value, RGB, 8-bit grey and 4-bit color modes; image filters; code restructuring and tests
- **May**: person detection moved to MediaPipe, with hand tracking for better fingers
- **June**: a live math panel from the first feedback, and on-screen text size control
- **July**: the heart gesture and preparing the public Windows release
