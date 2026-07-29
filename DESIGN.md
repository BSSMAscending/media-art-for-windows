# Binary Media Art Design System

## 1. Atmosphere & Identity

Binary Media Art is a quiet, dark exhibition interface: the camera image is the artwork, while the UI stays thin, cyan, and explanatory. The signature is a restrained cyan instrument line that guides visitors from the live figure to the next mode without competing with it.

## 2. Color

### Palette

| Role            | Token               | Value                     | Usage                          |
| --------------- | ------------------- | ------------------------- | ------------------------------ |
| Surface/primary | `--surface-primary` | `#000000`                 | Canvas and page background     |
| Surface/panel   | `--surface-panel`   | `rgba(0, 5, 13, 0.94)`    | Information panels             |
| Text/primary    | `--text-primary`    | `#e9ffff`                 | Headings and selected controls |
| Text/secondary  | `--text-secondary`  | `#85c7ce`                 | Explanatory copy               |
| Text/muted      | `--text-muted`      | `#4b777d`                 | Hints and inactive metadata    |
| Border/default  | `--border-default`  | `rgba(0, 255, 255, 0.55)` | Panel and button outlines      |
| Border/subtle   | `--border-subtle`   | `rgba(0, 255, 255, 0.18)` | Inactive controls and dividers |
| Accent/primary  | `--accent-primary`  | `#00ffff`                 | Focus, active state, cue line  |
| Accent/soft     | `--accent-soft`     | `rgba(0, 255, 255, 0.1)`  | Active surface fill            |
| Status/error    | `--status-error`    | `#ff3366`                 | Camera and model errors        |

### Rules

- The canvas remains black and receives the strongest contrast.
- Cyan is reserved for interaction, orientation, and the live artwork's existing language.
- Panels use transparency so the exhibition surface remains visible behind them.

## 3. Typography

### Scale

| Level       | Size   | Weight | Line Height | Usage                           |
| ----------- | ------ | ------ | ----------- | ------------------------------- |
| Panel title | `16px` | `700`  | `1.3`       | Right-side headings             |
| Body        | `14px` | `400`  | `1.6`       | Explanations and mode summaries |
| Control     | `12px` | `700`  | `1.3`       | Mode buttons and labels         |
| Caption     | `11px` | `400`  | `1.4`       | Hints and lightweight metrics   |

### Font Stack

- Primary: `'Courier New', monospace`
- Mono: `'Courier New', monospace`

### Rules

- Korean copy uses natural wrapping with `word-break: keep-all` where a phrase must remain readable.
- No primary explanatory text is smaller than `14px` in the active view.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of `4px`.

| Token       | Value  | Usage                             |
| ----------- | ------ | --------------------------------- |
| `--space-1` | `4px`  | Tight label spacing               |
| `--space-2` | `8px`  | Button gaps and metadata          |
| `--space-3` | `12px` | Panel inner rhythm                |
| `--space-4` | `16px` | Panel and shelf padding           |
| `--space-6` | `24px` | Major panel separation            |
| `--space-8` | `32px` | Live control shelf breathing room |

### Grid

- Live artwork stage: full viewport width with `--control-shelf-height` reserved below it.
- Right rail: `264px` wide on large screens, inset `32px` from the edge.
- Breakpoints: `768px` compact, `1100px` standard, `1440px` exhibition view.

### Rules

- The camera stage never sits behind the mode shelf; the reserved lower space keeps the artwork visually above the controls.
- The right rail is aligned to the upper-right and mid-right zones from the supplied reference.

## 5. Components

### Mode Button

- **Structure**: `<button>` with a short label and optional supporting value.
- **Variants**: setup, live, active.
- **Spacing**: `--space-2` gap; `--space-3` horizontal padding.
- **States**: default, hover, active, focus-visible, selected.
- **Accessibility**: native button semantics, `aria-pressed` reflects the selected mode, visible focus ring.
- **Motion**: `150ms` color and border transition only.
- **Layout**: horizontal cluster in the setup overlay and live control shelf.

### Character Size Button

- **Structure**: three adjacent native buttons labelled `작게`, `기본`, and `크게` with their pixel value.
- **Values**: `8px`, `12px`, and `16px`; `12px` is the default exhibition density.
- **States**: default, hover, focus-visible, selected; `aria-pressed` reflects the selected size.
- **Layout**: directly alongside the live mode cluster and below the setup mode selector.

### Window Mode Button

- **Structure**: a secondary native button on the setup overlay that toggles between windowed and fullscreen presentation.
- **Variants**: `전체 화면으로 전환`, `창 모드로 전환`.
- **Spacing**: `--space-2` top margin and `--space-2` by `--space-3` inset.
- **States**: default, hover, focus-visible, selected (`aria-pressed="true"`).
- **Accessibility**: native button semantics with an exposed pressed state and the same cyan focus ring as mode controls.
- **Motion**: `150ms` color, border, and surface transitions only.
- **Layout**: visible only on the setup overlay, directly below `START CAMERA`.

### Information Panel

- **Structure**: title, short project explanation, quiet keyboard hint.
- **Variants**: visible, hidden with `I` shortcut.
- **Spacing**: `--space-4` padding.
- **States**: default, hidden.
- **Accessibility**: content is live DOM text and remains readable when the canvas is active.
- **Motion**: no decorative motion.
- **Layout**: pinned to the upper-right rail.

### Mode Summary Panel

- **Structure**: current mode title, one-sentence explanation, one simple metric.
- **Variants**: one per selected mode.
- **Spacing**: `--space-4` padding with `--space-3` section rhythm.
- **States**: default, hidden with `M` shortcut, selected content.
- **Accessibility**: updates are announced through a polite live region.
- **Motion**: content changes without layout animation.
- **Layout**: pinned below the information panel.

### Update Notice

- **Structure**: a small status panel with a version message and, after download, `지금 재시작` and `나중에` buttons.
- **Variants**: downloading, downloaded, dismissed.
- **Spacing**: `--space-4` padding and `--space-2` internal rhythm.
- **States**: hidden when no update exists; downloading has no action; downloaded exposes both action buttons.
- **Accessibility**: a polite live region announces the status; both actions are native buttons with visible focus.
- **Motion**: no decorative motion, so the notice remains quiet over the artwork.
- **Layout**: pinned to the upper-left, outside the right-side information rail and lower control shelf.

## 6. Motion & Interaction

| Type     | Duration | Easing        | Usage                |
| -------- | -------- | ------------- | -------------------- |
| Micro    | `150ms`  | `ease-out`    | Mode button feedback |
| Standard | `250ms`  | `ease-in-out` | Panel visibility     |

- Mode selection updates the canvas mode, button state, and right-side summary together.
- Character-size selection updates the next rendered canvas frame and its selected button state together.
- The mode cue line is static orientation, not decorative animation.
- `prefers-reduced-motion` disables non-essential transitions.

## 7. Depth & Surface

### Strategy

Mixed: thin cyan borders establish the exhibition-instrument framing, while translucent dark panels preserve depth against the camera artwork.

- Panels: `1px solid var(--border-default)` with no heavy shadow.
- Active controls: cyan border plus a low-opacity cyan fill.
- Inactive controls: subtle border and transparent surface.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- WCAG 2.2 AA target for text and focus indicators where the dark canvas permits.
- Every mode is keyboard reachable and exposes selection through `aria-pressed`.
- Korean body copy keeps semantic phrases together with `word-break: keep-all`.
- Motion is reduced through `prefers-reduced-motion`.

### Accepted Debt

| Item                                        | Location                         | Why accepted                                                                                                     | Owner / Exit                                                                |
| ------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Camera artwork contrast varies by live feed | `src/renderer/core/frameLoop.js` | The artwork is intentionally sourced from the user's camera and cannot guarantee a fixed luminance distribution. | Revisit with an optional contrast preset if exhibition testing requires it. |
