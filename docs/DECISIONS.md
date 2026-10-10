# FitMind AI — Architectural & Technical Decisions

> **Document Version:** 1.0  
> **Last Updated:** 2026-10-10 (Milestone M10)  
> **Status:** APPROVED BASELINE  

This document records the foundational architectural decisions, platform constraints, trade-offs, and technical rationale for FitMind AI.

---

## 1. Architecture: PWA (Progressive Web Application) vs Native App

### Context
FitMind AI is a full-stack personal fitness coaching and tracking platform designed for phones, tablets, and desktops. Building native iOS (Swift/SwiftUI) and Android (Kotlin/Jetpack Compose) applications was evaluated against a mobile-first Progressive Web Application.

### Decision
Build FitMind AI as an installable **Progressive Web Application (PWA)** using React 19, TypeScript, Vite, and Tailwind CSS, powered by `vite-plugin-pwa` and a FastAPI Python backend.

### Rationale
1. **Single Unified Codebase:** 100% code sharing between mobile and desktop experiences, drastically reducing maintenance overhead.
2. **Zero Deployment Friction:** Bug fixes and features deploy instantly to production without multi-day App Store or Google Play review delays.
3. **Frictionless Onboarding:** Users can start immediately in any modern browser without downloading an app from a store, then install to their home screen with a single tap.
4. **No Third-Party Store Fees:** Eliminates the 15–30% platform tax on fitness subscriptions and digital services.
5. **Modern Browser Capabilities:** Modern mobile browsers support standalone full-screen viewports (`display: standalone`), touch-optimized gestures, offline caching via Service Workers, and persistent client-side storage.

---

## 2. Offline-First Live Workout Tracking

### Context
During gym workouts, athletes frequently experience unreliable cellular connections, basement reception loss, or WiFi drops. Losing an active workout session because of an interrupted network connection ruins the user experience.

### Decision
Implement a local-first **Draft Recovery Engine** (`src/lib/workoutDraft.ts` and `src/store/useWorkoutDraftStore.ts`):
- All set updates, reps, weights, notes, and timers persist immediately to `localStorage` under a user-isolated key (`fitmind:workout-draft:<userId>`).
- Submissions use an **Idempotent Workout API** with unique client-generated `Idempotency-Key` UUIDs and SHA-256 canonical fingerprints.
- If a network error occurs upon completing a workout, the session stays safely in local draft state and displays an offline retry banner until connectivity returns.
- Quota errors trigger safety quarantine (`fitmind:workout-draft-quarantine:<userId>:<timestamp>`) with clipboard copy and JSON download fallback options.

---

## 3. iOS WebKit Platform Limitations & Mitigations

While Progressive Web Apps provide a near-native experience on iOS, Apple's WebKit engine imposes specific platform restrictions that FitMind AI actively designs around:

### 3.1 Background Timer Throttling
- **Constraint:** When an iOS Safari PWA is backgrounded, minimized, or the phone screen turns off, WebKit freezes or throttles JavaScript execution (`setInterval`, `setTimeout`, `requestAnimationFrame`).
- **Mitigation:** FitMind AI **never** tracks elapsed time or rest intervals using stateful counters (`seconds++`). Instead, timers are stored as deterministic UNIX timestamps (`startedAt`, `restEndsAt`). When the application resumes or foregrounds, elapsed time and remaining rest are computed instantly: `Date.now() - startedAt`.

### 3.2 Haptic Feedback / Vibration API
- **Constraint:** Apple's WebKit does **not** implement the W3C Vibration API (`navigator.vibrate` is `undefined` on iOS Safari and standalone PWAs).
- **Mitigation:** FitMind AI wraps all vibration calls in safe feature detection (`if (navigator.vibrate) ...`). For rest timer completion, FitMind AI provides an audible Web Audio API synthetic chime (`AudioContext` 880Hz sine tone) as a primary universal cue.

### 3.3 AudioContext Autoplay Policies
- **Constraint:** WebKit blocks `AudioContext` playback unless unlocked by an explicit user gesture (tap/click).
- **Mitigation:** The rest timer sound relies on an `AudioContext` that is warmed up during the user's initial workout interactions (e.g., tapping "Start Workout" or marking a set complete).

### 3.4 Standalone Storage Lifecycle
- **Constraint:** Mobile Safari's 7-day storage deletion policy applies to browser tabs if visited infrequently. However, standalone home-screen web applications (PWAs) are exempt from 7-day auto-purge and maintain persistent storage.
- **Mitigation:** FitMind AI encourages home-screen installation via `InstallPromptCard` and protects active workout drafts from logout deletion.

---

## 4. Service Worker Security & Caching Rules (Section 8.3)

### Context
Caching API responses in a Service Worker can inadvertently cache authenticated user records. On shared devices, if User A logs out and User B logs in, a service worker serving cached API responses could leak private health or workout data between accounts.

### Decision
1. **Static Assets Only:** The Service Worker (`workbox`) precaches only static client bundle assets (HTML, CSS, JavaScript, fonts, SVGs, and brand images).
2. **Denylist for API Routes:** The Workbox configuration explicitly enforces `navigateFallbackDenylist: [/^\/api/]`.
3. **Zero Caching of `/api/*`:** No authenticated API endpoints are ever cached by the Service Worker or HTTP cache. All state caching occurs securely via React Query memory cache tied to authenticated user session life cycles.
4. **Immediate Update Deployment:** In `vercel.json`, service worker files (`sw.js`, `workbox-*.js`) are served with `Cache-Control: no-cache, no-store, must-revalidate` to prevent stale client instances from surviving new production deployments.

---

## 5. Cold-Start Server Waking Indicator

### Context
When deployed on serverless or scale-to-zero container platforms (e.g. Render free tier, Neon serverless PostgreSQL), the backend service can take several seconds to spin up from an idle cold state.

### Decision
On application startup, FitMind AI pings the lightweight `/health` endpoint. If the response is delayed past 4.0 seconds, an unobtrusive banner is displayed: *"Waking up the server, this can take up to a minute."* The banner dismisses immediately as soon as `/health` responds, providing transparent feedback without false error alarms.
