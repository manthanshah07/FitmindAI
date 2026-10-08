# FitMind AI — Personal Fitness Intelligence Engine Specification (Phase 2E)

## 1. Architecture

The Personal Fitness Intelligence Engine operates as a deterministic, modular inference and decision-support pipeline decoupled from generative AI reasoning:

```
USER DATA (PostgreSQL: Profiles, Measurements, Meals)
       ↓
DATA ADAPTER (FitMindDBAdapter → NormalizedSubjectData)
       ↓
POINT-IN-TIME FEATURE EXTRACTOR (FeatureExtractor → Canonical F01..F16)
       ↓
CHAMPION MODEL SERVICE (Ridge Regression + StandardScaler)
       ↓
28-DAY TRAJECTORY PROJECTION (ΔWeight28 + Benchmark Uncertainty)
       ↓
   ┌───────────────────────┬────────────────────────┬────────────────────────┐
   ↓                       ↓                        ↓                        ↓
GOAL FEASIBILITY       WHAT-IF SIMULATOR      PLAN OPTIMIZER      ADAPTATION ENGINE
(Pacing guardrails)  (Counterfactual grid)  (Candidate ranking)   (Product thresholds)
```

### Module Responsibilities
- `model_service.py`: Caches champion model artifact, validates schema and feature ordering (F01..F16), and couples scaler and model securely.
- `prediction_service.py`: Produces 28-day weight change projections, benchmark residual uncertainty intervals, and deterministic data confidence classifications.
- `feasibility_service.py`: Compares required rate of change against projected trajectory and checks product pacing guardrails.
- `scenario_service.py`: Simulates ephemeral counterfactual scenarios using the exact same champion Ridge model, recalculating dependent features consistently with non-causal reporting.
- `optimizer_service.py`: Implements a deterministic candidate-plan ranking heuristic over a bounded candidate grid using a dimensionally normalized objective.
- `adaptation_service.py`: Evaluates observed longitudinal weight change against prior projections using product decision thresholds, attributing primary drivers without claiming biological causation.

---

## 2. Model & Benchmark Provenance

The production inference model is the Phase 2D champion:
- **Algorithm**: Ridge Regression ($L_2$ Regularization, $\alpha = 10.0$).
- **Preprocessing**: `StandardScaler` fitted on the canonical 16-feature space ($F01 \dots F16$).
- **Benchmark Performance (Validation Benchmark)**:
  - $R^2 = 0.9304$
  - $\text{MAE} = 0.3246 \text{ kg}$
  - $\text{RMSE} = 0.3928 \text{ kg}$
- **Canonical Scientific Qualification**:
  > **CANONICAL STATEMENT**: The current model has been validated against a controlled physiological benchmark generated from the Kevin Hall energy-balance model. It has not yet undergone sufficient empirical validation on longitudinal real-world FitMind users.
  > 
  > **CRITICAL FACT**: The 0.3246 kg MAE and 0.9304 R² metrics reflect performance on a Hall-model-generated controlled physiological benchmark cohort under synthetic thermodynamic consistency. They must **never** be presented as real-world human prediction accuracy. The model does not claim clinical validation, causal certainty, or real-human weight prediction within ±0.32 kg.

---

## 3. Prediction

- **Target**: $\Delta\text{Weight}_{28} = W_{\text{post}} - W_{\text{base}}$ (projected change over 28 calendar days).
- **Projected Weight**:
  $$\text{Projected Weight}_{28\text{d}} = \text{Baseline Weight} + \Delta\text{Weight}_{28}$$
- **Model Identity**: Every prediction explicitly reports `model_name`, `model_version`, and `feature_schema_version`.
- **Non-Causal Language**: Outputs are strictly labeled as model-based scenario projections, never clinical guarantees.

---

## 4. Benchmark Uncertainty

- **Benchmark Residual Sigma**: $\sigma \approx 0.3928 \text{ kg}$.
- **90% Benchmark Residual Half-Width**:
  $$\text{Margin} = 1.645 \times 0.3928 \approx \pm 0.6462 \text{ kg}$$
- **Explicit Labeling**:
  - `uncertainty_type = "benchmark_residual"`
  - **Prohibited Labels**: This interval is **not** clinical confidence, patient-specific uncertainty, medically validated tolerance, or a guaranteed prediction range. It measures residual variance on the Hall-model-generated benchmark cohort.

### Qualitative Data Confidence Classification
Deterministic rules evaluate historical tracking coverage:
- **HIGH**: $\ge 20$ days nutrition logged in past 28d, $\ge 4$ weight measurements in past 28d, valid baseline weight.
- **MEDIUM**: $\ge 7$ days nutrition logged in past 28d, $\ge 1$ weight measurement in past 28d, valid baseline weight.
- **LOW**: $< 7$ days nutrition logged OR $0$ measurements OR missing baseline weight.

---

## 5. Goal Feasibility & Product Pacing Guardrails

Evaluates whether an active goal target weight is pace-aligned with the model-projected 28-day trajectory:
- **Required Rate**:
  $$\text{Required Rate (kg/week)} = \frac{\text{Target Weight} - \text{Baseline Weight}}{(\text{Target Date} - \text{Reference Date}) / 7}$$
- **Projected Rate**:
  $$\text{Projected Rate (kg/week)} = \frac{\Delta\text{Weight}_{28}}{4.0}$$
- **Status Classification**:
  - `ON_TRACK`: Rate difference $\le 0.15 \text{ kg/week}$ in matching trajectory direction.
  - `POSSIBLE_ADJUSTMENT`: Rate difference $\le 0.35 \text{ kg/week}$.
  - `UNLIKELY`: Rate difference $> 0.35 \text{ kg/week}$ or opposing trajectory direction.
  - `INSUFFICIENT_DATA`: Missing active goal or target weight/date parameters.
  - `EXPIRED_OR_INVALID`: Goal target date is in the past.
- **Product Pacing Guardrails**:
  - Required loss rate $> 1.0 \text{ kg/week}$ or gain rate $> 0.5 \text{ kg/week}$ triggers a product pacing guardrail alert.
  - Explicitly labeled as a **configured product constraint** for sustainable habit pacing, **never** as a universal medical safety rule or clinical prescription.

---

## 6. What-If Simulator Integrity

Exploratory counterfactual simulation uses the **EXACT SAME** champion Ridge model as standard prediction:
- **Controllable Variables**: Daily calorie intake (`daily_calories`), daily protein intake (`daily_protein_g`), activity multiplier (`activity_multiplier`).
- **Consistent Dependent Recalculation**:
  - Modifying calories updates $F08$ (28d avg), $F09$ (7d avg), $F11$ ($\text{Balance} = F08 - F07$), and $F12$ ($\text{Adherence}$).
  - Modifying activity updates $F16$, recomputes $F07$ ($\text{TDEE} = F06 \times F16$), and recomputes $F11$.
  - Modifying protein updates $F10$.
- **Architectural Guarantees**:
  - Ephemeral memory execution: zero database writes.
  - No separate simulation formula; passes through the same `StandardScaler` and `Ridge` artifact.
  - Non-causal statement framing: *"Under this model scenario, adjusting intake to X kcal/day is projected to produce approximately Y kg difference..."*

---

## 7. Plan Optimizer (Deterministic Candidate-Ranking Heuristic)

The plan optimizer is a **deterministic candidate-plan ranking heuristic**, not a mathematical global optimizer or clinical treatment optimizer.

### Bounded Candidate Grid
- Calorie adjustments: $\Delta \in [-300, -200, -100, 0, +100, +200, +300] \text{ kcal/day}$ bounded by configured product constraint $\max(1200\text{ kcal}, 0.7 \times \text{BMR})$.
- Protein adjustments: $[0, +15, +30] \text{ g/day}$.
- Activity adjustments: current activity, $\min(\text{current} + 0.1, 1.725)$.

### Dimensionally Normalized Objective Function
All components are normalized to $[0 \dots 1]$ before linear weighting:
$$\text{Score} = 0.60 \times \text{normalized\_target\_error} + 0.30 \times \text{normalized\_plan\_deviation} + 0.10 \times \text{practicality\_penalty}$$
- **normalized_target_error**: $|\text{Projected Rate} - \text{Required Rate}| / 1.0\text{ kg/week}$
- **normalized_plan_deviation**: $|\Delta\text{Calories}| / \text{max\_adjustment}$
- **practicality_penalty**: Macronutrient shortfall penalty based on protein preference $[0 \dots 1]$.
- Lower score denotes a superior heuristic balance between goal pacing alignment and habitual adherence ease.

---

## 8. Adaptation Engine & Product Decision Thresholds

Tracks longitudinal progress over 28-day intervals using **product decision thresholds derived from benchmark uncertainty and data completeness**:
- Compares actual weight change $W_{\text{current}} - W_{-28\text{d}}$ with model projection $\Delta\text{Weight}_{28}$.
- Calculates residual: $\text{Residual} = \Delta\text{Observed} - \Delta\text{Projected}$.
- Status classifications:
  - `NO_CHANGE`: Residual within normal benchmark uncertainty ($|\text{residual}| \le 0.65 \text{ kg}$).
  - `MONITOR`: Moderate divergence ($|\text{residual}| \le 1.25 \text{ kg}$) or moderate logging coverage.
  - `ADJUSTMENT_RECOMMENDED`: Persistent divergence ($> 1.25 \text{ kg}$) with complete logging coverage ($\ge 50\%$).
  - `INSUFFICIENT_DATA`: Fewer than 2 measurements or $< 7$ days logged.
- Explicitly documented as product decision thresholds, **not** clinically validated intervention thresholds. Does not claim biological causation.

---

## 9. Personalization (V1)

- Keeps the population Ridge model read-only and immutable.
- Tracks user-specific residual trend via Exponentially Weighted Moving Average (EWMA, $\alpha = 0.30$) over longitudinal windows.
- Exposes `personal_calibration_offset_kg` without mutating the underlying model artifact.

---

## 10. Causality & Non-Causal Guardrails

All simulation and prediction copy strictly avoids causal and guaranteed phrasing:
- **Approved**: "projected", "estimated", "model-based scenario", "expected trajectory", "under this model scenario".
- **Strictly Prohibited**: "guaranteed", "certain", "clinically proven", "causal", "will cause".

---

## 11. API Contracts

All endpoints are registered under `/api/v1/intelligence` and require Bearer JWT authentication:

1. `GET /api/v1/intelligence/trajectory`: Returns 28-day trajectory projection, benchmark residual uncertainty, and data confidence.
2. `GET /api/v1/intelligence/goal-feasibility`: Evaluates required pacing against projected trajectory and checks product pacing guardrails.
3. `POST /api/v1/intelligence/simulate`: Evaluates 1 to 10 counterfactual scenarios; returns baseline vs scenario comparison table.
4. `POST /api/v1/intelligence/optimize-plan`: Evaluates candidate grid and returns ranked candidate plans under configured heuristic.
5. `GET /api/v1/intelligence/adaptation`: Evaluates longitudinal progress and reports adaptation status and primary drivers.

---

## 12. Security & User Isolation

- **Authentication**: Enforced via FastAPI dependency `get_current_user`.
- **User Isolation**: All queries filter strictly by `current_user.id`. Endpoints never accept arbitrary user IDs in paths or request bodies.
- **Input Validation**: Pydantic schemas enforce strict numeric bounds (e.g., calories $\in [800, 7000]$).

---

## 13. Testing

Test suite located in `backend/tests/test_intelligence_engine.py`:
- Model loading, scaler coupling, and feature schema verification (F01..F16).
- Deterministic prediction, model version exposure, and benchmark residual uncertainty labeling.
- Qualitative data confidence classification thresholds.
- What-If simulation with identical champion Ridge model and consistent dependent feature recalculation.
- Goal feasibility status and product pacing guardrail alerts.
- Plan candidate ranking with dimensionally normalized objective function.
- Adaptation status, primary driver attribution, and EWMA personalization.
- Strict authentication enforcement and user data isolation.

---

## 14. Methodological Limitations

1. **Benchmark Domain**: The model is validated on a controlled physiological benchmark generated from the Kevin Hall energy-balance model. Real-world user adherence patterns, reporting error, and metabolic heterogeneity have not yet been evaluated on a large longitudinal FitMind cohort.
2. **Gross Weight Target**: The model currently projects total body mass ($\Delta\text{Weight}_{28}$), not compartmentalized lean mass vs fat mass.
3. **Acute Fluid Fluctuation Invariance**: 28-day models filter out daily water and glycogen volatility and should not be used to interpret day-to-day scale noise.
