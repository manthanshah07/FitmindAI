# FitMind AI: Final Implementation Plan

**Version:** 2.0 (final), 10 Oct 2026
**Status:** Final. Replaces the earlier "Master Implementation Plan" for roadmap, UI direction and scope. The binding Phase 3C-A idempotency rules are carried forward in Appendix B.
**Project type:** Portfolio and final-year engineering project, one developer, built with Antigravity.
**Stack (unchanged):** React 19, TypeScript, Vite, Tailwind, Zustand. FastAPI, SQLAlchemy, Alembic. PostgreSQL (Neon) in production. Vercel (frontend), Render (backend). Gemini for the AI Coach.

---

## 1. How to use this document

1. Save this file as `docs/FINAL_PLAN.md`. Reduce `AGENTS.md` to a short file that points here. Merge `FitMind_AI_Project_Context.md` and `PROJECT_STATUS.md` into one `docs/STATUS.md` (done in M0).
2. Work on one milestone at a time (M0 to M13), each on its own branch. Every milestone in section 6 is written so it can be given to Antigravity as the task: what to read first, what to build, what not to build, and how to prove it works.
3. Start each milestone with the prompt wrapper in Appendix D.
4. Evidence labels used throughout: **Verified** (seen directly), **Reported** (stated in README or an earlier handoff), **Unverified** (needs a check). Section 3 is based on 18 desktop screenshots and the public README and status file. The source code was not reviewed, so anything about code is marked "verify in M0".
5. Priorities are MUST, SHOULD and COULD. If time runs short, cut from the bottom (section 7).

---

## 2. Decisions locked in by this plan

| # | Decision | Reason |
|---|---|---|
| 1 | FitMind AI is a personal fitness app for everyone, not a gym app. You are the only platform admin. | Gym-owner features need multi-tenancy, billing and roles. That is a second product. |
| 2 | Mobile-first PWA. Design every screen at 390 px wide first. Desktop is the same app with a sidebar. No native app. | One codebase, installable, fast iteration. Native is documented as future work. |
| 3 | Navigation shrinks from 8 items to 5 tabs: Today, Workouts, Nutrition, Progress, Coach. Profile and settings live in an avatar menu. Reports becomes "Weekly review" and Digital Twin becomes "Forecast", both inside Progress. | The same weekly numbers currently appear on three pages. Five tabs is the mobile standard. |
| 4 | New visual direction: calm, neutral, functional (Appendix A). Sans-serif UI font, real icons, one accent colour, no all-caps labels, no monospace body text. Workout Mode is the single bold screen: dark, large numerals. | The current style carries personality that the content should carry. See section 3. |
| 5 | Allowed new dependencies: `lucide-react`, `recharts`, `@fontsource-variable/inter`, Radix UI primitives (dialog, tabs, dropdown-menu, select, toast as needed), `clsx`, `tailwind-merge`, `vite-plugin-pwa`. Dev only: `@playwright/test`, `vitest-axe` or `@axe-core/playwright`. Check what already exists first. No full UI kit with its own theme (no MUI or Chakra). | Accessibility of dialogs, tabs and selects is easy to get wrong by hand. Charts and PWA tooling are standard. |
| 6 | Rewards are badges only. The leaderboard ranks consistency, never body weight, calories or weight lifted. Participation is opt-in. | Avoids rewarding cheating or unhealthy behaviour, and avoids legal questions about real prizes. |
| 7 | No Spotify or Apple Music integration. Music keeps playing in the user's own music app. Workout Mode may include an optional "open music app" shortcut. | Third-party limits make deep integration impractical for a small app. |
| 8 | The Fitness Score may only use data the user actually provided. The fixed "recovery baseline" is removed (finding D3). | A constant contributing 7.5 points is invented data. |
| 9 | Workout adherence measures work done, not sessions logged (finding D4). | Two logged sets must not count as a full workout. |
| 10 | Goal type and target weight must agree (finding D1). Validation lives in the backend and is mirrored in the forms. | A muscle-gain goal with a lower target weight breaks the Forecast and the Coach. |
| 11 | Every metric has exactly one backend implementation. The frontend displays values and never recomputes them (finding D5). | Prevents the same metric showing two different numbers. |
| 12 | The LLM never does arithmetic. The backend passes it computed facts, and it writes language around them. | Fixes finding D11 and keeps the deterministic-core story intact. |
| 13 | Anything not listed in a milestone is out of scope (section 10). | Prevents scope creep. |

---

## 3. Review of the current UI

### 3.1 Overall assessment

The product has more substance than the interface shows: deterministic calculation engines, a forecast, reports and a coach. Two problems hide it.

First, several screens show numbers that do not agree with each other or that are partly invented (section 3.2). For a final-year project this matters more than the visual style, because an examiner who checks the arithmetic will find it.

Second, the visual language does not help the user. A cream background, monospace all-caps labels, hairline boxes around everything and arrow-suffixed links is a look many generated interfaces converge on. Structure that does not carry information (borders around every block, eyebrow labels, status chips like "ONLINE" and "ACTIVE") makes every element look equally important, and the most important action for a gym user, starting a workout, does not exist on the Workout page or the dashboard.

### 3.2 Logic and data problems

All evidence comes from the screenshots. Arithmetic was checked by hand.

| ID | Finding | Evidence | Fix | Milestone |
|---|---|---|---|---|
| D1 | The goal contradicts itself. | Goal is "Muscle gain" with target 78.5 kg, but current weight is 80.9 kg. The calorie target of 3,093 kcal equals TDEE 2,793 plus 300 (a surplus, correct for muscle gain). Yet Progress shows "down 1.8 kg (losing)" as good news and the Forecast says the user needs −0.187 kg per week. | Validate goal type against target direction in the backend and in the forms. Show a "fix your goal" prompt for existing conflicting goals. Fix the demo seed. | M6, M9 |
| D2 | The Forecast's "current plan" matches none of the real targets. | Forecast baseline and recommended plan: 2,612 kcal and 178.5 g protein. Active target: 3,093 kcal and 162 g protein. Seven-day average intake: 2,685.8 kcal. The "recommended" plan for a muscle-gain user (2,612 kcal) is below TDEE (2,793). | Label the baseline honestly (for example "your 28-day average intake"). Base recommendations on the active goal. Test one scenario per goal type. | M7 |
| D3 | The Fitness Score includes invented data. | "Recovery and sleep baseline (10%) 75%, based on standard recommendations" is a constant. Check: 0.30×100 + 0.25×86.66 + 0.20×100 + 0.15×100 + 0.10×75 = 94.17, which displays as 94. So 7.5 of the 94 points are free. It is also the only item under "Needs attention". | Remove it and re-weight (suggested: workouts 35, calories 25, protein 20, logging 20). Version the formula. Add recovery back only if the user logs sleep or energy. | M6 |
| D4 | Workout adherence counts sessions, not work. | Reports show 4 of 4 workouts (100%), but only 8 sets in total, and only Chest and Quadriceps trained. The plan prescribes 14 sets (4+4+3+3) even if the 4 exercises are split across 4 days. 8 sets cannot be 100% either way. The AI summary then praises it. | Session credit = min(1, sets completed ÷ sets planned). Ad-hoc sessions under 3 sets earn no credit. Show "sets completed of planned". | M6 |
| D5 | The same metric has different values on different pages. | Calorie adherence is 86.66% on Dashboard and Progress but 86.8% on Reports (2,685.8 ÷ 3,093 = 86.8%). Nutrition logged on 5 of 7 days (71%), but "Logging consistency" is 100%. "High adherence 88.6%" and "Fitness score 94" are two headline numbers for the same week with no explanation. | One backend function per metric. Endpoints return values. The UI never recomputes. One headline number per week. | M6, M7 |
| D6 | Current weight has two sources. | Profile says 81 kg. The latest weigh-in is 80.9 kg. The Coach quotes 81.0 kg. | Current weight = latest measurement, falling back to the profile value. The profile value is the onboarding baseline. BMR and TDEE use current weight. | M6, M9 |
| D7 | Date of birth appears empty. | The profile shows the placeholder "dd/mm/yyyy" although BMR is 1,802 kcal, which implies an age near 25 (Mifflin-St Jeor: 10×81 + 6.25×178 − 5×age + 5). | Find out whether it is a display bug or a missing field. Fix and test. | M9 |
| D8 | Locale defaults are wrong. | Timezone defaults to America/New_York. Dates appear as both 2026-10-09 and 09/10/2026. Weight is in kg but waist is in inches. | Detect timezone from the browser at signup. One date formatter. A units setting (metric or imperial) applied everywhere. | M1, M9 |
| D9 | Internal and developer language reaches users. | "View spec", "Database catalog explorer", "plan_c22 / c23 / c20", "score = 0.60 × normalized_target_error + …", "AI engine narrative", "Recalculate", "Digital Twin". | Plain language. Formulas move into a "How this is calculated" section. Rename Twin to Forecast. | M4, M6, M7 |
| D10 | Output is overconfident or cheerleading. | "High confidence" shown with 6 weigh-ins and 5 check-ins. The report says "Fantastic job… crushing your protein goal" while D4 applies. | Confidence derived from number of data points and variance. Neutral tone. The AI summary must cite numbers and mention shortfalls. | M7 |
| D11 | The Coach is not grounded in the user's data. | The reply says 1.6 to 2.2 g/kg is "around 135-170 g". For 81 kg that range is about 130 to 178 g. It ignores the user's own target (162 g) and average intake (185.6 g). | The context builder supplies precomputed ranges, actual targets and intake. The UI renders the observations and recommendations fields. Tests mock the LLM. | M8 |
| D12 | Charts and labels mislead. | The weight "trend" is horizontal bars starting at 0 kg, so 80.9 and 82.7 look identical. The Forecast range label is clipped ("[80.0 – 81"). "Recorded sessions: 6" actually means weigh-ins. | Line charts with a trimmed axis and a goal line. Fix labels. | M6, M7 |
| D13 | Content is thin. | The "4-day plan" is 4 exercises with no days. Most exercise descriptions read "Standard training exercise." and all tags are identical. Last session: "2 total sets". Demo data looks unrealistic (207 minutes for 8 sets is about 26 minutes per set). | Day-based plan templates, at least 40 exercises with instructions, and a realistic demo seed. | M4, M13 |

Note: the nutrition targets themselves are internally consistent (162×4 + 418×4 + 85.9×9 = 3,093 kcal). The calculation engines look sound. The problems are in how goals, scores and displays are defined and presented.

### 3.3 UX and visual problems

| ID | Finding | Fix | Milestone |
|---|---|---|---|
| U1 | Heavy monospace, all-caps, wide letter-spacing and 2 px boxes on everything. Mixed monospace and Helvetica-style fonts. Hard to scan. | New type system and tokens (Appendix A). | M1 |
| U2 | No hierarchy and no primary action. The Workout page has "View spec" and "View workout logs" but no "Start workout". The dashboard card says "View workout plan". | One primary button per screen. Start workout on Today and on the Workouts plan. | M3, M4, M5 |
| U3 | Light grey text on off-white, and form values greyed out like disabled fields. Contrast looks well below the 4.5:1 WCAG AA level (verify with a checker). | Tokens with checked contrast. Values shown as normal text. | M1 |
| U4 | Emoji used as navigation icons. They render differently per device and are not accessible. | Replace with `lucide-react` icons with text labels. | M1 |
| U5 | Duplicate chrome: two Log Out buttons, a "FITMIND AI" chip, and the user shown three ways. The page says "Marcus Vance" while the sidebar says "FitMind User". | One avatar menu with the real name. | M1 |
| U6 | Badges that carry no information: "ONBOARDING COMPLETE", "ACTIVE", "ONLINE", "CUSTOM ROUTINE". | Remove. Use chips only for real state (for example "Behind pace"). | M1 to M9 |
| U7 | Redundant pages and too many nav items. Weekly numbers appear on Dashboard, Progress and Reports. | Five tabs, with Review and Forecast inside Progress. | M1, M6, M7 |
| U8 | All 18 screenshots are desktop. The mobile layout, which is the priority, has not been reviewed. | Mobile-first rebuild. Capture 390×844 screenshots after M1 as the baseline. | M1 |
| U9 | Missing standard patterns: date navigation and recent foods on Nutrition, set-by-set logging, suggested prompts in Coach, loading, empty and error states, and account settings (password, export, delete). | Added in the relevant milestones. | M3, M5, M8, M9 |
| U10 | Profile uses whole-page edit mode. The Progress history list scrolls inside a card inside a scrolling page. | Per-section editing. Pages scroll once. | M6, M9 |

### 3.4 What was not reviewed

Mobile layouts, the live workout logger screen (no screenshot), login, signup, onboarding, the landing page, admin pages, loading, empty and error states, and all source code. Milestone M0 resolves what can be checked in code. Capture new screenshots for those screens as each milestone completes.

---

## 4. Design system

### 4.1 Principles

1. Numbers and actions first. Every screen answers one question and offers one primary action.
2. Structure must carry information. Use a border, divider or card only to group things that belong together. Dense data uses lists with dividers, not stacks of identical cards.
3. Plain language. Name things by what the user does, not how the system is built.
4. One bold moment. Workout Mode gets the strongest visual treatment (dark, very large numerals). Everything else stays quiet.
5. Mobile first, accessible by default (WCAG 2.2 AA as the target).

### 4.2 Typography

- One family: Inter Variable, self-hosted through `@fontsource-variable/inter` (no external font request). Chosen for legibility at small sizes on phones and for reliable tabular figures. Personality comes from size and weight contrast in large numerals, not from the typeface.
- Turn on tabular numerals for all numbers (`font-variant-numeric: tabular-nums`) so columns of weights and calories align.
- Scale (px): 12 caption, 14 body small, 16 body, 20 section title, 24 page title, 32 key number, 48 Workout Mode numerals. Weights 400, 500, 600. Line height 1.5 for body, 1.2 for numbers.
- Sentence case everywhere. No all-caps, no letter-spaced labels, no monospace outside code. Line length under 75 characters for paragraphs.

### 4.3 Colour

Tokens are in Appendix A. Summary:

- Neutral cool-grey surfaces (not cream). Text, secondary text and muted text all meet 4.5:1 on the surfaces they sit on (pre-checked by hand, confirm with an automated tool in M1).
- One accent: deep teal (`#0F766E` light, `#2DD4BF` dark) for primary buttons, active tab, links and positive progress.
- Status colours used only for real state: warning (amber), danger (red). Positive state uses the accent, so there is no second green.
- Chart colours are separate from status colours: protein (teal), carbs (indigo), fat (burnt orange). Always label series in text. Never use colour as the only signal.
- Light and dark themes through CSS variables. Workout Mode always uses the dark tokens.

### 4.4 Layout, shape and motion

- 4 px spacing grid. Corner radius by role: 8 for inputs and buttons, 12 for cards and sheets, full for chips. Borders are 1 px. One small shadow, used only on floating elements (sheets, menus).
- Breakpoints: under 768 is the phone layout (single column, bottom tab bar). 768 to 1023 is two-column grids with the bottom bar. 1024 and up shows a 240 px sidebar and a content column of at most 1120 px.
- Use `100dvh`, `viewport-fit=cover`, and `env(safe-area-inset-*)` padding for the tab bar and Workout Mode.
- Touch targets at least 44 px. In Workout Mode at least 48 px.
- Motion only in response to an action (sheet opens, set completed, timer ends). Respect `prefers-reduced-motion`. No entrance animations on page load.

### 4.5 Components (build in M1, in `src/components/ui/`)

AppShell (BottomTabs, Sidebar, TopBar, AvatarMenu), PageHeader, Card, ListRow, StatTile, Button (primary, secondary, ghost, destructive; md and lg), IconButton, TextField, NumberStepper, Select, SegmentedControl, Tabs, Dialog, BottomSheet, Toast, Chip, ProgressBar, Ring, Skeleton, EmptyState, ErrorState (with retry), Banner, and chart wrappers (LineChart, BarChart, MacroBar) around Recharts.

Rules: every list has loading, empty and error states. Every icon-only button has an accessible name. Focus ring is always visible (2 px accent with offset). One `h1` per page.

### 4.6 Copy rules

Sentence case. Buttons name the action: "Start workout", "Save workout", "Add food", "Save changes". The same action keeps the same name through the whole flow. Errors say what happened and what to do next, without apologising. Empty states invite an action ("No meals logged yet. Add your first food."). No emoji, no exclamation marks in system text, no arrows in button labels, no food moralising ("good" or "bad" food). AI text is neutral and specific. Internal terms never appear in the UI: "spec", "catalog", "heuristic", "narrative", plan IDs.

Use one formatter module (`src/lib/format.ts`): dates like "Fri 9 Oct", kcal as whole numbers with thousands separators, kg to one decimal, units from the user's setting.

---

## 5. Information architecture and routes

Adapt names to the existing router. Keep redirects from old paths.

| Area | Route | Notes |
|---|---|---|
| Today | `/today` (redirect from `/dashboard`) | Start workout, nutrition remaining, this week, one insight |
| Workouts | `/workouts` with segments Plan, History, Exercises | Plan days with Start workout |
| Workout Mode | `/workouts/session` | Full screen, no tab bar, dark |
| Nutrition | `/nutrition` with an add-food sheet | Date navigation |
| Progress | `/progress` with segments Overview, Body, Weekly review, Forecast | Replaces Progress, Reports and Digital Twin pages |
| Coach | `/coach` | Chat |
| Settings | `/settings` (redirect from `/profile`) | Profile, goal, training, preferences, account |
| Challenges | `/challenges` | Reached from Today and the avatar menu (M12) |
| Admin | `/admin/*` | Separate layout, admins only (M11) |
| Public | `/`, `/login`, `/signup`, `/onboarding` | Restyled |

Mobile tab bar: Today, Workouts, Nutrition, Progress, Coach. Avatar menu: Settings, Challenges (when enabled), Theme, Log out (once).

---

## 6. Milestones

Format for each milestone: priority, rough effort (full-time days with AI assistance; multiply by 2 to 3 if part-time), dependencies, what to read first, tasks, out of scope, acceptance. Labels: [BE] backend, [FE] frontend, [DB] migration, [TEST], [DOC].

Rule for all milestones: if a page's milestone is cut, that page still gets a "reskin-only" treatment (new shell and components, no new features) before release. No page ships in the old style.

### M0. Baseline, hygiene and open questions

**MUST, 1 day, depends on nothing.**

**Read first:** `README.md`, `PROJECT_STATUS.md`, `AGENTS.md`, `.github/workflows/ci.yml`, `backend/alembic/versions/`, `backend/app/main.py`.

**Tasks**
1. [DOC] Record the git state: branch, commit, `git status`, `git log origin/main..HEAD`, `git branch -a`, `git stash list`. Find any unpushed or branch-only Phase 3C work.
2. [DB] Run `alembic heads` and `alembic history`. The README lists migrations only up to `2026_08_16_0011`, while an earlier handoff mentions `2026_08_20_0012`. Record which is true.
3. [TEST] Run and record exact results: `cd backend && .venv/bin/pytest -q`, `npm run test`, the type-check, `npm run build`, and the lint script. The README says both 249 and 253 backend tests. Record the real number.
4. [DOC] Answer these open questions by reading code, and write the answers in `docs/STATUS.md`:
   - V1: Does workout plan data have per-day grouping, or is it a flat exercise list?
   - V2: Where is the live workout logger UI? What fields does each set send (exercise_id, set_number, reps, weight_kg, rpe, notes)?
   - V3: Which workout read endpoints exist (list, detail, last performance)?
   - V4: Can meal items be edited and deleted? Does the nutrition summary accept a date?
   - V5: Which admin authorisation is real: `is_admin` or an `X-Admin-Secret` header? (README and status file disagree.)
   - V6: How is date of birth stored and rendered in the profile form?
   - V7: Is TanStack Query used? Which Tailwind major version? What are the router paths?
   - V8: What are the rate limits on `POST /workout/logs` and `POST /coach/chat`?
   - V9: How is the Fitness Score computed and stored (`fitness_scores` columns)?
   - V10: Which indexes exist on workout and meal log tables?
   - V11: Is the Gemini model name an environment variable?
   - V12: How is the demo user created, and is there a seed script?
5. [BE] Add a database safety guard in the test setup, the Alembic `env.py` and any script: refuse to run when `DATABASE_URL` points to a host that is not localhost or SQLite unless `ALLOW_REMOTE_DB=1` is set. Production is Neon, so this prevents tests or migrations from touching it by accident.
6. [DOC] Secrets check. Search git history for committed keys (for example with `gitleaks` or `git log -p -S`). The status file says credentials were "sanitized", so rotate the Gemini key and JWT secret if they were ever committed. Review `scratch/`, then remove it from the repo and add it to `.gitignore`.
7. [DOC] Merge `PROJECT_STATUS.md` and `FitMind_AI_Project_Context.md` into `docs/STATUS.md`. Fix the README (test counts, migration table, admin description). Update `AGENTS.md` to point to `docs/FINAL_PLAN.md`.
8. Keep `main` deployable. Work on branches named `m<number>-<name>`. Vercel creates preview deployments for branches.

**Out of scope:** any feature or UI change.

**Acceptance:** `docs/STATUS.md` exists with verified facts and answers to V1 to V12. Tests are green or failures are listed. The DB guard has a test. No secrets in history, or they are rotated.

---

### M1. Design system and app shell

**MUST, 4 days, depends on M0.**

**Read first:** Section 4 and Appendix A. `package.json`, `tailwind.config.js`, `src/styles/design-tokens.css`, the router and the current AppShell.

**Tasks**
1. [FE] Install only the dependencies in decision 5 that are not already present.
2. [FE] Create `src/styles/tokens.css` from Appendix A and map the tokens in the Tailwind config. Remove the global uppercase and monospace styles. Keep old tokens under a `legacy-` prefix only for pages not yet migrated. They are deleted in M13.
3. [FE] Self-host Inter Variable. Enable tabular numerals globally.
4. [FE] Build the components in section 4.5, each with a basic accessibility test (role and accessible name).
5. [FE] Build the new AppShell: bottom tab bar on phones, sidebar on desktop, top bar with page title and one avatar menu (Settings, Theme, Log out). Show the real name from the profile. Remove the duplicate Log Out buttons and the "FITMIND AI" chip. Replace emoji with `lucide-react` icons.
6. [FE] Apply the route map in section 5 with redirects from old paths. Add a Workout Mode route outside the shell (placeholder for M3).
7. [FE] Create `src/lib/format.ts` (dates, numbers, units) with unit tests. Use it from the shell.
8. [FE] Restyle Login and Signup with the new components. Add show or hide password and clear error messages. No API changes.
9. [FE] Add a development-only `/dev/ui` page showing every component in light and dark, for review and screenshots.
10. [FE] Create the Theme toggle (light, dark, system) stored in `localStorage` (wrapped in try/catch).

**Out of scope:** redesigning inner pages (done in later milestones), new features, backend changes.

**Acceptance:** All existing routes render inside the new shell. No horizontal scroll at 360 px. Tab bar respects safe areas. Zero critical axe violations on login and the shell. Screenshots at 390×844 and 1280×800 saved to `docs/screens/m1/`. Existing tests pass or are updated for the new markup.

---

### M2. Idempotent workout API (Phase 3C-A)

**MUST, 3 days, depends on M0.** Full binding spec in Appendix B.

**Read first:** Appendix B, the workout log model, schema and service, the existing workout tests, the CORS configuration.

**Tasks**
1. [DB] Check the actual current Alembic head, then create one additive migration adding `idempotency_key` (nullable, 128 chars), `request_fingerprint` (nullable, 64 chars) and the unique constraint on `(user_id, idempotency_key)`. Use `batch_alter_table` so SQLite works.
2. [BE] Implement canonicalisation, the keyed submit flow, the race-safe recovery path, and the response contract exactly as in Appendix B.
3. [BE] CORS: allow the `Idempotency-Key` request header and expose `X-Idempotency-Replay` so the browser can read it.
4. [BE] Confirm the rate limit on `POST /workout/logs` does not block normal retries.
5. [TEST] All tests listed in Appendix B. Add a CI job with a PostgreSQL 16 service container that runs the Postgres-marked tests and an Alembic upgrade and downgrade on an empty database.

**Out of scope:** any frontend change, adding `order_index`, changing unkeyed behaviour, deployment.

**Acceptance:** Contract table in Appendix B demonstrated by tests. Legacy unkeyed calls unchanged. The recovery test reaches the `IntegrityError` branch. Postgres tests pass in CI. Until then PostgreSQL concurrency stays labelled unverified.

**Deployment order for M2 and M3:** deploy and migrate the backend first, then the frontend. An old backend ignores the header and would not deduplicate.

---

### M3. Workout Mode and draft recovery (Phase 3C-B and 3C-C)

**MUST, 7 days, depends on M1 and M2.** This is the flagship feature of the project.

**Read first:** Appendices B and C. The existing workout logger, its store and its tests. Wireframe in Appendix E.

**Behaviour**
- Entry points: a Start workout button on Today and on a plan day, plus "Start empty workout". If a draft exists, the entry becomes "Resume workout".
- Starting creates a draft: a frozen `startedAt`, a UUID idempotency key, and the exercises from the chosen template (target sets, reps, rest). In M3 the template is the whole current plan or an empty session. M4 supplies per-day templates, so the session screen reads a generic `SessionTemplate`.
- Full-screen route with no tab bar, dark theme. A top bar shows an elapsed timer (computed from `startedAt`, so it survives refresh), "Exercise 2 of 5", a close button and Finish.
- One exercise at a time. Previous and Next buttons plus an exercise list sheet. A set table with set number, previous result, weight, reps and a complete button (at least 48 px). Weight and reps are prefilled from the last time the user did the exercise and stay editable. Tapping complete confirms them, so a normal set is one tap.
- Numeric inputs use `inputmode="decimal"` (weight) and `inputmode="numeric"` (reps). Weight allows at most two decimals. Warn, without blocking, on unusual values.
- Add set, remove set, add exercise (search sheet), per-workout notes. Notes are stored exactly as typed (see Appendix C).
- Completing a set starts the rest timer from the plan's rest value. The timer is based on a stored end timestamp, so it survives lock screen and refresh. Controls: minus 15 s, plus 15 s, Skip. At zero: visible state change, optional sound, vibration where supported, and a polite screen-reader announcement.
- Wake Lock: request on start, re-request when the page becomes visible, release on finish. A setting turns it off. Fail silently if unsupported.
- Finish: a summary sheet with duration, sets completed versus planned, and volume. Sets not marked complete are dropped after confirmation. At least one completed set is required. Tapping Save freezes `endedAt` once, then submits with the stored idempotency key.
- Submit states: saving, saved, "Saved on this device, will retry" (network error), conflict (409), validation error (422). Retries reuse the same key and timestamps. Automatic retry on the `online` event and with backoff (about 2, 5, 15, 30 s, then stop and show Retry). Clear the draft only after a 201 or 200.
- Guard against accidental exit: confirm on close, handle the browser back button, and use `beforeunload`.
- Optional shortcut button "Open music app" linking to the user's music service. No SDK, no login.

**Draft storage (Appendix C):** write on every change, debounced 300 ms, to `localStorage` in a key that includes the user id. Wrap every access in try/catch. If a draft cannot be parsed: keep the raw string, copy it to a quarantine key, verify the copy, and only then offer "Discard". Never auto-delete or overwrite quarantine entries. If storage is full: leave the existing draft untouched, show a blocking warning, and offer Copy draft and Download JSON. A draft older than 24 hours prompts "Save as completed" or "Discard" with explicit confirmation. Drafts are never shown to another user on the same browser. Do not delete drafts on logout.

**Out of scope:** per-day plan generation (M4), music SDKs, native features, PWA install (M10), supersets, rest-timer push notifications.

**Tests**
- Store and reducer: add, complete, remove, finish, resume.
- Draft storage: exact note round trip (`null`, `""`, `"   "`, text), quota error, corrupt JSON, quarantine verified before discard, two users on one browser, stale draft.
- Timer: timestamp-based with fake timers, survives refresh.
- Submit: 201 clears the draft, network error keeps it, retry reuses the same key and timestamps, 409 keeps the draft, 422 shows field errors, double tap sends one request.
- Accessibility: labels, focus order, `aria-live` announcements (not every second), reduced motion.
- Manual on a real phone (iPhone Safari, installed PWA when available, Android Chrome): kill the tab mid-set and resume, airplane mode finish then reconnect, screen stays awake, large touch targets, one-handed use.

**Acceptance:** A workout can be started, logged set by set, interrupted at any point, resumed with identical values and timer, and saved exactly once even after repeated retries. Screenshots at 390×844 saved to `docs/screens/m3/`.

---

### M4. Workouts hub, plan days, exercise library and history

**MUST (lite version), 4 days, depends on M1 and M3.**

**Read first:** V1 to V3 answers in `docs/STATUS.md`, the plan generator, the exercise seed, workout models and routes.

**Tasks**
1. [BE] Expand the exercise seed to at least 40 exercises with: name, short instructions (2 to 4 sentences), primary and secondary muscles, equipment, movement type, and correct difficulty. Replace the "Standard training exercise." placeholders.
2. [BE] Plan generator v2, rule-based and deterministic. Templates by days per week: 2 to 3 days full body A and B, 4 days upper and lower twice, 5 days push, pull, legs, upper, lower, 6 days push, pull, legs twice. Choose exercises from the user's available equipment, compound lifts first, 4 to 6 exercises per day depending on preferred duration, sets and reps by goal, rest seconds per exercise. Same input gives the same output. Regenerating a plan requires user confirmation.
3. [DB] If V1 shows no day grouping, add an additive `day_index` column on plan exercises (and a day label). Optionally add a nullable plan day reference on workout logs so adherence can match a session to a day.
4. [BE] Read endpoints if missing: workout history list (paginated), history detail, and last performance for a list of exercise ids (used for prefill in M3).
5. [FE] Workouts page with three segments:
   - Plan: week strip, a card per day listing exercises with sets and reps, Start workout on today's day, and a way to start any day.
   - History: sessions with date, name, duration, sets and volume. Detail view shows each exercise and set, with personal records marked.
   - Exercises: search, muscle and equipment filters, a detail sheet with instructions and muscles. Not shown as a catalogue or database.
6. [FE] Wire Start workout to supply the day's `SessionTemplate` to Workout Mode.

**Fallback if time is short:** ship a hand-written library of 3, 4 and 5 day templates as static data selected by days per week and equipment. Keep the Plan, History and Exercises UI.

**Out of scope:** AI-generated plans, drag-and-drop plan editing, exercise videos.

**Acceptance:** A 4-day user gets four distinct days with 4 to 6 exercises each, none needing unavailable equipment. The generator has deterministic tests. History shows realistic sessions. No placeholder text remains. Screenshots saved.

---

### M5. Today and Nutrition

**MUST, 5 days, depends on M1.**

**Read first:** V4, nutrition models, routes and the existing nutrition and dashboard pages.

**Today page (top to bottom on a phone)**
1. Greeting with first name and date.
2. Workout card: today's day with exercise count and estimated time and a Start workout button. If a draft exists, Resume workout with elapsed time. If done, a one-line summary. Rest day shows a rest message.
3. Nutrition card: calories remaining as the key number, a bar or ring, protein, carbs and fat bars, and an Add food button.
4. This week: workouts completed (dots), nutrition logged days, weight change, Fitness Score with change and a link to Progress.
5. One insight line. Deterministic text first (for example "You are 800 kcal under today's target"). No AI call on page load.
6. Onboarding banner only if onboarding is incomplete.

**Nutrition page**
- Date navigation (previous, next, calendar sheet). Summary card with calories remaining and macro bars. An info popover explains where the target comes from (TDEE plus or minus goal adjustment).
- Meals grouped by Breakfast, Lunch, Dinner and Snacks. Each item row shows name, serving and kcal. Tap to edit the quantity or delete (add endpoints if V4 says they are missing).
- One Add food button (floating on phones). The add flow is a full-screen sheet: search field focused, segments Recent, Favourites and All, pick a food, adjust the serving with a stepper, see live macros, tap "Add to Lunch". Also Quick add (manual calories and macros) and "Copy yesterday's meal" (COULD).
- [BE] Recent foods endpoint (computed from logs). Favourites table is COULD. Seed at least 150 foods including common regional foods (for example roti, dal, rice, paneer, idli, curd) so the demo works for Indian users.
- [BE] Make the summary accept a date if it does not.

**Out of scope:** barcode scanning, meal photos, water tracking, recipes.

**Acceptance:** Logging a repeated meal takes at most 3 taps from Today (Add food, pick from Recent, Add). Edit and delete work. Totals match between Today and Nutrition because both use the same backend values. Empty, loading and error states exist. Screenshots saved.

---

### M6. Progress, Fitness Score and goal integrity

**MUST, 5 days, depends on M1 and M4.** Fixes findings D1, D3, D4, D5, D6 and D12.

**Read first:** V9, the score service, `fitness_scores` model, goal model and schemas, progress and report services.

**Tasks**
1. [BE] Create one metrics module used by Today, Progress and Reports. Every metric (calorie adherence, protein adherence, nutrition days logged, workout adherence, score) is defined once, documented in `docs/FITNESS_SCORE.md`, and returned by the API. Resolve the 86.66% versus 86.8% difference by choosing one definition.
2. [BE] Fitness Score changes: remove the fixed recovery baseline, re-weight (suggested 35 workouts, 25 calories, 20 protein, 20 logging, confirm after reading the current code), and keep the existing calorie, protein and logging formulas unless tests show a defect. Add a `formula_version` so old history is not compared with new scores. Compute on read and store at most one snapshot per day. Remove the manual Recalculate button.
3. [BE] Workout adherence: session credit = min(1, sets completed ÷ sets planned for that day). If a session is not linked to a plan day, use the plan's average sets per day. An ad-hoc session under 3 sets earns no credit. Weekly adherence = sum of credits ÷ target days, capped at 100%. Expose sets completed and sets planned.
4. [BE] Goal validation: goal types lose fat, build muscle, maintain or recomposition. Fat loss needs a target below current weight. Muscle gain needs a target at or above current weight. Return clear error messages. Do not delete existing conflicting data. Return a flag so the UI can ask the user to fix it.
5. [BE] Current weight is the latest measurement, falling back to the profile value. BMR and TDEE use it.
6. [FE] Progress page with segments Overview, Body, Weekly review (M7) and Forecast (M7).
   - Overview: Fitness Score with grade and weekly trend line. Components as a list with bars (Workouts, Calories, Protein, Logging). A "What to improve" line based on the lowest component with a specific action. A "How this is calculated" section with the exact formula. A weight line chart with range tabs (4 weeks, 12 weeks, 6 months, All), a goal line and a trend line. Tiles for current weight, change over the range and distance to goal.
   - Body: measurement history as a list (not a nested scroll box), a chart of the selected measurement, and an Add measurement sheet. Units from settings.
7. [DOC] Fix the demo seed so the goal is consistent and sessions are realistic.

**Out of scope:** adding sleep or recovery logging (COULD later), new score components.

**Acceptance:** Tests for each metric, boundary values, weights summing to 100, deterministic results, goal validation for each type, and a test that Today, Progress and Reports return identical values for the same week. A user with 2 sets logged does not get 100% workout adherence. No metric appears with two values anywhere in the UI.

---

### M7. Weekly review and Forecast

**SHOULD, 4 days, depends on M6.** Fixes D2, D9, D10 and D12.

**Weekly review (replaces the Reports page)**
- Weekly and Monthly toggle with a date range switcher. A single headline (the Fitness Score) and four tiles: workouts (sets completed of planned), nutrition days logged, average calories and protein versus target, weight change.
- Three lists generated by deterministic rules: What went well, What needs attention, Next week's focus. Rows use neutral wording and an icon for positive, neutral or attention. Not everything gets a tick.
- Week-over-week change on each tile.
- AI summary only on request ("Write summary"), cached per period, labelled as AI-written, neutral tone, short. The prompt supplies the computed facts (including shortfalls) and forbids new numbers. Tests mock the model.

**Forecast (replaces Digital Twin)**
- Top: one plain-language answer, for example "At your current pace you will reach about X kg by DATE. To reach 78.5 kg by 7 Jan you need Y kg per week." With a status chip (On pace, Behind pace, Ahead of pace) and a data note ("Based on 6 weigh-ins") instead of a fixed "High confidence". Confidence comes from the number of data points and variance.
- Chart: past actual weights and the projected path with its range, a goal line, and a sensible y-axis. No clipped labels.
- "Try a different plan": two sliders (calories, protein), an activity select and three presets. A result card compares against the current plan. Nothing here changes the active plan. A separate, explicit "Use this plan" action asks for confirmation.
- "Recommended plan": one card with a plain explanation. Alternatives sit behind "See other options" with readable labels and the differences highlighted (never `plan_c22`). The ranking formula goes under "How this is chosen".
- All numbers rounded sensibly (kg to one decimal, kcal to whole numbers). The baseline is labelled for what it is. Recommendations follow the active goal type.

**Out of scope:** new forecasting models, saving scenarios.

**Acceptance:** Tests for each goal type (lose fat, build muscle, maintain) showing the recommended plan moves in the right direction. No internal identifiers or formulas visible without opening "How this works". Screenshots saved.

---

### M8. Coach

**SHOULD, 3 days, depends on M6.** Fixes D11.

**Tasks**
1. [BE] Context builder supplies a facts block: current weight, active goal, calorie and protein targets, seven-day and 28-day averages, recent workouts, and precomputed protein range (g per kg and grams) from current weight. The system prompt says to use only provided numbers. If data is missing it must say so.
2. [BE] Validate the structured reply (answer, observations, recommendations, warnings, data_quality). Handle timeouts and quota errors with a clear message. Keep the model name in an environment variable. Check that it is still available before the demo.
3. [FE] Chat layout: message list that stays anchored at the bottom, input pinned above the keyboard (`dvh`), loading indicator, error with retry, and "New conversation".
4. [FE] Suggested prompts ("How am I doing this week?", "Is my protein on target?", "What should I train tomorrow?"). A line "Coach uses your last 30 days of data" opens a short explanation of what is shared with the AI provider.
5. [FE] Render the full reply: answer first, then a collapsible "Based on" list (observations), recommendations as a list, warnings highlighted. Recommendations that would change data (plan, targets) are suggestions only. They never apply silently.
6. One-line notice that the Coach is not medical advice.

**Tests (LLM mocked):** protein range arithmetic is correct for the user's weight, the reply uses the user's actual target, missing data produces a "not enough data" answer, timeout produces a friendly error, user A's context never contains user B's data.

**Out of scope:** streaming, voice, vector memory, tool-calling that edits data.

**Acceptance:** The earlier example question returns a range consistent with the user's weight and mentions the user's own target and intake.

---

### M9. Settings, onboarding and account

**SHOULD, 4 days, depends on M1 and M6.** Fixes D6, D7 and D8.

**Tasks**
1. [FE] Settings page (rename of Profile). On phones, a list of sections that open detail screens. On desktop, tabs on the left. Sections: Profile (name, date of birth, gender, height), Goal, Training (equipment, days per week, duration), Preferences (units, timezone, theme, keep screen on during workouts, rest-timer sound), Health notes (with a line saying they are used by the Coach), Account.
2. [FE] Per-section editing with Save and Cancel. Values appear as normal text until edited, not as greyed disabled fields.
3. [FE] Goal section: goal type chooser with descriptions, target weight with a direction hint, optional target date with a suggested safe pace, and the conflict prompt from M6.
4. [FE/BE] Fix the date of birth issue (D7). Detect timezone with `Intl.DateTimeFormat().resolvedOptions().timeZone` at signup.
5. [BE] Account: change password, export my data (JSON download of the user's own records), delete account (with password confirmation, removes the user's data and revokes tokens). Each with tests. Export and delete are SHOULD, change password is MUST within this milestone.
6. [FE] Restyle onboarding: keep the five steps, add a progress indicator, one topic per screen, defaults, goal validation, optional steps skippable, and a final summary showing BMR and TDEE with a plain explanation.

**Out of scope:** email verification, social login, two-factor authentication, notification settings.

**Acceptance:** Date of birth displays correctly. Conflicting goals cannot be saved. Export returns only the requesting user's data. Delete removes data and blocks login. Screenshots saved.

---

### M10. PWA and mobile polish

**MUST, 3 days, depends on M3 and M5.**

**Tasks**
1. [FE] Use `vite-plugin-pwa`: manifest (name, short name, 192 and 512 icons plus a maskable icon, theme and background colours, `display: standalone`, `start_url: /today`), service worker that precaches only static assets, update prompt (`registerType: 'prompt'`). Do NOT cache authenticated API responses in the service worker, because that can leak data between users on a shared device.
2. [FE] iOS support: `apple-touch-icon`, `apple-mobile-web-app-capable`, status bar style, `viewport-fit=cover`. An install hint card ("Share, then Add to Home Screen") on iOS and an install button where `beforeinstallprompt` exists. Show it once and let the user dismiss it.
3. [FE] Offline: a branded offline page for navigation, an offline banner, and Workout Mode keeps working offline (drafts are local).
4. [FE] Server waking state: Render's free tier and Neon can take many seconds on the first request. Ping `/health` when the app opens. If a request takes longer than about 4 seconds, show "Waking up the server, this can take up to a minute."
5. [FE] Check `vercel.json` rewrites for the SPA, and make sure the service worker file is not cached long-term.
6. [FE] Mobile audit of every page at 360, 390 and 430 px: no horizontal scroll, safe areas, keyboard does not hide inputs, tap targets, sticky actions.
7. [DOC] Test on real devices: iPhone Safari, the installed home-screen app, and Android Chrome. Verify with the DevTools Application panel (manifest and service worker). Record what does not work on iOS (for example background timers and vibration) in `docs/DECISIONS.md`.

**Out of scope:** push notifications, background sync, app-store packaging.

**Acceptance:** The app installs on iOS and Android, opens full screen, and an interrupted workout can be completed offline and submitted when the connection returns.

---

### M11. Platform admin

**SHOULD, 4 days, depends on M0 and M1.**

**Decisions:** Authorisation is the user's `is_admin` flag, checked in the database on every admin request (not only a claim in the token), so removing admin rights takes effect immediately. Admin accounts are created by an environment variable or a command-line script, never through the API. If V5 shows an `X-Admin-Secret` model, remove it from UI-facing routes. Keep it only for operational scripts, and document it.

**Tasks**
1. [DB] Additive migration: `users.is_active` (default true), `users.last_active_at`, and an `admin_audit_log` table (admin_id, action, target_user_id, details, created_at).
2. [BE] Endpoints under `/api/v1/admin/*` with a `require_admin` dependency: overview stats (total users, new in 7 days, active in 7 days, workouts logged in 7 days), paginated user list with search and filters, activate or deactivate, grant or revoke admin (cannot change yourself, cannot remove the last admin), content management for exercises and foods (create, edit, hide), and the audit log.
3. [BE] Deactivated users cannot log in or refresh, and their refresh tokens are revoked.
4. [BE] Privacy: the admin sees email, dates, status and aggregate counts only. No workout, meal, measurement or chat content.
5. [FE] Separate admin layout with an obvious "Admin" indicator: Overview, Users, Content, Audit log. Tables with pagination, search, confirmation dialogs for destructive actions, and responsive behaviour for phones.

**Tests:** non-admin gets 403 on every admin route, a user cannot grant themselves admin (including by editing their own profile payload), the last-admin rule, deactivated user cannot log in, every admin action writes an audit row, no health data in admin responses.

**Out of scope:** gym or member management, payments, impersonating users, email sending.

**Acceptance:** Tests above pass and the admin pages work with real data.

---

### M12. Challenges and badges

**COULD, 4 days, depends on M6 and M11.** Cut this first if time is short.

**Rules**
- Opt-in. Default off. A user chooses a public alias (3 to 20 characters, letters, numbers and underscore, unique, reserved words blocked). Only the alias, points and badges are visible to others. Admins can hide an alias.
- Weekly League, with weeks running Monday 00:00 to Sunday 23:59 UTC (documented). Points are computed on read from existing records, so no scheduler is needed:
  - 20 points per qualifying workout. Qualifying means at least 5 completed sets and at least 15 minutes, one per calendar day, five per week at most.
  - 5 points per day with at least 2 meal entries logged. No calorie or weight conditions, so nothing rewards under-eating.
  - 5 points once per week for a weigh-in.
  - Maximum 140 points per week.
- Tie-break: more qualifying workouts, then earlier time of reaching the total, then alias alphabetically.
- Leaderboard shows the top 20 and the user's own rank.
- Badges (never money): first workout, 10 workouts, 50 workouts, first weigh-in, 7 days logged, 3 consecutive weeks with at least 3 workouts. Stored in `user_badges` with a unique `(user_id, badge_key)` so awarding is idempotent.

**Tasks:** [DB] columns on `users` (`leaderboard_opt_in`, `public_alias`) and the `user_badges` table. [BE] points service, leaderboard and badge endpoints, admin hide action. [FE] Challenges page (this week, rank, badges, opt-in switch), a card on Today when opted in.

**Tests:** points arithmetic and caps, tie-breaking, a user with fewer than 5 sets earns no workout points, opted-out users never appear, no health data in responses, duplicate badge awards are impossible.

**Out of scope:** friends, chat, rewards with monetary value, notifications.

**Acceptance:** Two seeded users appear with correct rank and points. Opting out removes the user immediately.

---

### M13. Hardening, QA, documentation and release

**MUST, 5 days, depends on everything shipped before it.**

**Tasks**
1. [FE] Delete the `legacy-` tokens and the old styles. Reskin any page that has not been migrated.
2. [FE] Code-split routes with `React.lazy`. Load charts only on pages that need them. Add error boundaries, a 404 page, skeletons, and check the production bundle size.
3. [TEST] Playwright with a mobile viewport: sign up, onboard, start a workout, log sets, finish, see it in history, reload during a workout and resume, and an offline submit that retries. Run axe on main pages. Add Playwright to CI for `main` only if it is stable.
4. [TEST] Backend: data isolation tests (user A cannot read or change user B's workouts, meals, measurements, chats), authorisation on every route, and PostgreSQL tests in CI.
5. [BE] Security pass: CORS origins, JWT expiry and refresh rotation, password rules, rate limits on auth and coach, secure headers on Vercel, `npm audit` and `pip-audit`, no secrets in the repo, logging without sensitive data.
6. [DOC] Seed script `backend/scripts/seed_demo.py` (refuses non-local databases without the override) that creates a realistic demo user and history. Document the demo login in the README.
7. [DOC] README rewrite: what it is, screenshots and a short screen recording of Workout Mode on a phone, architecture diagram (Mermaid), feature list, tech decisions, test and CI status, setup, limitations.
8. [DOC] `docs/ARCHITECTURE.md` (components, data flow, deterministic core versus AI layer), `docs/DECISIONS.md` (why PWA not native, why idempotency, why no Spotify, why rule-based plans, iOS limits), `docs/TESTING.md`, `docs/PRIVACY_AND_SAFETY.md` (what data is sent to the AI provider, health disclaimer).
9. [DOC] Demo script (about 5 minutes): login, Today, Start workout on a phone, interrupt and resume, save, history, nutrition quick add, Progress and Forecast, Coach, admin.
10. Rehearse migrations on a disposable Postgres (local Docker or a Neon branch) before touching production. Document the backup and restore options on your Neon plan.
11. Release: tag `v1.0.0` after the release checklist (section 9) passes. Production deployment is a manual step you perform: backend and migration first, then frontend.

**Acceptance:** Section 9 checklist is fully ticked.

---

## 7. Cut lines and timeline

| Tier | Milestones | Rough days (full-time, AI-assisted) |
|---|---|---|
| MUST | M0, M1, M2, M3, M4 (lite), M5, M6, M10, M13 | about 37 |
| SHOULD | M7, M8, M9, M11 | about 15 |
| COULD | M12 | about 4 |

Part-time (around 20 hours a week) multiply by 2 to 3. If you have about 8 weeks of working time, do the MUST tier plus M7 and M8. With about 12 weeks, do everything except M12. With 16 weeks or more, do all of it.

Order of work: M0, M1, M2, M3, M4, M5, M6, M10, M7, M8, M9, M11, M13, with M12 only if time remains. M10 comes before M7 to M9 so the installable mobile app exists early. M13 always happens last and is never cut.

If a milestone is cut, its pages still get the reskin-only treatment (new shell and components, no new features). Cut features, never quality or accuracy.

---

## 8. Rules for every milestone

### 8.1 Definition of done

1. The behaviour in the milestone works, and nothing outside it changed.
2. Relevant tests were run and pass (commands and results recorded in `docs/STATUS.md`). Any failure or skipped test is listed.
3. Mobile (390×844) and desktop (1280×800) screenshots saved in `docs/screens/m<n>/`.
4. Zero console errors. Zero critical axe violations on new pages.
5. Design checklist (8.2) passes.
6. The diff was reviewed by you and has no unrelated changes.
7. `docs/STATUS.md` updated (current branch and commit, migration head, tests, known issues).

### 8.2 Design checklist

- No all-caps text, no monospace outside code, no emoji, no arrows in button labels.
- One primary button per screen. Every list has loading, empty and error states.
- Text contrast at least 4.5:1. Touch targets at least 44 px (48 px in Workout Mode). Visible focus ring.
- No horizontal scroll at 360 px. Pages scroll once, with no nested scroll boxes.
- All numbers go through the formatter. Dates and units are consistent.
- No internal terms or identifiers visible: spec, catalog, heuristic, narrative, plan IDs.
- Meaning is never carried by colour alone.
- Reduced-motion respected.

### 8.3 Data and security rules

- The backend is the single source of truth for every metric. The frontend displays and never recomputes.
- The backend derives the user from the token. Never trust a user id from the client.
- Migrations are additive, rehearsed on a disposable database, and deployed before the frontend that depends on them. Never run experiments against Neon production.
- The AI receives only the data needed. It never calculates. It never changes data without explicit confirmation.
- Never cache authenticated API responses in the service worker.

### 8.4 Working with Antigravity

- Use the prompt wrapper in Appendix D. If your Antigravity version has a planning mode, use it for M2, M3, M11 and M12 (schema and security). Fast mode is fine for pure UI work.
- Ask the agent to capture mobile and desktop screenshots in the browser as acceptance evidence, if your version supports it. Otherwise take them yourself.
- Review every diff before merging. Watch for these common agent failures: invented files or endpoints, tests that assert nothing, mocking away the thing being tested, disabling lint or type rules to get green, hard-coded demo data in components, editing many unrelated files, and tests that call the real LLM.
- If the agent says something was tested, ask for the command and the output.

---

## 9. Release checklist for v1.0.0

- [ ] M0 to M6, M10 and M13 are complete. SHOULD and COULD milestones are either complete or recorded as future work in the README.
- [ ] Workout Mode: start, log, interrupt, resume, save once, verified on a real iPhone and Android phone.
- [ ] No metric appears with two different values anywhere in the app.
- [ ] No fabricated inputs in the Fitness Score. Formula documented and tested.
- [ ] Goal type and target weight cannot conflict.
- [ ] All pages use the new design system. No legacy styles left.
- [ ] axe shows no critical issues on the main pages. Contrast and touch target checks pass.
- [ ] PWA installs and works offline for Workout Mode.
- [ ] Backend and frontend tests pass in CI, including PostgreSQL tests.
- [ ] Data isolation and admin authorisation tests pass.
- [ ] No secrets in the repo or its history. Keys rotated if ever exposed.
- [ ] README, architecture, decisions, testing and privacy documents are written and accurate.
- [ ] Demo seed and 5-minute demo script rehearsed on the deployed app, including a cold start.
- [ ] Gemini model name verified as available.
- [ ] You can explain the idempotency flow, the deterministic-versus-AI split, and the draft recovery design without notes.

---

## 10. Out of scope (document as future work)

Native iOS or Android app, Spotify or Apple Music integration, barcode scanning, wearable or Apple Health integration, camera form analysis, gym-owner or member management, payments or real-money rewards, email verification, social features or messaging, vector database or long-term semantic memory, push notifications, AI-generated workout plans, video exercise library.

---

## Appendix A. Design tokens

Contrast values were checked by hand and are approximate. Confirm with an automated checker in M1 and adjust if any pair falls below 4.5:1 for text.

```css
:root {
  /* surfaces */
  --bg: #F8FAFC;
  --surface: #FFFFFF;
  --surface-2: #F1F5F9;
  --border: #E2E8F0;

  /* text */
  --text: #0F172A;
  --text-2: #475569;
  --text-3: #5B6B7F;   /* muted text, passes on bg and surface-2 */

  /* accent (deep teal) */
  --accent: #0F766E;
  --accent-hover: #115E59;
  --accent-contrast: #FFFFFF;
  --accent-soft: #CCFBF1;
  --accent-soft-text: #115E59;

  /* status (use only for real state) */
  --warning: #92400E;  --warning-soft: #FEF3C7;
  --danger:  #B91C1C;  --danger-soft:  #FEE2E2;

  /* charts (always label series in text) */
  --chart-protein: #0F766E;
  --chart-carbs:   #4F46E5;
  --chart-fat:     #C2410C;
  --chart-line:    #0F172A;
  --chart-goal:    #64748B;

  /* shape */
  --radius-sm: 8px;    /* inputs, buttons */
  --radius-md: 12px;   /* cards, sheets */
  --radius-full: 999px;/* chips */
  --shadow-float: 0 4px 16px rgb(15 23 42 / 0.12); /* menus and sheets only */
  --focus-ring: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent);
}

[data-theme="dark"] {
  --bg: #0B1220;
  --surface: #111A2B;
  --surface-2: #172236;
  --border: #243049;

  --text: #E2E8F0;
  --text-2: #A8B3C7;
  --text-3: #8B97AD;

  --accent: #2DD4BF;
  --accent-hover: #5EEAD4;
  --accent-contrast: #04211E;
  --accent-soft: #0F2D2B;
  --accent-soft-text: #5EEAD4;

  --warning: #FBBF24;  --warning-soft: #3A2A08;
  --danger:  #F87171;  --danger-soft:  #3B1414;

  --chart-protein: #2DD4BF;
  --chart-carbs:   #818CF8;
  --chart-fat:     #FB923C;
  --chart-line:    #E2E8F0;
  --chart-goal:    #8B97AD;
}

/* Workout Mode always applies the dark tokens, whatever the user's theme. */

body {
  font-family: "Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif;
  font-variant-numeric: tabular-nums;
  background: var(--bg);
  color: var(--text);
}
```

Map these variables in the Tailwind config (`theme.extend.colors` in v3 or `@theme` in v4, per V7) so components use classes such as `bg-surface` and `text-text-2` instead of raw hex values.

---

## Appendix B. Binding spec for idempotent workout submission (Phase 3C-A)

This carries forward the earlier plan's requirements with the corrections found during review.

### B.1 Contract

| Situation | Behaviour |
|---|---|
| New valid keyed submission | `201 Created` |
| Identical retry of an existing key | `200 OK`, same response body as the original, header `X-Idempotency-Replay: true` |
| Same key, different canonical payload | `409 Conflict` with error code `idempotency_key_reused` |
| Empty or whitespace-only key | `422 Unprocessable Entity` |
| Key longer than 128 characters | `422 Unprocessable Entity` |
| No key | Legacy unkeyed behaviour, unchanged |

- The key is sent in the request header `Idempotency-Key`. It is stored exactly as received (no trimming, no case change).
- Keyed requests must include `started_at` and `ended_at`. Unkeyed requests keep the legacy optional `ended_at` and the service default.
- CORS must allow the `Idempotency-Key` request header and expose `X-Idempotency-Replay`, otherwise browsers cannot send or read them.
- Uniqueness is `UNIQUE (user_id, idempotency_key)`. Both columns behave correctly for legacy rows because NULLs are distinct in a unique constraint in both PostgreSQL and SQLite, so multiple unkeyed rows stay valid. No partial index is needed.

### B.2 Canonical payload and fingerprint

- Weight: parse with `Decimal(str(value))`, never `Decimal(float)`. Quantize to two decimals with `ROUND_HALF_UP`. Required results: `80.504 → 80.50`, `80.505 → 80.51`, `80.506 → 80.51`. (A float such as 80.505 is stored as 80.50499999…, so converting the float directly would round the wrong way.)
- Exercise order is ignored. Sort exercises by exercise id, and sets by `(set_number, then every other field)`.
- Sort keys must use null discriminators so that `None`, `""`, `"   "` and real strings stay distinct and comparable, for example `(0, "")` for `None` and `(1, value)` for a string. Do not use `value or ""`.
- Notes are never trimmed, lower-cased or normalised.
- Include every relevant field of every exercise and set. Do not de-duplicate repeated `(exercise_id, set_number)` entries. Do not add an `order_index` column.
- Fingerprint = SHA-256 of the canonical JSON (sorted keys, fixed separators). Store it in `request_fingerprint`. Compare the stored fingerprint on replay instead of rebuilding from database rows. If the repository already implements and tests read-back comparison, keep it and skip the extra column.
- Persist the same normalised weight that was fingerprinted.

### B.3 Race-safe flow

1. Look up `(user_id, key)`. If found, compare fingerprints. Equal gives the 200 replay. Different gives 409.
2. If not found, write inside one transaction: insert the workout log, flush, insert exercises and sets, commit.
3. Catch `IntegrityError` around the whole write path (flush, inserts and commit), not only the commit.
4. On `IntegrityError`: roll back first. Then check that the failure concerns the idempotency constraint. If it does not, re-raise (do not mask other integrity errors). If it does, look up the winning record and compare fingerprints (200 replay or 409).
5. Never perform recovery queries before the rollback.

### B.4 Migration

- Confirm the real parent revision with `alembic heads` (the earlier handoff said `2026_08_20_0012`, unverified).
- One additive migration: `idempotency_key VARCHAR(128) NULL`, `request_fingerprint VARCHAR(64) NULL`, unique constraint `uq_workout_logs_user_idempotency`. Use `batch_alter_table` for SQLite. Downgrade drops the constraint and columns.
- Test on a disposable database only. State clearly whether a test uses a partial-schema fixture (which does not prove the full migration chain) or a full chain from an empty database.

### B.5 Tests

1. API: 201 on first keyed submit, 200 and the replay header on identical retry, identical response body, 409 on changed payload, 422 for empty, whitespace-only and over-long keys, legacy unkeyed unchanged.
2. Same key used by two different users succeeds for both.
3. Canonicalisation: the three rounding cases above, exercise order irrelevant, set order irrelevant, `None` versus `""` versus `"   "` versus text notes give different fingerprints, every field changes the fingerprint, trailing spaces in notes matter.
4. Recovery test (corrected): the initial lookup must return nothing. Monkeypatch the write so that it raises a controlled uniqueness `IntegrityError` after a competing record has been committed in another session. Assert that rollback happens, the recovery lookup finds the winner, and the correct replay or conflict response is returned. Assert that the `IntegrityError` branch was actually executed (for example with a call counter or spy). A test that pre-commits the record and then calls the service will return from the first lookup and does not test this branch.
5. A non-idempotency `IntegrityError` is re-raised, not turned into a replay.
6. PostgreSQL job in CI: two concurrent keyed submissions produce exactly one row, and the loser gets 200 or 409 as appropriate. Mark these tests so they skip when no Postgres URL is configured. Until this job passes, PostgreSQL concurrency is unverified.
7. Migration: upgrade and downgrade on an empty disposable database (SQLite and Postgres).

---

## Appendix C. Draft storage format

Key: `fitmind:workout-draft:<userId>`. Quarantine keys: `fitmind:workout-draft-quarantine:<userId>:<timestamp>`.

```json
{
  "schemaVersion": 1,
  "userId": "…",
  "sessionId": "uuid",
  "idempotencyKey": "uuid",
  "startedAt": "2026-10-10T07:30:00.000Z",
  "endedAt": null,
  "status": "in_progress",
  "templateRef": { "planId": 12, "dayIndex": 1 },
  "notes": null,
  "restEndsAt": null,
  "exercises": [
    {
      "exerciseId": 7,
      "name": "Barbell squat",
      "sets": [
        { "setNumber": 1, "weightKg": "80.00", "reps": 8, "rpe": null, "done": true, "completedAt": "2026-10-10T07:41:10.000Z" }
      ]
    }
  ],
  "updatedAt": "2026-10-10T07:41:10.000Z"
}
```

- `status`: `in_progress`, `ready_to_submit` (endedAt frozen), `conflict`.
- Weights are strings to avoid float errors. Notes are `null` until touched, then stored exactly as typed. `null`, `""`, `"   "` and text remain distinct through save, restore, quarantine and submit.
- `startedAt`, `idempotencyKey` and (once set) `endedAt` never change after they are set.
- `restEndsAt` is an epoch timestamp, so the rest timer survives refresh.
- Only sets with `done: true` are submitted.

---

## Appendix D. Prompt wrapper for Antigravity

Paste this at the start of each milestone and fill in the placeholders. The milestone text from section 6 (and any appendix it names) goes after it.

```
You are working on FitMind AI. Read AGENTS.md and docs/FINAL_PLAN.md first.
Task: Milestone M<N>, <title>. Branch: m<N>-<short-name>.

Rules:
- Do only what the milestone lists. Anything else is out of scope.
- Inspect the current code before changing it. Do not assume a file, route or model exists or is missing.
- Label statements as Verified, Reported or Unverified.
- Never run tests, migrations or scripts against a non-local database.
- No commits to main, no pushes, no deployments.

Step 1 (no edits): report the verified starting state, the files you plan to change,
the migration impact (if any), and the test plan. Wait for my approval.
Step 2: implement the smallest change that meets the acceptance criteria.
Step 3: run the tests and report: exact commands, results, failures, skipped tests,
files changed, anything unverified, and the screenshots at 390x844 and 1280x800 (where the milestone includes UI).
```

---

## Appendix E. Wireframes (phone, 390 px)

Today:

```
+--------------------------------+
| Good evening, Marcus        MV |
| Friday 9 Oct                   |
+--------------------------------+
| Today's workout                |
| Upper body A                   |
| 5 exercises, about 45 min      |
| [        Start workout       ] |
+--------------------------------+
| Nutrition                      |
| 1,420 kcal left       (ring)   |
| Protein  98 / 162 g   ====---  |
| Carbs   210 / 418 g   ===----  |
| Fat      40 / 86 g    ===----  |
| [          Add food          ] |
+--------------------------------+
| This week                      |
| Workouts   o o . .   2 of 4    |
| Food logged          5 of 7    |
| Weight               -0.4 kg   |
| Fitness score        82  (+3)  |
+--------------------------------+
| Today Workouts Food Progress Coach |
+--------------------------------+
```

Workout Mode (dark, full screen):

```
+--------------------------------+
| X      32:10            Finish |
| Exercise 2 of 5                |
| Barbell squat                  |
| Target 4 x 6-8, rest 90 s      |
+--------------------------------+
| Set  Previous    kg    Reps    |
| 1    80 x 8     [80]   [8]  (v)|
| 2    80 x 8     [80]   [8]  (v)|
| 3    80 x 7     [80]   [ ]  ( )|
| 4    -          [  ]   [ ]  ( )|
| + Add set                      |
| Notes                          |
+--------------------------------+
| Rest 0:47     -15   +15   Skip |
| < Previous            Next >   |
+--------------------------------+
```

Add food (full-screen sheet):

```
+--------------------------------+
| Add to lunch                 X |
| [ Search foods               ] |
| Recent | Favourites | All      |
| Paneer bhurji   1 serving 220  |
| Dal tadka       1 bowl    180  |
| Roti            1 piece   100  |
+--------------------------------+
| After selecting a food:        |
| Serving   [ - ]  150 g  [ + ]  |
| 231 kcal  P 12  C 5  F 18      |
| [        Add to lunch        ] |
+--------------------------------+
```

---

*End of plan. When every box in section 9 is ticked, the project is finished.*
