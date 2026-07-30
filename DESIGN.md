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

- Live artwork stage: full viewport width with `--control-shelf-height` reserved below it.
- Right rail: `clamp(300px, 23.4375vw, 640px)` wide, inset `2.5vw` from the edge, and positioned on viewport-height ratios.
- Live control shelf: `25.5556vh` tall with a `82.8125vw` inner control row; the character-size rail occupies `18.4375vw` of that row.
- Live control targets: `clamp(72px, 5.625vw, 144px)` tall so the control shelf retains its visual weight at high resolutions.
- Breakpoints: `720px` compact and `1100px` standard.

### Rules

- The camera stage never sits behind the mode shelf; the reserved lower space keeps the artwork visually above the controls.
- Camera framing uses a responsive centered `cover` crop: each frame preserves its source aspect ratio, fills the current artwork stage in either windowed or fullscreen mode, and crops only the overflow at opposing edges.
- The right rail is aligned to the upper-right and mid-right zones.
- At wide exhibition resolutions, the right rail, panel height, shelf, control row, and typography scale from the same 1280×720 baseline rather than retaining a fixed-pixel composition.

## 5. Components

### Mode Button

- **Structure**: `<button>` with a short label and supporting value.
- **Variants**: setup, live, active.
- **Spacing**: `--space-2` gap; `--space-3` horizontal padding.
- **States**: default, hover, focus-visible, selected.
- **Accessibility**: native button semantics, `aria-pressed` reflects the selected mode, visible focus ring.
- **Motion**: `150ms` color and border transition only.
- **Layout**: horizontal cluster in the setup overlay and live control shelf.
- **Responsive layout**: the live cluster uses a viewport-ratio width and character-size rail, preserving the same proportions on high-resolution displays; compact breakpoints retain their intrinsic grid layout.
- **Selected treatment**: cyan fill, dark text, 3px outline, and a restrained cyan glow.

### Character Size Button

- **Structure**: three adjacent native buttons labelled `작게`, `기본`, and `크게` with their pixel value.
- **Values**: `8px`, `12px`, and `16px`; `12px` is the default exhibition density.
- **States**: default, hover, focus-visible, selected; `aria-pressed` reflects the selected size.
- **Layout**: directly alongside the live mode cluster and below the setup mode selector.
- **Selected treatment**: matches the mode button selected state.

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
- **Layout**: pinned to the upper-right rail.
- **Responsive layout**: the panel uses a viewport-ratio rail width, inset, top offset, and minimum block size on wide displays; compact layouts return to fluid side insets.

### Mode Summary Panel

- **Structure**: current mode title, one-sentence explanation, and one simple metric.
- **States**: visible throughout the live-camera session; selected content updates with the active mode.
- **Accessibility**: updates are announced through a polite live region.
- **Motion**: content changes without layout animation.
- **Layout**: pinned below the information panel.
- **Responsive layout**: the panel follows the same wide right-rail proportions and compact fallback as the information panel.

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

- Mode selection updates the canvas mode, button state, and right-side summary together.
- Character-size selection updates the next rendered canvas frame and its selected button state together.
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
