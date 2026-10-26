# Binary Media Art Design System

## 1. Atmosphere & Identity

The installation feels like a legible observation instrument inside a dark gallery: the live camera work remains the focal point while the interface uses restrained cyan signals to explain what is happening. Its signature is a crisp monochrome technical overlay with one unequivocal active-control state.

## 2. Color

### Palette

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Surface/primary | `--surface-primary` | `#000000` | Canvas and page background |
| Surface/panel | `--surface-panel` | `rgba(0, 5, 13, 0.94)` | Information panels |
| Text/primary | `--text-primary` | `#e9ffff` | Headings and selected controls |
| Text/secondary | `--text-secondary` | `#85c7ce` | Explanatory copy |
| Text/muted | `--text-muted` | `#4b777d` | Hints and inactive metadata |
| Border/default | `--border-default` | `rgba(0, 255, 255, 0.55)` | Panel and button outlines |
| Border/subtle | `--border-subtle` | `rgba(0, 255, 255, 0.18)` | Inactive controls and dividers |
| Accent/primary | `--accent-primary` | `#00ffff` | Focus, active state, cue line |
| Accent/soft | `--accent-soft` | `rgba(0, 255, 255, 0.1)` | Active surface fill |
| Control/selected | `--control-selected-background` | `#00d5d5` | Selected control fill |
| Control/selected-text | `--control-selected-text` | `#001111` | Selected control text |
| Status/error | `--status-error` | `#ff3366` | Camera and model errors |

### Rules

- The canvas remains black and receives the strongest contrast.
- Cyan is reserved for interaction, orientation, and the live artwork's existing language.
- Panels use transparency so the exhibition surface remains visible behind them.
- Selected controls use a cyan fill and 3px outline so their state remains clear at installation viewing distance.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Usage |
| --- | --- | --- | --- | --- |
| Panel title | `clamp(18px, 1.40625vw, 28px)` | `700` | `1.3` | Right-side headings |
| Body | `clamp(16px, 1.25vw, 24px)` | `400` | `1.6` | Explanations and mode summaries |
| Control | `clamp(16px, 1.25vw, 24px)` | `700` | `1.3` | Mode buttons and labels |
| Caption | `clamp(12px, 0.9375vw, 18px)` | `400` | `1.4` | Supporting values and metrics |

### Font Stack

- Primary: `'Courier New', monospace`
- Mono: `'Courier New', monospace`

### Rules

- Korean copy uses natural wrapping with `word-break: keep-all` where a phrase must remain readable.
- No primary explanatory text is smaller than `14px` in the active view.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of `4px`.

| Token | Value | Usage |
| --- | --- | --- |
| `--space-1` | `4px` | Tight label spacing |
| `--space-2` | `8px` | Button gaps and metadata |
| `--space-3` | `12px` | Panel inner rhythm |
| `--space-4` | `16px` | Panel and shelf padding |
| `--space-6` | `24px` | Major panel separation |
| `--space-8` | `32px` | Live control shelf breathing room |

### Grid

- Live artwork stage: every mode draws into one fixed screen left of the side column; the whole camera frame is fitted into it, snapped to whole cells and centered. Silhouette modes add a faint cyan backdrop and border so the screen stays visible when few cells are lit.
- Side column: one right-hand column, `clamp(20rem, 35vw, 44rem)` wide and inset `clamp(1rem, 2vw, 2.5rem)`. Every touch control (mode buttons, option buttons, pixel value toggle) sits in one block at exactly mid screen height, where it is easiest to reach; equal-height cards above (title, metaphor, animation) and below (sentence, terms, live size, how-it-is-made steps) frame it.
- Live control targets: mode buttons `clamp(4.5rem, 5.5vw, 7rem)` tall; option buttons and the toggle `clamp(4rem, 4.6vw, 6rem)` tall; `12px` gaps. Buttons use `touch-action: manipulation`, no text selection or tap flash, and shrink slightly while pressed. The block keeps the same height in every mode so no button moves under a finger.
- Breakpoints: `720px` compact width, `1100px` standard width, and `820px` short height (the project note hides so the explanation card keeps its animation).

### Rules

- The camera stage never sits behind the mode shelf; the reserved lower space keeps the artwork visually above the controls.
- Camera framing uses a responsive centered `cover` crop: each frame preserves its source aspect ratio, fills the current artwork stage in either windowed or fullscreen mode, and crops only the overflow at opposing edges.
- The two information cards share the upper row and scale from the same 1280×720 baseline rather than retaining a fixed-pixel composition.
- The lower mode shelf spans the viewport and keeps its four mode buttons in one responsive row where space permits.

## 5. Components

### Mode Button

- **Structure**: `<button>` with a short label and supporting value.
- **Variants**: setup, live, active.
- **Spacing**: `--space-2` gap; `--space-3` horizontal padding.
- **States**: default, hover, focus-visible, selected.
- **Accessibility**: native button semantics, `aria-pressed` reflects the selected mode, visible focus ring.
- **Motion**: `150ms` color and border transition only.
- **Layout**: horizontal cluster in the setup overlay and live control shelf.
- **Responsive layout**: the live cluster uses a viewport-ratio width; compact breakpoints retain their intrinsic grid layout.
- **Selected treatment**: cyan fill, dark text, 3px outline, and a restrained cyan glow.

### Character Size Configuration

- **Location**: `src/renderer/config.js`.
- **Value**: `FONT_SIZE` defaults to `16px`.
- **Change**: edit the value in code and restart the app; there is no live size selector in the interface.

### Window Mode Button

- **Structure**: a secondary native button on the setup overlay that toggles between windowed and fullscreen presentation.
- **Variants**: `전체 화면으로 전환`, `창 모드로 전환`.
- **Spacing**: `--space-2` top margin and `--space-2` by `--space-3` inset.
- **States**: default, hover, focus-visible, selected (`aria-pressed="true"`).
- **Accessibility**: native button semantics with an exposed pressed state and the same cyan focus ring as mode controls.
- **Motion**: `150ms` color, border, and surface transitions only.
- **Layout**: visible only on the setup overlay, directly below `START CAMERA`.

### Information Panel

- **Structure**: title, short project explanation, and quiet observation note.
- **States**: visible throughout the live-camera session and hidden only when that session exits.
- **Accessibility**: content is live DOM text and remains readable when the canvas is active.
- **Motion**: no decorative motion.
- **Layout**: placed in the upper-left card of the two-card row.
- **Responsive layout**: the panel uses a viewport-ratio rail width, inset, top offset, and minimum block size on wide displays; compact layouts return to fluid side insets.

### Mode Explanation Card

- **Structure**: split around the controls. Above: mode title, metaphor headline (e.g. 전등 스위치, 손전등 세 개, 크레파스) and a looping illustration that scales to the card's height. Below: one short sentence, term chips (이진법, 빛의 삼원색, 양자화, 8비트), the live cell or pixel count, and the camera → cells → numbers → picture steps.
- **States**: rebuilt when the mode or its option changes; the cell count updates from frame stats without restarting the animation.
- **Accessibility**: the explanation text is a polite live region; the illustration is `aria-hidden`.
- **Motion**: CSS-only loops; their un-animated styles are the meaningful still picture used under reduced motion.
- **Layout**: the two halves share the column height equally so the controls stay centred.

### Mode Option Buttons

- **Structure**: a label and a row of buttons under the mode buttons: 전체/R/G/B for RGB, 2/10/256단계 for brightness levels; the original mode shows a hint line in the same space.
- **States**: same selected treatment as mode buttons; R/G/B carry a colour dot.
- **Layout**: the row's height is reserved in every mode so the explanation card does not jump.

### Pixel Value Toggle

- **Structure**: a full-width `픽셀별 빛의 세기 보기` button at the bottom of the centred control block, with a state line (`꺼짐 · 원본 화질` / `켜짐 · 칸마다 숫자`).
- **States**: always in place; disabled with a dashed outline and a hint where it does not apply (`색 RGB · 밝기 단계에서 볼 수 있어요` in 미디어 아트, `R · G · B를 고르면 볼 수 있어요` on the combined RGB view); pressed uses the selected treatment.
- **Behaviour**: off shows the camera at its own resolution; on shows the sampled cell grid with per-cell numbers.

### Update Notice

- **Structure**: a small status panel with a version message and, after download, `지금 재시작` and `나중에` buttons.
- **Variants**: downloading, downloaded, dismissed.
- **Spacing**: `--space-4` padding and `--space-2` internal rhythm.
- **States**: hidden when no update exists; downloading has no action; downloaded exposes both action buttons.
- **Accessibility**: a polite live region announces the status; both actions are native buttons with visible focus.
- **Motion**: no decorative motion, so the notice remains quiet over the artwork.
- **Layout**: pinned to the upper-left, outside the right-side information rail and lower control shelf.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
| --- | --- | --- | --- |
| Micro | `150ms` | `ease-out` | Mode button feedback |
| Standard | `250ms` | `ease-in-out` | Panel visibility at live-session boundaries |
| Layer split | `1.8s` | quintic | RGB layers tilt, split, isolate the chosen channel, and merge back |
| Explanation loop | `4-6s` | per animation | Explanation card illustrations and the project-note step highlight |

- Mode selection updates the canvas mode, button state, and right-side summary together.
- Character size is read from `src/renderer/config.js` when the renderer starts.
- The mode cue line is static orientation, not decorative animation.
- `prefers-reduced-motion` disables non-essential transitions.

## 7. Depth & Surface

### Strategy

Mixed: thin cyan borders establish the exhibition-instrument framing, while translucent dark panels preserve depth against the camera artwork.

- Panels: `1px solid var(--border-default)` with no heavy shadow.
- Active controls: cyan fill and 3px cyan border with a restrained glow.
- Inactive controls: subtle 2px border and transparent surface.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- WCAG 2.2 AA target for text and focus indicators where the dark canvas permits.
- Every mode is keyboard reachable and exposes selection through `aria-pressed`.
- Korean body copy keeps semantic phrases together with `word-break: keep-all`.
- Motion is reduced through `prefers-reduced-motion`.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
| --- | --- | --- | --- |
| Camera artwork contrast varies by live feed | `src/renderer/core/frameLoop.js` | The artwork is intentionally sourced from the user's camera and cannot guarantee a fixed luminance distribution. | Revisit with an optional contrast preset if exhibition testing requires it. |
