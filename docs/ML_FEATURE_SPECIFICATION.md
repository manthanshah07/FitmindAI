# FitMind AI — ML Feature Specification & Pipeline Architecture
**Phase 2C: Deterministic Feature Pipeline, Normalization Contracts & Temporal Rules**
*Target Problem: 28-Day Future Body-Weight Change Prediction ($\Delta\text{Weight}_{28}$)*

---

## 1. Problem Definition

FitMind AI's flagship intelligence capability is a multi-step predictive and scenario optimization engine. Before training population-level machine learning models, the data layer must compute reliable, deterministic, point-in-time feature representations of user longitudinal state.

The core learning task is to predict:
**How much will a user's body weight change over the next 28 calendar days given their historical profile, nutrition adherence, and weight trend?**

The system models:
$$\Delta\text{Weight}_{28} \approx f(X_t)$$
Where $X_t$ is a strictly point-in-time feature vector computed at reference date $t$, and $\Delta\text{Weight}_{28}$ is the continuous body-weight change observed 28 days into the future.

---

## 2. Target Definition ($\Delta\text{Weight}_{28}$)

### 2.1 Mathematical Formula
$$\Delta\text{Weight}_{28} = W_{\text{post}} - W_{\text{base}}$$
Where:
- **$W_{\text{base}}$:** The latest valid scale weight measured at or before reference date $t$ ($W \le t$).
- **$W_{\text{post}}$:** The post-intervention scale weight measured within the allowable target window $[t + 25, t + 31]$ days.

### 2.2 Operational Target Window Rules
1. **Allowable Target Interval:** Real-world human weigh-ins do not occur with microsecond precision on Day 28.000. An eligible target weigh-in must fall within:
   $$t + 28 \pm 3\text{ days}\quad ([t + 25, t + 31])$$
2. **Selection Rule:** If multiple valid measurements exist within $[t + 25, t + 31]$, the measurement closest to Day 28 ($|(\text{date} - t) - 28|$) is selected. In the event of equidistant dates, the chronologically later measurement is chosen.
3. **Drop Policy (No Interpolation):** If zero valid scale measurements exist within $[t + 25, t + 31]$, the prediction window is **INVALID AND DROPPED**. Linear interpolation across multi-month gaps is strictly prohibited, as human metabolic adaptation and fluid dynamics are non-linear.
4. **Target Isolation:** The target value $\Delta\text{Weight}_{28}$ is the **ONLY** variable allowed to originate from the future ($> t$). It is strictly isolated from input features.

---

## 3. Canonical F01–F16 Feature Schema

FitMind AI implements exactly **16 canonical features ($F01 \dots F16$)**. Features must never be added or removed without formal versioning.

| Feature ID | Feature Name | Units / Scale | Lookback Window | Data Source | Direct / Derived | Allowed at $t$? | Leakage Audit |
| :---: | :--- | :---: | :---: | :--- | :---: | :---: | :--- |
| **F01** | `age` | Years (float) | Point-in-time ($t$) | `User.date_of_birth` | Derived | YES | SAFE — Computed at $t$ |
| **F02** | `gender` | Binary (`0`=F, `1`=M) | Point-in-time ($t$) | `Profile.gender` | Direct | YES | SAFE — Static profile |
| **F03** | `height_cm` | $\text{cm}$ (float) | Point-in-time ($t$) | `Profile.height_cm` | Direct | YES | SAFE — Static profile |
| **F04** | `baseline_weight_kg` | $\text{kg}$ (float) | Latest $\le t$ | `Measurement.weight_kg` | Direct | YES | SAFE — Filtered $\le t$ |
| **F05** | `baseline_bmi` | $\text{kg/m}^2$ (float) | Latest $\le t$ | Derived from $F04, F03$ | Derived | YES | SAFE — Filtered $\le t$ |
| **F06** | `bmr_kcal` | $\text{kcal/d}$ (float) | Point-in-time ($t$) | `calculations.py` (Mifflin) | Derived | YES | SAFE — Filtered $\le t$ |
| **F07** | `tdee_kcal` | $\text{kcal/d}$ (float) | Point-in-time ($t$) | `calculations.py` ($F06 \times F16$) | Derived | YES | SAFE — Filtered $\le t$ |
| **F08** | `calories_avg_28d` | $\text{kcal/d}$ (float) | $[t-27, t]$ | `MealLog` aggregate | Derived | YES | SAFE — Filtered $\le t$ |
| **F09** | `calories_avg_7d` | $\text{kcal/d}$ (float) | $[t-6, t]$ | `MealLog` aggregate | Derived | YES | SAFE — Filtered $\le t$ |
| **F10** | `protein_avg_28d` | $\text{g/d}$ (float) | $[t-27, t]$ | `MealLogItem` aggregate | Derived | YES | SAFE — Filtered $\le t$ |
| **F11** | `est_calorie_balance_28d` | $\text{kcal/d}$ (float) | $[t-27, t]$ | Derived ($F08 - F07$) | Derived | YES | SAFE — Filtered $\le t$ |
| **F12** | `calorie_adherence_28d` | Ratio $[0.0, 1.0]$ | $[t-27, t]$ | `calculations.py` canonical | Derived | YES | SAFE — Filtered $\le t$ |
| **F13** | `logging_frequency_28d` | Ratio $[0.0, 1.0]$ | $[t-27, t]$ | Distinct logged days $/ 28$ | Derived | YES | SAFE — Filtered $\le t$ |
| **F14** | `weight_slope_28d` | $\text{kg/d}$ (float) | $[t-27, t]$ | OLS linear regression | Derived | YES | SAFE — Filtered $\le t$ |
| **F15** | `measurement_count_28d`| Count (int) | $[t-27, t]$ | `Measurement` count | Derived | YES | SAFE — Filtered $\le t$ |
| **F16** | `activity_multiplier` | Ratio $[1.2, 1.9]$ | Point-in-time ($t$) | `Profile.activity_level` | Derived | YES | SAFE — Static profile |

---

## 4. Point-in-Time Correctness Rules

For any prediction window evaluated at reference date $t$:
1. **Upper Bound Constraint:** Every database query and data extraction filter enforces a strict cutoff: `WHERE event_date <= t`.
2. **Forbidden Data:**
   - Any weight measurement with `measured_date > t`
   - Any meal log with `logged_at > t`
   - Any target label $\Delta\text{Weight}_{28}$
   - Any global mean, standard deviation, or normalization statistic calculated including data after $t$
3. **Reference Date Inclusion:** Historical windows $[t-27, t]$ and $[t-6, t]$ are inclusive of reference date $t$ itself up to 23:59:59 in the user's configured timezone.

---

## 5. Missing Food-Log Policy

When a user logs meals irregularly over the 28-day historical window, the feature extractor implements **Approach C: Logged-Days Average + Explicit Frequency Feature**:

### 5.1 Rationale
- **Treating missing days as 0 kcal (Rejected):** Severely deflates caloric intake, producing artificial starvation deficits of $-1500\text{ kcal/day}$.
- **Treating missing days as TDEE (Rejected):** Dilutes real over-eating or real deficits with synthetic neutral days.
- **Approach C (Approved):** Computes average daily calories and protein strictly over days where the user actually logged food ($N_{\text{logged}}$ days). In tandem, Feature $F13$ (`logging_frequency_28d` = $N_{\text{logged}} / 28.0$) explicitly conveys logging consistency to the ML model.

### 5.2 Zero-Log Boundary Condition ($N_{\text{logged}} = 0$)
If a user has 0 meal logs over the entire 28-day window:
- `calories_avg_28d` ($F08$) defaults to user `tdee_kcal` ($F07$).
- `est_calorie_balance_28d` ($F11$) is set to neutral `0.0 kcal/day`.
- `protein_avg_28d` ($F10$) defaults to `0.8 * baseline_weight_kg` (RDA standard).
- `logging_frequency_28d` ($F13$) is set to `0.0`.
This preserves the principle that "did not log" $\neq$ "did not eat", avoiding false deficit hallucinations.

---

## 6. Weight Slope Calculation (OLS Regression)

Feature $F14$ (`weight_slope_28d`) captures the direction and velocity of weight change over the preceding 28 days using Ordinary Least Squares (OLS) linear regression:

$$\text{Slope} = \frac{\sum_{i=1}^n (x_i - \bar{x})(y_i - \bar{y})}{\sum_{i=1}^n (x_i - \bar{x})^2}$$

Where:
- $x_i$: elapsed days from the start of the 28-day historical window ($t - 27\text{ days}$).
- $y_i$: scale weight in kilograms ($W_i$).
- $n$: number of valid measurements in $[t-27, t]$ ($F15$).

### Boundary Rules:
- **$n = 0$:** Slope is defined as `0.0 kg/day`.
- **$n = 1$:** Slope is defined as `0.0 kg/day` (no rate of change can be derived from a single point).
- **$n \ge 2$, all measurements on same calendar day ($\text{Var}(x) = 0$):** Slope is defined as `0.0 kg/day`.
- **$n \ge 2$, distinct dates:** OLS slope is computed and rounded to 4 decimal places.

---

## 7. Authoritative BMR and TDEE Derivation

In accordance with `AGENTS.md`, numeric calculations are owned by `backend/app/core/calculations.py`.
- **$F06$ (`bmr_kcal`):** Mifflin-St Jeor formula:
  $$\text{BMR} = 10 \times W + 6.25 \times H - 5 \times \text{Age} + \text{Gender Offset}$$
  Where Gender Offset is $+5.0$ for males, $-161.0$ for females.
- **$F07$ (`tdee_kcal`):** $\text{BMR} \times F16$.
- **Point-in-Time Age:** `calculate_tdee` accepts `reference_date=t` so age is evaluated on reference date $t$, preserving historical accuracy for longitudinal cohorts.

---

## 8. Dataset Adapter Architecture

To prevent hardcoding dataset-specific column names or table schemas, FitMind implements a decoupled adapter architecture:

```
[Raw PostgreSQL DB]     [External PMData]     [Synthetic Hall ODE Cohort]
         │                      │                         │
         ▼                      ▼                         ▼
 [FitMindDBAdapter]      [PMDataAdapter]        [DictRecordAdapter]
         │                      │                         │
         └──────────────────────┼─────────────────────────┘
                                ▼
                   [NormalizedSubjectData]
                   - SubjectDemographics
                   - MeasurementRecord[]
                   - DailyNutritionRecord[]
                                │
                                ▼
                     [FeatureExtractor]
                     - F01..F16 Feature Dict
                     - Completeness Metadata
                                │
                                ▼
                 [TrainingWindowGenerator]
                 - W_base (<= t)
                 - W_post ([t+25, t+31])
                 - DeltaWeight28 (Target)
                                │
                                ▼
                      [TrainingExample]
```

### 8.1 Normalized Data Contract (`contracts.py`)
- `SubjectDemographics`: `subject_id`, `date_of_birth`, `gender`, `height_cm`, `activity_level`, `timezone_str`.
- `MeasurementRecord`: `measured_date: date`, `weight_kg: float`.
- `DailyNutritionRecord`: `log_date: date`, `calories: float`, `protein_g: float`.
- `NormalizedSubjectData`: Encapsulates demographics, measurements, daily nutrition, and target calories.

---

## 9. Non-Overlapping Training Window Construction

Longitudinal datasets spanning several months can produce multiple prediction windows for a single participant.

To prevent autoregressive autocorrelation:
1. Candidate windows are generated by stepping the reference date forward by `step_days = 28`:
   - Window 1: Reference date $t_0$, target in $[t_0+25, t_0+31]$
   - Window 2: Reference date $t_0 + 28$, target in $[t_0+53, t_0+59]$
   - Window 3: Reference date $t_0 + 56$, target in $[t_0+81, t_0+87]$
2. Overlapping rolling windows (e.g. stepping by 1 or 7 days) are strictly barred from standard training sets to eliminate autocorrelation leakage across training examples.

---

## 10. Data Completeness & Quality Metadata

The feature pipeline separates **Feature Values** from **Data Completeness Metadata**:
- `has_baseline_weight`: True if valid measurement exists $\le t$.
- `has_height`: True if height exists and $> 0$.
- `has_demographics`: True if DOB/age and gender exist.
- `nutrition_days_logged_28d`: Integer count of days with nutrition logs in $[t-27, t]$.
- `measurement_count_28d`: Integer count of measurements in $[t-27, t]$.
- `is_fully_complete`: True if subject has baseline weight, height, demographics, $\ge 14$ days of nutrition logs, and $\ge 2$ historical weigh-ins.

This metadata enables Phase 2D training pipelines to filter or weight observations based on logging fidelity.

---

## 11. Feature Sanity Checker & Distribution Bounds

`FeatureSanityChecker` provides offline validation of feature tables, flagging physiologically impossible anomalies before ML training:

| Feature | Physiological Lower Bound | Physiological Upper Bound | Unit |
| :---: | :---: | :---: | :---: |
| `F01` (Age) | 10.0 | 120.0 | Years |
| `F02` (Gender) | 0.0 | 1.0 | Binary |
| `F03` (Height) | 100.0 | 250.0 | $\text{cm}$ |
| `F04` (Weight) | 30.0 | 300.0 | $\text{kg}$ |
| `F05` (BMI) | 10.0 | 80.0 | $\text{kg/m}^2$ |
| `F06` (BMR) | 500.0 | 4000.0 | $\text{kcal/d}$ |
| `F07` (TDEE) | 600.0 | 7500.0 | $\text{kcal/d}$ |
| `F08` (Cals 28d) | 200.0 | 10000.0 | $\text{kcal/d}$ |
| `F09` (Cals 7d) | 200.0 | 10000.0 | $\text{kcal/d}$ |
| `F10` (Protein) | 0.0 | 600.0 | $\text{g/d}$ |
| `F11` (Balance) | -6000.0 | +6000.0 | $\text{kcal/d}$ |
| `F12` (Adherence) | 0.0 | 1.0 | Ratio |
| `F13` (Logging Freq) | 0.0 | 1.0 | Ratio |
| `F14` (Weight Slope) | -2.0 | +2.0 | $\text{kg/d}$ |
| `F15` (Measure Count) | 0.0 | 100.0 | Count |
| `F16` (Activity Mult) | 1.0 | 2.5 | Multiplier |

---

## 12. Complete Leakage Audit Table

A systematic audit was conducted on every feature in the canonical schema:

| Feature ID | Feature Name | Uses Data After $t$? | Uses Target $\Delta W_{28}$? | Uses Future Measurement? | Uses Future Nutrition? | Leakage Status |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **F01** | `age` | NO | NO | NO | NO | **VERIFIED SAFE** |
| **F02** | `gender` | NO | NO | NO | NO | **VERIFIED SAFE** |
| **F03** | `height_cm` | NO | NO | NO | NO | **VERIFIED SAFE** |
| **F04** | `baseline_weight_kg` | NO | NO | NO | NO | **VERIFIED SAFE** |
| **F05** | `baseline_bmi` | NO | NO | NO | NO | **VERIFIED SAFE** |
| **F06** | `bmr_kcal` | NO | NO | NO | NO | **VERIFIED SAFE** |
| **F07** | `tdee_kcal` | NO | NO | NO | NO | **VERIFIED SAFE** |
| **F08** | `calories_avg_28d` | NO | NO | NO | NO | **VERIFIED SAFE** |
| **F09** | `calories_avg_7d` | NO | NO | NO | NO | **VERIFIED SAFE** |
| **F10** | `protein_avg_28d` | NO | NO | NO | NO | **VERIFIED SAFE** |
| **F11** | `est_calorie_balance_28d` | NO | NO | NO | NO | **VERIFIED SAFE** |
| **F12** | `calorie_adherence_28d` | NO | NO | NO | NO | **VERIFIED SAFE** |
| **F13** | `logging_frequency_28d` | NO | NO | NO | NO | **VERIFIED SAFE** |
| **F14** | `weight_slope_28d` | NO | NO | NO | NO | **VERIFIED SAFE** |
| **F15** | `measurement_count_28d`| NO | NO | NO | NO | **VERIFIED SAFE** |
| **F16** | `activity_multiplier` | NO | NO | NO | NO | **VERIFIED SAFE** |

**AUDIT CONCLUSION: NO FUTURE INFORMATION IS USED IN FEATURE CONSTRUCTION.**

---

## 13. Test Strategy & Verification Results

The feature pipeline was validated via 9 deterministic unit and integration tests in `backend/tests/test_feature_pipeline.py`:
1. `test_feature_values_correctness`: Verifies manual mathematical match for all 16 features.
2. `test_temporal_leakage_immunity`: Corrupts future data (days 30 to 60) to 10,000 kcal and 200 kg; confirms features at Day 28 remain bit-for-bit identical.
3. `test_target_construction_exact_and_tolerance`: Tests Day 28, Day 25, Day 31 (valid), and Day 24, Day 32 (invalid).
4. `test_missing_baseline_weight_exclusion`: Confirms exclusion when baseline weight is missing.
5. `test_non_overlapping_training_windows_generation`: Confirms 28-day window stepping with zero overlap.
6. `test_missing_food_log_policy`: Tests zero-log fallback and partial-log averaging.
7. `test_weight_slope_edge_cases`: Tests $N=0$, $N=1$, identical dates, and linear rate.
8. `test_feature_extraction_determinism`: Confirms repeated execution produces identical outputs.
9. `test_sanity_checker_valid_and_anomalous`: Confirms sanity checker passes valid records and catches anomalies.

### Test Results
- **Backend:** 282 passed in `pytest` (0 failures, 100% pass).
- **Frontend:** 79 passed in `vitest` (14 test suites, 0 failures).
- **TypeScript:** 0 errors in `tsc -b --noEmit`.
- **Linter:** 0 warnings, 0 errors in `oxlint` across 101 files.

---

## 14. Known Limitations

1. **Self-Report Bias:** The pipeline computes features from user-logged meals; free-living tracking typically underreports by 10%–20%. Feature $F13$ provides the model with logging frequency to modulate reliance on intake features.
2. **Wearable Activity Disconnect:** Feature $F16$ currently maps discrete categorical activity levels ("sedentary", "moderate") rather than continuous step/HR streams. In later phases, wearable daily steps can be mapped into continuous PAL factors.
3. **Non-Causal Scenario Modeling:** All projections derived from these features represent expected empirical statistical trajectories, not medical certainty or guaranteed causal outcomes.
