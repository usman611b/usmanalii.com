# DESIGN SYSTEM — usmanalii.com M8

> Single source of truth for visual decisions. Every token, every surface, every interaction pattern.

---

## Color System

### Foundation Surfaces (80% of every viewport)

| Token         | Value     | CSS var           | Purpose                             |
| ------------- | --------- | ----------------- | ----------------------------------- |
| Canvas        | `#030507` | `--canvas`        | Page body foundation                |
| Obsidian      | `#070B12` | `--obsidian`      | Deepest panels, nav background      |
| Midnight      | `#0B1220` | `--midnight`      | Reading surfaces, form backgrounds  |
| Elevated      | `#101929` | `--elevated`      | Cards, panels with slight elevation |
| Surface Quiet | `#0D1525` | `--surface-quiet` | Subtle separation, no blur          |
| Surface Card  | `#111f36` | `--surface-card`  | Interactive card elevation          |

### Text (always paired with sufficient contrast)

| Token     | Value     | CSS var            | Usage                |
| --------- | --------- | ------------------ | -------------------- |
| Primary   | `#F8FAFC` | `--text-primary`   | Headings, body text  |
| Secondary | `#B6C2D1` | `--text-secondary` | Supporting labels    |
| Muted     | `#7D899A` | `--text-muted`     | Timestamps, metadata |

### Semantic Accents (5% of viewport — ONE dominant at a time)

| Token   | Value     | CSS var     | Meaning                                          |
| ------- | --------- | ----------- | ------------------------------------------------ |
| Cyan    | `#25E6FF` | `--cyan`    | Evidence, verification, exploration, skill nodes |
| Violet  | `#8B5CF6` | `--violet`  | Decisions, ADRs, intelligence, capability nodes  |
| Magenta | `#FF2DAA` | `--magenta` | Experiments, exploration, focus, deep-dive       |
| Lime    | `#B8FF3D` | `--lime`    | Shipped outcomes, healthy states, success        |
| Amber   | `#FFB547` | `--amber`   | Lessons, stale evidence, pending                 |
| Danger  | `#FF5470` | `--danger`  | Errors, destructive actions, revoked             |

### Border System

| Token                    | CSS var             | Usage                              |
| ------------------------ | ------------------- | ---------------------------------- |
| `rgba(148,163,184,0.12)` | `--hairline`        | Default border on all surfaces     |
| `rgba(148,163,184,0.24)` | `--hairline-strong` | Hovered/focused state              |
| Per-accent `*0.20`       | `--border-cyan` etc | Tinted borders for accent surfaces |

---

## Typography

| Role    | Font           | Size                           | Fallback                |
| ------- | -------------- | ------------------------------ | ----------------------- |
| Display | Bebas Neue     | `clamp(2.5rem, 7vw, 7.5rem)`   | Impact, sans-serif      |
| Primary | Inter          | `1rem` body / `0.875rem` small | system-ui               |
| Mono    | JetBrains Mono | `0.75rem` labels               | Cascadia Code, Consolas |

### Rules

- Hero text: `clamp(4rem, 7.5vw, 7.5rem)`, line-height `0.88–0.92`
- Section title: `clamp(2.5rem, 6vw, 5rem)`, font-display
- Body: `1–1.125rem`, line-height `1.6`, max `68ch`
- Metadata: `0.75rem` minimum — never below 12px rendered
- Gradient fills only on hero display text — never body

---

## Surface Hierarchy

```
┌─────────────────────────────────────────────────┐
│  Level 4: .surface-overlay                       │
│  Floating nav, modals, command palette           │
│  bg: rgba(7,11,18,0.92) + blur(16px)            │
│  ─────────────────────────────────────           │
│  Level 3: .surface-card                          │
│  Interactive cards, hover-capable panels         │
│  bg: #111f36 + border(hairline)                  │
│  ─────────────────────────────────────           │
│  Level 2: .surface-quiet                         │
│  Subtle separation, no blur                      │
│  bg: #0D1525 + border(hairline)                  │
│  ─────────────────────────────────────           │
│  Level 1: body                                   │
│  Canvas #030507 + blueprint grid bg             │
└─────────────────────────────────────────────────┘
```

### Glass — restricted use only

- `.glass-panel` — hero status, feature card highlights
- `.glass-nav` — sticky navigation only
- `.glass-cyan/.glass-violet/.glass-magenta` — mode-specific overlays

Glass must not be applied indiscriminately. Surface cards are preferred.

---

## Component Classes

### Buttons

| Class                   | Purpose                  |
| ----------------------- | ------------------------ |
| `.btn.btn-primary`      | Primary CTA — cyan fill  |
| `.btn.btn-outline-cyan` | Secondary/explore        |
| `.btn.btn-ghost`        | Tertiary/utility         |
| `.btn.btn-danger`       | Destructive actions only |

### Badges

```html
<span class="badge badge-cyan">Evidence</span>
<span class="badge badge-violet">Decision / ADR</span>
<span class="badge badge-magenta">Experiment</span>
<span class="badge badge-lime">Shipped</span>
<span class="badge badge-amber">Pending</span>
<span class="badge badge-danger">Error</span>
```

### Status Indicators

```html
<span class="status-dot status-dot-healthy" aria-hidden="true"></span>
<!-- Always pair with text: -->
<span>Active — sync running</span>
```

Dot classes: `status-dot-healthy`, `status-dot-active`, `status-dot-pending`, `status-dot-warning`, `status-dot-error`, `status-dot-muted`

### Empty States

```html
<div class="empty-state">
  <div class="empty-state-icon" aria-hidden="true">◈</div>
  <p class="empty-state-title">What is missing</p>
  <p class="empty-state-body">Why it is missing and one next action.</p>
</div>
```

### Loading Skeletons

```html
<div class="skeleton h-10 w-full rounded-lg" aria-label="Loading..."></div>
```

---

## Motion System

### Durations

| Token                | Value | Use case                          |
| -------------------- | ----- | --------------------------------- |
| `--duration-instant` | 80ms  | Feedback (save, copy, toggle)     |
| `--duration-fast`    | 150ms | Hover effects, border transitions |
| `--duration-normal`  | 220ms | Navigation transitions, fade      |
| `--duration-slow`    | 350ms | Entrance reveals, expansion       |
| `--duration-xslow`   | 500ms | Page transitions, modal open      |

### Easing

| Token           | Value                               | Use case                 |
| --------------- | ----------------------------------- | ------------------------ |
| `--ease-spring` | `cubic-bezier(0.34,1.56,0.64,1)`    | Button press, card lift  |
| `--ease-smooth` | `cubic-bezier(0.25,0.46,0.45,0.94)` | Parallax, content reveal |
| `--ease-out`    | `cubic-bezier(0.0,0.0,0.2,1)`       | Navigation enter         |

### Ambient Animations

| Class/Keyframe   | Duration | Use                              |
| ---------------- | -------- | -------------------------------- |
| `mesh-drift`     | 45s      | Background mesh gradients        |
| `particle-float` | 8s       | Foreground constellation nodes   |
| `orbital-pulse`  | 4s       | Hero orbit arc                   |
| `fade-up`        | 350ms    | Entrance reveal (`.reveal-item`) |
| `status-pulse`   | 2s       | Live status dot                  |

**All ambient animations pause under `prefers-reduced-motion: reduce`.**
**Canvas animations also pause when `document.visibilityState === 'hidden'`.**

### Card Physics

- Tilt: max 2 degrees (pointer/mouse only)
- Lift: 2–6px translate on hover
- Perspective: 1000px
- Touch: press feedback only (no tilt)

---

## Z-Index Scale

| Token          | Value | Layer               |
| -------------- | ----- | ------------------- |
| `--z-base`     | 0     | Document flow       |
| `--z-raised`   | 10    | Raised content      |
| `--z-card`     | 20    | Interactive cards   |
| `--z-dropdown` | 100   | Dropdowns, tooltips |
| `--z-nav`      | 200   | Sticky navigation   |
| `--z-overlay`  | 300   | Mobile nav sheet    |
| `--z-modal`    | 400   | Dialogs             |
| `--z-toast`    | 500   | Toasts              |

---

## Accessibility Requirements

- WCAG 2.2 AA minimum target
- All interactive elements have `focus-visible` ring: `2px solid var(--cyan)` + 3px offset
- No meaning through color alone — always paired with text or icon
- Graphs have accessible table alternatives (table toggle button)
- Heatmap has `role="grid"` with labeled cells and `aria-live` tooltip
- Skip navigation link always visible on focus
- Mobile nav uses focus trap + Escape key + focus restoration
- Reduced motion: CSS `@media (prefers-reduced-motion: reduce)` removes all continuous animations
- Print: all decoration removed, text is black-on-white for `/resume/*`

---

## Responsive Breakpoints

| Breakpoint | Width      | Layout                                 |
| ---------- | ---------- | -------------------------------------- |
| Mobile     | 320–767px  | Single column, full-width, bottom-safe |
| Tablet     | 768–1279px | 6-column bento, simplified animations  |
| Desktop    | 1280px+    | 12-column bento, full effects          |

### Mobile Rules

- Minimum touch target: 44×44px
- No hover-only information
- No horizontal overflow
- Navigation: full-height sheet with focus trap
- Section rail: hidden on `<1280px`
