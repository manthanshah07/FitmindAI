# FitMind AI — Design System

> **Status:** DECIDED — Locked  
> **Source of Truth:** `src/styles/design-tokens.css` + existing landing page  
> **Last Updated:** 2026-08-11

---

## Principle

The landing page is the visual source of truth. Every future application screen must extend this design system. No new visual styles may be introduced without a documented reason.

---

## Color Tokens

| Token Name | CSS Variable | Hex Value | Usage |
|---|---|---|---|
| `bone` | `--color-bone` | `#F3F2ED` | Primary background (light) |
| `graphite` | `--color-graphite` | `#161616` | Primary text, dark sections |
| `charcoal` | `--color-charcoal` | `#2A2A2A` | Secondary text |
| `olive` | `--color-olive` | `#6B705C` | Primary accent, highlights, italic |
| `accent` | `--color-accent` | `#A5A58D` | Secondary accent |
| `faded` | `--color-faded` | `#B7B7A4` | Muted labels, metadata |
| `borderLine` | `--color-border` | `#D4D4CE` | Structural borders, dividers |
| `success` | `--color-success` | `#6B705C` | (Same as olive — restrained) |
| `error` | `--color-error` | `#9a3324` | Error states |
| `warning` | `--color-warning` | `#b38b4d` | Warning states |
| `info` | `--color-info` | `#5c6a70` | Informational states |

**Usage Rule:** Never hardcode hex values in component files. Always use Tailwind classes (e.g., `bg-bone`, `text-graphite`) or CSS variables.

---

## Typography

### Font Families

| Name | Fonts | Usage |
|---|---|---|
| Display | Helvetica Neue, Helvetica, Arial, sans-serif | All headings |
| Sans | Helvetica Neue, Helvetica, Arial, sans-serif | Body text |
| Mono | JetBrains Mono, Space Mono, monospace | Labels, metadata, code, annotations |

### Heading Scale

| Level | Size Guide | Weight | Tracking | Usage |
|---|---|---|---|---|
| H1 (hero) | 7xl–10xl | Bold (700) | `-0.04em` (tighter) | Section openers, hero |
| H2 | 5xl–7xl | Bold (700) | `-0.04em` | Major section headings |
| H3 | 2xl–4xl | Bold (700) | `-0.04em` | Sub-section headings |
| H4 | xl–2xl | Semibold (600) | `-0.02em` | Card headings |

### Body & Labels

| Type | Style | Usage |
|---|---|---|
| Body | font-sans, text-lg, font-medium, leading-relaxed | Paragraph text |
| Label | font-mono, text-xs, uppercase, tracking-widest | Section numbers, annotations |
| Stat | font-display, font-bold, tracking-tighter | Large numbers (scores, weights) |
| Caption | font-mono, text-xs, text-faded | Metadata, source labels |

### Editorial Conventions
- Headings use `uppercase` throughout
- Italic (`italic`) is used exclusively for the olive accent in headings for emphasis
- Section numbers use format: `01 / SECTION NAME`
- Never use gradient text
- Avoid centered alignment except for full-screen focal moments

---

## Border Radius

All components use **0px border radius** (sharp, editorial).

```css
--radius-sm: 0px;
--radius-md: 0px;
--radius-lg: 0px;
```

This is a defining characteristic of the FitMind AI visual identity. Do not round component corners.

---

## Spacing System

Tailwind's default spacing scale is used. Key conventions:

| Context | Spacing |
|---|---|
| Section vertical padding | `py-24` to `py-32` |
| Content max-width | `max-w-[1400px]` |
| Content horizontal padding | `px-6 md:px-12` |
| Section label from top | `top-12 left-12` (absolute) |
| Card internal padding | `p-6` to `p-8` |
| Component gap | `gap-4` to `gap-8` |

---

## Shadows

```css
--shadow-editorial: 0 4px 20px rgba(0, 0, 0, 0.05);
```

Shadows are minimal and used sparingly. No colored shadows. No glows.

---

## Borders

- Primary structural border: `border border-borderLine` (`#D4D4CE`)
- Dark section structural border: `border border-charcoal` (`#2A2A2A`)
- Accent border: `border-l-4 border-olive` (left accent lines)
- Bold accent: `border-b-2 border-graphite` (underline treatment)
- NEVER use glowing borders (`box-shadow: 0 0 20px color`)

---

## Button System

### Primary Button
```
bg-graphite text-bone
border border-graphite
px-8 py-4
font-bold tracking-widest uppercase text-xs
hover:bg-charcoal transition-colors
```

### Secondary Button
```
border border-borderLine text-graphite
px-8 py-4
font-bold tracking-widest uppercase text-xs
hover:border-graphite transition-colors
```

### Ghost / Dark Section Button
```
border border-bone text-bone
px-8 py-4
font-bold tracking-widest uppercase text-xs
hover:bg-bone hover:text-graphite transition-colors
```

**Rules:** No rounded corners. No gradients. No glowing hover states. Uppercase always.

---

## Card System

FitMind AI does not use "floating" cards with heavy shadows and rounded corners.

Instead, cards are defined by:
- Structural borders (`border border-borderLine` or `border border-graphite`)
- Sharp corners
- Internal padding (`p-6` to `p-8`)
- Flat backgrounds (`bg-bone`, `bg-graphite`, `bg-charcoal`)

**Example card classes:**
```
bg-bone border border-borderLine p-8
```
or for dark variant:
```
bg-graphite border border-graphite text-bone p-8
```

---

## Input System

To be designed in Phase 1 (Authentication). Must follow:
- Sharp corners (no border radius)
- `border border-borderLine` default state
- `border border-graphite` focused state
- `font-mono` or `font-sans` depending on context
- No glowing focus rings — use border color change instead

---

## Animation Language

| Type | Duration | Easing | Usage |
|---|---|---|---|
| Fast micro | 150ms | ease-in-out | Hover states |
| Normal | 300ms | ease-in-out | Component transitions |
| Slow reveal | 600ms | cubic-bezier(0.16, 1, 0.3, 1) | Section entrances |

**Framer Motion conventions:**
- Section entrances: `initial={{ opacity: 0, y: 20 }}` → `animate={{ opacity: 1, y: 0 }}`
- Horizontal entrance (left): `initial={{ opacity: 0, x: -20 }}`
- Horizontal entrance (right): `initial={{ opacity: 0, x: 20 }}`
- Scale entrance: `initial={{ scale: 0.95, opacity: 0 }}`
- All `whileInView` animations use `once: true`

**Do not animate:** Every single element. Background blobs. Random floating objects.

---

## Noise Texture

A subtle noise overlay is applied at the `body` level:
```css
.noise-bg {
  opacity: 0.04;
  /* SVG fractal noise pattern */
}
```

This gives a printed/editorial feel. It is fixed position and non-interactive.

---

## What Is Explicitly Prohibited

| Visual | Reason |
|---|---|
| Glassmorphism (`backdrop-blur` + transparent backgrounds) | Generic AI SaaS cliché |
| Gradient text (`bg-clip-text`) | Design identity violation |
| Neon/glow effects | Not part of FitMind palette |
| Rounded card corners | Identity violation |
| Floating blobs / background orbs | Generic SaaS cliché |
| Purple or blue color introduction | Not part of palette |
| Rainbow charts | Excessive visual noise |
| Heavy shadows | Against editorial aesthetic |

---

*This document is a binding reference. Future developers must not deviate from it without updating this document and recording the decision in `00_PROJECT_DECISIONS.md`.*
