# FitMind AI — Component Inventory

> **Status:** ACTIVE — Update when new components are added  
> **Last Updated:** 2026-08-16

---

## Rule

Before creating a new component, check this list. If the component exists, reuse it. If it doesn't exist, create it following `DESIGN_SYSTEM.md` and add it here.

---

## Current Components (Landing Page — Protected)

These components belong to the landing page and must not be used as reusable primitives.

| Component | Location | Type | Notes |
|---|---|---|---|
| Navbar | `src/components/Navbar.tsx` | Layout | Landing-specific navigation |
| Hero | `src/sections/Hero.tsx` | Section | Landing only |
| Problem | `src/sections/Problem.tsx` | Section | Landing only |
| MeetFitMind | `src/sections/MeetFitMind.tsx` | Section | Landing only |
| Memory | `src/sections/Memory.tsx` | Section | Landing only |
| Timeline | `src/sections/Timeline.tsx` | Section | Landing only |
| Features | `src/sections/Features.tsx` | Section | Landing only |
| Architecture | `src/sections/Architecture.tsx` | Section | Landing only |
| AdaptiveCoaching | `src/sections/AdaptiveCoaching.tsx` | Section | Landing only |
| Scope | `src/sections/Scope.tsx` | Section | Landing only |
| Footer | `src/sections/Footer.tsx` | Section | Landing only |

---

## Application UI Primitives (To Be Built in Phase 1)

| Component | Location | Status | Notes |
|---|---|---|---|
| Button (Primary) | `src/components/ui/Button.tsx` | NOT BUILT | Dark fill, uppercase, sharp corners |
| Button (Secondary) | `src/components/ui/Button.tsx` | NOT BUILT | Border only variant |
| Button (Ghost / Dark) | `src/components/ui/Button.tsx` | NOT BUILT | For dark section backgrounds |
| Input | `src/components/ui/Input.tsx` | NOT BUILT | Sharp corners, border-borderLine |
| Select | `src/components/ui/Select.tsx` | NOT BUILT | Match input style |
| Textarea | `src/components/ui/Textarea.tsx` | NOT BUILT | Match input style |
| Card | `src/components/ui/Card.tsx` | NOT BUILT | Sharp, border-defined |
| Badge | `src/components/ui/Badge.tsx` | NOT BUILT | Status labels |
| Modal | `src/components/ui/Modal.tsx` | NOT BUILT | |
| Tooltip | `src/components/ui/Tooltip.tsx` | NOT BUILT | |
| Tabs | `src/components/ui/Tabs.tsx` | NOT BUILT | |
| ProgressBar | `src/components/ui/ProgressBar.tsx` | NOT BUILT | Minimal, editorial |
| EmptyState | `src/components/ui/EmptyState.tsx` | NOT BUILT | |
| LoadingState | `src/components/ui/LoadingState.tsx` | NOT BUILT | |

---

## Layout Components (To Be Built in Phase 1)

| Component | Location | Status | Notes |
|---|---|---|---|
| AppShell | `src/components/layout/AppShell.tsx` | NOT BUILT | Wraps all app pages |
| Sidebar | `src/components/layout/Sidebar.tsx` | NOT BUILT | Desktop navigation |
| BottomNav | `src/components/layout/BottomNav.tsx` | NOT BUILT | Mobile navigation |
| TopBar | `src/components/layout/TopBar.tsx` | NOT BUILT | Mobile/tablet top bar |
| PageHeader | `src/components/layout/PageHeader.tsx` | NOT BUILT | Section heading with label |
| ProtectedRoute | `src/components/layout/ProtectedRoute.tsx` | NOT BUILT | Auth guard |

---

## AI Components (To Be Built in Phase 7)

| Component | Location | Status | Notes |
|---|---|---|---|
| AIMessage | `src/components/ai/AIMessage.tsx` | NOT BUILT | Coach response bubble |
| UserMessage | `src/components/ai/UserMessage.tsx` | NOT BUILT | User input display |
| MemoryPanel | `src/components/ai/MemoryPanel.tsx` | NOT BUILT | Memory dossier display |
| InsightCard | `src/components/ai/InsightCard.tsx` | NOT BUILT | Today's AI insight |

---

## Chart Components (To Be Built in Phase 5–6)

| Component | Location | Status | Notes |
|---|---|---|---|
| WeightChart | `src/components/charts/WeightChart.tsx` | NOT BUILT | Weight trend line |
| ProteinChart | `src/components/charts/ProteinChart.tsx` | NOT BUILT | Daily protein bar |
| ScoreChart | `src/components/charts/ScoreChart.tsx` | NOT BUILT | Fitness score history |
| StrengthChart | `src/components/charts/StrengthChart.tsx` | NOT BUILT | Lift progression |
| AdherenceChart | `src/components/charts/AdherenceChart.tsx` | NOT BUILT | Workout adherence % |

---

*This file must be updated whenever a new component is created.*
