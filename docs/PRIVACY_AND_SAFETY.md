# FitMind AI — Privacy, Physiological Safety & AI Guardrails

## 1. Physiological Safety Guardrails

FitMind AI enforces deterministic biological and nutritional boundaries in backend code (`backend/app/services/bmr_service.py` and `backend/app/services/intelligence_service.py`):
- **Minimum Calorie Floors:** Daily target calories are clamped to never fall below **1,200 kcal/day** for females, **1,500 kcal/day** for males, and **1,350 kcal/day** for other/unspecified genders, regardless of TDEE or deficit settings. When a floor is applied, `calorie_floor_applied = True` is returned.
- **Safe Weight-Change Rate Clamping:** Linear regression weight projections are clamped to a physiologically safe rate of **`[-1.0, +0.5] kg/week`**. Faster observed rates are flagged with `"rate_clamped"`.
- **Healthy BMI Floor:** Weight loss projections are floored at a minimum BMI of **`18.5`** (`18.5 * height_m^2`), flagging `"bmi_floor_applied"` if raw trend lines cross below healthy thresholds.
- **Explicit Age Assumption Disclosure:** If `date_of_birth` is omitted on a user profile, BMR defaults to age `30` and sets `age_assumed = True` so the UI can prompt the user to set their birth date.

---

## 2. AI Coach Grounding & Non-Medical Boundaries

- **Deterministic Facts Only:** The AI Coach (`backend/app/services/coach_service.py`) receives a structured `GroundedFactsContext` built by `backend/app/services/context_builder.py`. It is instructed via system prompt to quote only the pre-computed numbers provided in context (current weight, calorie/protein targets, 7-day and 28-day averages, pre-computed `1.6–2.2 g/kg` protein range, and recent workout sets) and never invent arithmetic.
- **Non-Medical Disclaimer:** FitMind AI Coach provides general fitness and nutrition education, not medical advice or clinical diagnosis. A persistent disclosure banner is displayed on `/coach`, and medical/injury queries are directed to qualified healthcare professionals.

---

## 3. Data Minimization & What Is Shared with the AI Provider

When a user sends a message on `/coach` or requests an optional AI narrative on `/progress?tab=review`, only the following minimized context is sent to the Google Gemini API:
- **Shared:** Current & target weight, active goal type, daily calorie/protein targets, 7-day & 28-day nutrition averages, last 3–5 workout sessions (exercise names and set counts), Fitness Score v2 components, and active coaching memories.
- **Never Shared:** User email address, password hash, refresh tokens, `medical_notes`, or any other user's data.

---

## 4. User Data Rights & Account Control

- **Cross-User Data Isolation:** Every database query for workouts, meals, measurements, fitness scores, reports, and chat history scopes by `user_id == current_user.id`.
- **Platform Admin Privacy Boundary:** Platform admins (`/admin`) can view aggregate system counts and toggle account `is_active` status, but have no API or UI access to individual users' meal logs, body measurements, or AI Coach conversations.
- **Clear Conversation History:** Users can permanently clear their AI Coach chat history at any time via `DELETE /api/v1/coach/history` (**New conversation** button on `/coach`).
- **Full JSON Data Export:** Users can download all of their account, profile, goal, workout, nutrition, measurement, and AI memory data in structured JSON format via `GET /api/v1/user/export` (**Settings -> Data & Privacy**).
- **Permanent Account Deletion:** Users can permanently delete their account and all associated records via `DELETE /api/v1/user/account` with password confirmation.
