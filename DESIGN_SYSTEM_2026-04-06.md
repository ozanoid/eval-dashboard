# EvalStudio Design System

> Source of truth for all visual and interaction patterns in the EvalStudio dashboard.
> Generated from codebase analysis + ui-ux-pro-max skill audit.

---

## 1. Foundation

### Theme Mode
- **Dark only** — no light mode toggle
- Purple-tinted OLED dark palette
- WCAG AAA contrast compliance

### Technology Stack
| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5.7 |
| Build | Vite 6.2 |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui (Base UI React) |
| Icons | Lucide React |
| Charts | Recharts |
| Animations | Framer Motion + CSS keyframes |
| State | Zustand 5 + TanStack Query 5 |
| Router | React Router 7 |

---

## 2. Color Tokens

### Background Layers (darkest → lightest)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg-page` | `#0a0a0f` | Page background |
| `--color-bg-sidebar` | `#0f0f18` | Sidebar, headers |
| `--color-bg-card` | `#12121e` | Card surfaces |
| `--color-bg-card-hover` | `#1a1a2e` | Card hover state |
| `--color-bg-elevated` | `#1e1e30` | Popovers, modals, elevated surfaces |

### Text Hierarchy (4 levels)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-text-primary` | `#f0f0f5` | Headings, primary content |
| `--color-text-secondary` | `#a0a0b8` | Body text, descriptions |
| `--color-text-tertiary` | `#6b6b80` | Labels, captions |
| `--color-text-muted` | `#45455a` | Disabled, hints, timestamps |

### Border System (transparency-based)
| Token | Opacity | Usage |
|-------|---------|-------|
| `--color-border-subtle` | 6% white | Default card borders |
| `--color-border-default` | 10% white | Active borders, dividers |
| `--color-border-strong` | 15% white | Emphasis borders |

### Accent Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-accent-primary` | `#6366f1` (Indigo) | Primary CTA, active states, focus rings |
| `--color-accent-success` | `#10b981` (Emerald) | Success actions |
| `--color-accent-warning` | `#f59e0b` (Amber) | Warnings |
| `--color-accent-danger` | `#ef4444` (Red) | Errors, destructive |
| `--color-accent-purple` | `#a78bfa` | Weight indicators |
| `--color-accent-pink` | `#ec4899` | FAQ Quality agent |
| `--color-accent-orange` | `#f97316` | Secondary accent |

### Grade Colors (semantic scoring)
| Grade | Token | Hex | Score Range |
|-------|-------|-----|-------------|
| A+, A, A- | `--color-grade-a` | `#22c55e` (Green) | 80-100 |
| B+, B, B- | `--color-grade-b` | `#3b82f6` (Blue) | 60-79 |
| C+, C, C- | `--color-grade-c` | `#eab308` (Yellow) | 40-59 |
| D+, D, D-, F | `--color-grade-d` | `#ef4444` (Red) | 0-39 |

Grade badges use 12% opacity backgrounds: `rgba(color, 0.12)`

### Agent Colors (consistent across all pages)
| Agent | Token | Hex |
|-------|-------|-----|
| SERP Agent | `--color-agent-serp` | `#3b82f6` (Blue) |
| Citation Agent | `--color-agent-citation` | `#22c55e` (Green) |
| Brief Engine | `--color-agent-brief` | `#f59e0b` (Amber) |
| FAQ Generation | `--color-agent-faq-gen` | `#8b5cf6` (Purple) |
| FAQ Quality | `--color-agent-faq-qual` | `#ec4899` (Pink) |

### Chart Colors (Recharts series)
| Variable | Hex | Maps To |
|----------|-----|---------|
| `--chart-1` | `#3b82f6` | Blue (SERP) |
| `--chart-2` | `#22c55e` | Green (Citation) |
| `--chart-3` | `#f59e0b` | Amber (Brief) |
| `--chart-4` | `#8b5cf6` | Purple (FAQ Gen) |
| `--chart-5` | `#ec4899` | Pink (FAQ Qual) |

---

## 3. Typography

### Font Families
| Role | Family | Fallbacks |
|------|--------|-----------|
| Sans (UI) | Plus Jakarta Sans | system-ui, -apple-system, sans-serif |
| Mono (Data) | JetBrains Mono | SF Mono, Fira Code, monospace |

**Google Fonts preload** in `index.html`:
```
Plus Jakarta Sans: 400, 500, 600, 700, 800
JetBrains Mono: 400, 500, 600, 700, 800
```

### Type Scale (Tailwind classes used)
| Size | Class | Usage |
|------|-------|-------|
| 10px | `text-[10px]` | Micro labels, weight badges, section headers |
| 11px | `text-[11px]` | Version, agent name chips |
| 12px | `text-xs` | Badges, captions, button text |
| 14px | `text-sm` | Body text, descriptions, nav items |
| 16px | `text-base` | Card titles, scores |
| 18px | `text-lg` | Section headings |
| 20px | `text-xl` | Page titles (mobile) |
| 24px | `text-2xl` | Page titles (desktop) |
| 2rem | `text-[2rem]` | System score display |
| 2.5rem | `text-[2.5rem]` | Detail score hero |

### Text Properties
```css
body {
  line-height: 1.6;
  letter-spacing: -0.01em;
  -webkit-font-smoothing: antialiased;
}
```

### Font Weight Usage
| Weight | Class | Usage |
|--------|-------|-------|
| 400 | `font-normal` | Body text |
| 500 | `font-medium` | Nav items, labels, buttons |
| 600 | `font-semibold` | Card titles, section heads |
| 700 | `font-bold` | Page titles, scores |
| 800 | `font-extrabold` | Hero score numbers |

---

## 4. Spacing & Layout

### Page Padding
```
Mobile:  p-4   (16px)
Desktop: p-8   (32px)
```

### Content Max Width
| Page | Max Width |
|------|-----------|
| Dashboard | `max-w-6xl` (72rem) |
| Eval List | `max-w-7xl` (80rem) |
| Text blocks | `max-w-prose` (65ch) |

### Grid System
```
Cards:          grid-cols-1 lg:grid-cols-2
Strengths/Weak: grid-cols-1 sm:grid-cols-2
Evidence:       grid-cols-1 sm:grid-cols-2
```

### Layout Structure
```
┌─────────────────────────────────────────┐
│ [Sidebar 240px] │ [Main Content flex-1] │
│ fixed on lg+    │ overflow-y-auto       │
│ overlay < lg    │                       │
└─────────────────────────────────────────┘

Eval Detail Page:
┌──────────┬────────────────┬──────────┐
│ Input    │ Eval Report    │ Output   │
│ 280px    │ flex-1         │ 300px    │
│ md+ only │ always visible │ md+ only │
└──────────┴────────────────┴──────────┘
```

### Responsive Breakpoints
| Breakpoint | Width | Behavior |
|------------|-------|----------|
| default | < 640px | Mobile: single column, hamburger menu, no side panels |
| `sm:` | 640px+ | 2-column grids, larger padding |
| `md:` | 768px+ | Side panels visible in detail view |
| `lg:` | 1024px+ | Sidebar always visible, hide hamburger |

---

## 5. Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | 0.625rem (10px) | Base radius |
| `rounded` | ~4px | Small badges |
| `rounded-md` | ~6px | Medium badges, inputs |
| `rounded-lg` | 10px | Buttons, inputs, panels |
| `rounded-xl` | 14px | Cards, modals |
| `rounded-full` | 9999px | Pills, notification dots, score bars |

---

## 6. Elevation & Shadows

| Level | CSS | Usage |
|-------|-----|-------|
| Base | none | Default cards |
| Hover | `0 4px 12px rgba(0,0,0,0.15)` | `.hover-lift:hover` |
| Inset | `inset 2px 0 12px rgba(0,0,0,0.15)` | Main content area |
| Backdrop blur | `backdrop-blur-sm` | Sticky headers, mobile header |

---

## 7. Z-Index Scale

| Level | Value | Usage |
|-------|-------|-------|
| Sticky | `z-10` | Sticky headers, table columns |
| Mobile Header | `z-20` | Mobile top bar |
| Dropdown | `z-30` | Popovers, export menus |
| Backdrop | `z-40` | Overlay backgrounds |
| Modal | `z-50` | Modals, sidebar overlay, skip link |

---

## 8. Animation

### Keyframes
| Name | Duration | Easing | Usage |
|------|----------|--------|-------|
| `fadeInUp` | 400ms | cubic-bezier(0.16, 1, 0.3, 1) | Card entrance |
| `progressFill` | 600ms (200ms delay) | ease-out | Score bar fill |
| Stagger | 50ms increments | — | Sequential card reveals |

### Transitions
| Property | Duration | Usage |
|----------|----------|-------|
| `color`, `background` | 150ms | Buttons, links, nav items |
| `transform`, `shadow`, `border` | 200ms | `.hover-lift` cards |
| Sidebar slide | 200ms | Mobile sidebar open/close |

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  /* All animations & transitions → 0.01ms */
}
```

---

## 9. Component Patterns

### Card
```
bg-bg-card border border-border-subtle rounded-xl p-5 hover-lift
```

### Badge (Grade)
```
inline-flex font-mono font-bold tracking-wide
Sizes: sm (10px), md (12px), lg (14px)
Color: dynamic from grade config
Background: 12% opacity of grade color
```

### Button Variants
| Variant | Style |
|---------|-------|
| Primary | `bg-accent-primary text-white hover:bg-accent-primary/90` |
| Success | `bg-accent-success/15 text-accent-success hover:bg-accent-success/25` |
| Ghost | `text-text-tertiary hover:text-text-secondary hover:bg-bg-elevated` |
| Toggle Active | `bg-accent-primary/15 text-accent-primary` |
| Disabled | `cursor-default opacity-60` |

### Score Bar
```
role="progressbar" with aria-valuenow/max/label
Height: 4-6px, rounded-full
Color: dynamic from score range
Background: var(--color-bg-page)
Animation: animate-progress-fill
```

### Accordion (CriteriaCard)
```
button with aria-expanded + aria-controls
ChevronDown/ChevronRight icon indicator
Expand: border-t divider, space-y-4 content
```

### Empty State
```
Centered: icon (48px box) + heading + description
Icon: aria-hidden="true" (decorative)
```

### Skeleton Loading
```
animate-pulse rounded-md bg-bg-elevated
Variants: EvalCardSkeleton, StatsCardSkeleton, CriteriaCardSkeleton
```

---

## 10. Accessibility

### Focus
```css
:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
  border-radius: 4px;
}
```

### Keyboard Navigation
| Key | Action |
|-----|--------|
| `?` | Show shortcuts modal |
| `Escape` | Close modal |
| `j` / `k` | Navigate eval cards |
| `Enter` | Open selected eval |
| `Tab` | Cycle agent tabs |

### ARIA Patterns
| Component | ARIA |
|-----------|------|
| AgentTabs | `role="tablist"`, `role="tab"`, `aria-selected` |
| CriteriaCard | `aria-expanded`, `aria-controls` |
| ScoreBar | `role="progressbar"`, `aria-valuenow/min/max/label` |
| Sidebar nav | `aria-label="Main navigation"` |
| FilterBar | `<label for>` on search/sort |
| Charts | `role="img"`, `aria-label` |
| Decorative icons | `aria-hidden="true"` |
| Skip link | First focusable element → `#main-content` |

### Touch Targets
- Minimum: 44x44px for interactive elements
- Buttons: `p-2.5` minimum padding
- Badges: `min-w-[22px] h-[22px]`

---

## 11. Scrollbar

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
```

---

## 12. Selection

```css
::selection {
  background-color: rgba(99, 102, 241, 0.3); /* Indigo 30% */
  color: var(--color-text-primary);
}
```

---

## 13. File Reference

| Category | Files |
|----------|-------|
| Theme tokens | `src/index.css` |
| Grade/Score configs | `src/lib/constants.ts` |
| shadcn base components | `src/components/ui/*.tsx` |
| Shared components | `src/components/shared/*.tsx` |
| Layout | `src/components/layout/AppShell.tsx`, `Sidebar.tsx` |
