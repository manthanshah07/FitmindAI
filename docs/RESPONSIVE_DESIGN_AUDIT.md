# FitMind AI — Responsive Design Audit & Strategy

## Responsive Breakpoint Strategy

FitMind AI follows a mobile-first responsive strategy utilizing standard Tailwind CSS breakpoints, prioritizing small viewports (`320px` to `430px`) up to large desktop (`1440px+`).

| Breakpoint | Viewport Width | Device Target | Strategy |
|---|---|---|---|
| **Base** | `< 640px` | Small Mobile (iPhone SE, Android) | Single-column, stacked layouts. Font sizes reduced (e.g., `text-4xl`). Full-width buttons. Padding reduced (`px-6`, `px-8`). |
| **sm** | `≥ 640px` | Large Mobile | Allow side-by-side elements for small utilities (e.g., buttons, tags). |
| **md** | `≥ 768px` | Tablet | Transition to 2-column grids for cards. Typography scales up. Section padding increases. |
| **lg** | `≥ 1024px` | Small Desktop / Laptop | Multi-column layouts (2, 3, or 4 columns). Complex side-by-side UI previews. Typography scales to maximum (`text-6xl`, `text-7xl`). |
| **xl / 2xl** | `≥ 1280px` | Large Desktop | Constrained by `max-w-[1400px]` or `max-w-[1600px]` to maintain editorial whitespace and prevent infinite horizontal stretching. |

## Core Principles Kept

1. **Editorial Typography Maintained:** The large, brutalist typography style was preserved on mobile, but scaled intelligently (`text-[9rem]` on desktop scales down to `text-[3rem]` (5xl) on mobile with `break-words`).
2. **Structural Borders Maintained:** The `border-borderLine` separating components dynamically switches from `border-b` to `border-r` at the `md` and `lg` breakpoints depending on grid structure.
3. **Animations Maintained (With Care):** Framer Motion animations trigger on `useInView`, which works perfectly on mobile scrolling. Parallax effects (`MarketingHero.tsx`) were given larger mobile bounding boxes (`min-h-[600px] py-16`) to prevent clipping.

## Specific Component Treatments

### 1. Navigation (`Navbar.tsx`)
- **Desktop:** Inline links and action buttons.
- **Mobile:** Hamburger menu toggling a dropdown panel animated via `AnimatePresence`. Links stack vertically with borders for tap targets.

### 2. Marketing Hero (`MarketingHero.tsx`)
- **Desktop:** Two-column split layout (Copy left, UI preview right). Parallax active.
- **Mobile:** Stacks vertically. The UI preview container uses `min-h-[600px] py-16` to allow the parallax layer (`panelY`) to float safely without getting clipped by `overflow-hidden`. The headline drops to `text-5xl` with `break-words` for long words like "Personalized".

### 3. Product Demonstrations (e.g. `NutritionPreview.tsx`)
- **Desktop:** `flex-row` side-by-side display.
- **Mobile:** Uses `flex-col-reverse` so the marketing copy appears *before* the large UI journal component, ensuring users read the value proposition before scrolling past the UI mock.

### 4. Grids and Columns
- **Metrics (`ProgressSection.tsx`) / Timelines (`MemoryDifference.tsx`)**: Use 4-column grids on large screens, dropping to 2-column on tablet (`md:grid-cols-2`), and 1-column on mobile.
- **Cards (`FeaturesGrid.tsx`)**: The dark mode grid adapts smoothly, but required a critical CSS fix (removing global `text-graphite` forcing) to ensure text inherited the correct `text-bone` color.

## Known Limitations & Touch Considerations

- **Hover States:** Hover states (e.g., `group-hover:text-olive`) degrade gracefully on touch devices.
- **Tables/Charts:** The current homepage uses abstracted, CSS-based grid visualizations rather than native `<canvas>` or `<table>` elements, natively avoiding horizontal overflow risks. Future charts should enforce `overflow-x-auto`.
