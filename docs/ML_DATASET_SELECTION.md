# FitMind AI — ML Dataset Research & Methodology Specification
**Phase 2B.1: Dataset Validation, Accessibility Audit & Methodology Correction**
*Target Problem: 28-Day Future Body-Weight Change Prediction ($\Delta\text{Weight}_{28}$)*

---

## 1. Objective

FitMind AI is developing an intelligent personal fitness system whose proposed predictive core is a 28-day body-weight change estimation model ($\Delta\text{Weight}_{28}$).

The internal FitMind database contains 12 users, 62 measurement records, 977 meal logs, and 120 workout logs. Because this internal sample is cross-sectionally sparse and longitudinally short, training a credible population-level machine learning model on internal data alone would cause severe overfitting and demographic bias.

The objective of Phase 2B.1 is to:
1. Perform an exhaustive verification pass on external dataset accessibility, variable availability, and legal licensing terms.
2. Formally correct accessibility assumptions regarding NIH clinical datasets (specifically CALERIE Phase 2).
3. Establish a viable, immediately executable fallback strategy.
4. Define a canonical, numbered feature schema ($F01 \dots F16$) with strict lookback boundaries.
5. Specify a defensible temporal and subject-grouped validation methodology that prevents data leakage.
6. Rigorously define the roles of empirical human data, biophysical simulation, and FitMind operational data.

---

## 2. Candidate Datasets Investigated

We investigated 7 candidate datasets across clinical trials, national epidemiological surveys, mobile health lifelogging, and biophysical modeling:

| Candidate | Primary Publisher | Access Tier | Subjects ($N$) | Longitudinal Duration | Weigh-in Frequency | Target Feasibility ($\Delta W_{28}$) |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **CALERIE Phase 2** | NIA / NIH & Duke Univ. | Controlled / Restricted | 218 | 24 Months | Weekly (Mo 1), Monthly | **DIRECT** (Day 28 / Month 1 Visit) |
| **NIH Hall Model** | NIDDK / NIH (*Lancet* 2011) | Open Science (Mathematical) | Configurable | Arbitrary | Daily | **DIRECT** (Mathematical Delta) |
| **PMData** | Simula Research Lab / ACM | Open Access (CC BY 4.0) | 16 | 5 Months | Intermittent / Weekly | **DERIVABLE** (Within tolerance) |
| **Look AHEAD** | NIDDK-CR / NIH | Restricted (Faculty PI DUA) | 5,145 | 10+ Years | Monthly (Year 1) | **DIRECT** (Month 1 Visit) |
| **POUNDs Lost** | NHLBI / BioLINCC | Restricted (BioLINCC DUA) | 811 | 24 Months | Baseline, 6, 24 Mos | **APPROXIMATE** (No 28d visit) |
| **NHEFS** | CDC / NCHS & Hernán (2020) | Public Domain | 1,629 | 10 Years | 1971 vs 1982 | **NOT FEASIBLE** (10-year gap) |
| **MyFitnessPal (2016)** | Weber & Achananuparp (PSB) | Research Scrape | 9,900 | 6 Months | None (No weights) | **NOT FEASIBLE** (No weight logs) |

---

## 3. CALERIE Access Verification (Detailed Audit)

A thorough investigation of the data distribution infrastructure for **CALERIE Phase 2** reveals that it cannot be characterized as an open or immediately downloadable dataset.

### 3.1 Access Tier Classification
- **Official Classification:** **Controlled / Restricted Access (Institutional PI + DUA Required)**.
- **Repository:** National Institute on Aging (NIA) Aging Research Biobank ([agingresearchbiobank.nia.nih.gov](https://agingresearchbiobank.nia.nih.gov/)) and Duke CALERIE Network ([calerie.duke.edu](https://calerie.duke.edu/)).

### 3.2 Access Prerequisites & Administrative Workflow
1. **Authentication:** Requires NIH Researcher Authentication Service (RAS), Login.gov, or ID.me credentialing.
2. **Eligibility Restriction:** Data access applications must be submitted by a **Principal Investigator (PI) or Senior Researcher** who is a permanent, full-time employee of a recognized academic or research institution (typically tenure-track faculty or senior scientist). Postdoctoral fellows, graduate students, and undergraduate engineering students are **explicitly not eligible** to serve as the lead requester.
3. **Required Application Documentation:**
   - Formal Research Protocol detailing scientific aims and analytical plan.
   - Institutional Review Board (IRB) approval letter or formal IRB exemption certification.
   - Curriculum Vitae (CV) of the PI.
   - Proof of research funding or institutional backing.
   - Data Security and Storage Architecture Plan.
4. **Legal Agreements:** Requires execution of an **Outgoing Human Data Transfer Agreement (OHDTA)** signed by an authorized institutional signing official (e.g., University Office of Sponsored Research or Contracts Office). The applicant cannot self-sign.
5. **Review & Approval Timeline:** Applications undergo scientific and administrative review by the NIA Aging Research Biobank and CALERIE Steering Committee, typically requiring **4 to 8 weeks** for review, revision, and authorized execution.

### 3.3 Methodological Implication for FitMind AI
While CALERIE Phase 2 remains the **Gold-Standard Scientific Reference Architecture** for the FitMind predictive task, an independent third-year student engineering project cannot guarantee immediate data acquisition within a practical project schedule.

**Conclusion:** Implementation must **NOT depend exclusively on CALERIE Phase 2**. FitMind must establish a completely decoupled, dual-pillar practical fallback strategy.

---

## 4. Variable Availability Verification in CALERIE Phase 2

We audited the specific variables in CALERIE Phase 2 to distinguish verified measurements from presumed variables:

| Variable | CALERIE Study Form / Instrument | Availability | How Constructed | FitMind Equivalent | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Age** | `DEMO` Case Report Form | **DIRECTLY AVAILABLE** | Chronological age at baseline | `User.date_of_birth` $\to$ Age | High |
| **Sex** | `DEMO` Case Report Form | **DIRECTLY AVAILABLE** | Self-reported biological sex | `Profile.gender` | High |
| **Height** | `ANTHRO` Form | **DIRECTLY AVAILABLE** | Stadiometer measurement ($\text{cm}$) | `Profile.height_cm` | High |
| **Baseline Weight** | `ANTHRO` Form | **DIRECTLY AVAILABLE** | Calibrated scale weight at Day 0 ($\text{kg}$) | `Measurement.weight_kg` at $t$ | High |
| **Repeated Weight** | `ANTHRO` Form & Weekly Log | **DIRECTLY AVAILABLE** | Day 28 visit weight & weekly counselor weights | `Measurement.weight_kg` at $t+28$ | High |
| **Calorie Intake** | 7-Day Food Record (`NDSR`) | **DIRECTLY AVAILABLE** | Minnesota NDSR nutritional analysis ($\text{kcal/d}$) | `MealLog` daily calorie sum | High |
| **Protein Intake** | 7-Day Food Record (`NDSR`) | **DIRECTLY AVAILABLE** | NDSR nutrient breakdown ($\text{g/d}$) | `MealLogItem` protein sum | High |
| **Carb Intake** | 7-Day Food Record (`NDSR`) | **DIRECTLY AVAILABLE** | NDSR nutrient breakdown ($\text{g/d}$) | `MealLogItem` carbs sum | High |
| **Fat Intake** | 7-Day Food Record (`NDSR`) | **DIRECTLY AVAILABLE** | NDSR nutrient breakdown ($\text{g/d}$) | `MealLogItem` fat sum | High |
| **Total Energy Exp. (TDEE)** | Doubly Labeled Water (`DLW`) | **DIRECTLY AVAILABLE** | Isotope elimination kinetics ($\text{kcal/d}$) | `calculations.calculate_tdee()` | High (Measured vs Calculated) |
| **Resting Metabolic Rate** | Indirect Calorimetry (`RMR`) | **DIRECTLY AVAILABLE** | Ventilated hood $\text{VO}_2 / \text{VCO}_2$ ($\text{kcal/d}$) | `calculations.py` BMR | High (Measured vs Calculated) |
| **Physical Activity** | RT3 Triaxial Accelerometer | **DIRECTLY AVAILABLE** | Accelerometer activity counts / vectors | `Profile.activity_level` | Medium |
| **Resistance Training** | Behavioral Counseling Logs | **PROXY** | CR intervention was dietary; no set/rep logs | `WorkoutLog` volume | Low (Activity only) |
| **BMI** | `ANTHRO` Derived | **DIRECTLY AVAILABLE** | Weight $/ (\text{Height}/100)^2$ | Derived $W / (H/100)^2$ | High |
| **Measurement Date** | Visit Logs (`VISIT`) | **DIRECTLY AVAILABLE** | Calendar date and study day index | Timestamp in DB | High |

---

## 5. External Dataset $\to$ FitMind Feature Mapping

We explicitly distinguish **measured physiological laboratory variables** in clinical trials from **formula-estimated variables** in FitMind:

| External Variable (CALERIE / Clinical) | Transformation Required | FitMind Equivalent | Compatibility Classification | Methodological Distinction |
| :--- | :--- | :--- | :--- | :--- |
| `AGE` | Identity | `calculate_age_from_dob()` | **DIRECT** | Exact match. |
| `GENDER` | Categorical encoding | `Profile.gender` | **DIRECT** | Coded 0=Female, 1=Male. |
| `HEIGHT` | $\text{cm}$ verification | `Profile.height_cm` | **DIRECT** | Exact match. |
| `WEIGHT_0` | Identity | `Measurement.weight_kg` at $t$ | **DIRECT** | Anchor baseline weight. |
| `NDSR_CALORIES` | 7-day average | `MealLog` 28-day average | **TRANSFORMED / PROXY** | NDSR is 7-day clinical record; FitMind is 28-day user log. |
| `NDSR_PROTEIN` | 7-day average | `MealLogItem` 28-day average | **TRANSFORMED / PROXY** | NDSR is 7-day clinical record; FitMind is 28-day user log. |
| `DLW_TDEE` | **NOT USED DIRECTLY** | `calculations.calculate_tdee()` | **TRANSFORMED (ESTIMATED)** | **Critical Distinction:** DLW is an expensive mass-spectrometry clinical measurement. FitMind cannot measure DLW. Features must use FitMind's Mifflin-St Jeor formula to avoid feature distribution mismatch. |
| `IC_RMR` | **NOT USED DIRECTLY** | `calculations.py` BMR | **TRANSFORMED (ESTIMATED)** | Indirect calorimetry hood measurement vs formula BMR. |
| `RT3_ACCEL_PAL` | Quantile mapping to $[1.2, 1.9]$ | `Profile.activity_level` | **TRANSFORMED** | Physical Activity Level (PAL) ratio mapped to standard activity category. |
| `EXERCISE_LOGS` | None | `WorkoutLog` set-volume | **MISSING IN CALERIE** | CALERIE did not record gym resistance training; exercise features must be optional/zeroed when training on CALERIE. |
| `WEIGHT_28` | Identity | Future `Measurement.weight_kg` | **DIRECT** | Target label. |

---

## 6. Canonical ML Feature Schema (Exact Numbered List)

FitMind's feature pipeline at prediction time $t$ uses exactly **16 canonical input features ($F01 \dots F16$)**.

Every feature is computed strictly using data available at or before index time $t$. Forward lookahead ($> t$) is mathematically and architecturally prohibited.

| # | Feature Name | Definition | Units | Lookback Window | Source Module | Direct / Derived | Allowed at $t$? | Potential Leakage Vector |
| :---: | :--- | :--- | :---: | :---: | :--- | :---: | :---: | :--- |
| **F01** | `age` | User chronological age at time $t$ | Years (int) | Current ($t$) | `User.date_of_birth` | Derived | YES | None |
| **F02** | `gender` | Biological sex (`0` = Female, `1` = Male) | Binary | Current ($t$) | `Profile.gender` | Direct | YES | None |
| **F03** | `height_cm` | Standing height | $\text{cm}$ (float) | Current ($t$) | `Profile.height_cm` | Direct | YES | None |
| **F04** | `baseline_weight_kg` | Most recent scale body weight at or before $t$ | $\text{kg}$ (float) | Latest $\le t$ | `Measurement` | Direct | YES | Weight taken after $t$ (strictly barred) |
| **F05** | `baseline_bmi` | Body Mass Index: $F04 / (F03/100)^2$ | $\text{kg/m}^2$ | Latest $\le t$ | Derived ($F04, F03$) | Derived | YES | Inherits from $F04$ |
| **F06** | `bmr_kcal` | Basal Metabolic Rate via Mifflin-St Jeor | $\text{kcal/d}$ | Current ($t$) | `calculations.py` | Derived | YES | None |
| **F07** | `tdee_kcal` | Total Daily Energy Expenditure: $F06 \times F16$ | $\text{kcal/d}$ | Current ($t$) | `calculations.py` | Derived | YES | None |
| **F08** | `calories_avg_28d` | Mean daily caloric intake over preceding 28 days | $\text{kcal/d}$ | $[t-27, t]$ | `MealLog` aggregate | Derived | YES | Forward logs ($> t$) (strictly barred) |
| **F09** | `calories_avg_7d` | Mean daily caloric intake over preceding 7 days | $\text{kcal/d}$ | $[t-6, t]$ | `MealLog` aggregate | Derived | YES | Forward logs ($> t$) (strictly barred) |
| **F10** | `protein_avg_28d` | Mean daily protein intake over preceding 28 days | $\text{g/d}$ | $[t-27, t]$ | `MealLogItem` aggregate | Derived | YES | Forward logs ($> t$) (strictly barred) |
| **F11** | `est_calorie_balance_28d` | Mean daily surplus or deficit: $F08 - F07$ | $\text{kcal/d}$ | $[t-27, t]$ | Derived ($F08, F07$) | Derived | YES | Inherits from $F08$ |
| **F12** | `calorie_adherence_28d` | Bounded adherence score: $1 - \|F08 - \text{Target}\|/\text{Target}$ | $[0.0, 1.0]$ | $[t-27, t]$ | `calculations.py` | Derived | YES | Target set after $t$ |
| **F13** | `logging_frequency_28d` | Fraction of days with $\ge 1$ meal logged: $\text{Days}/28$ | $[0.0, 1.0]$ | $[t-27, t]$ | `MealLog` calendar count | Derived | YES | None |
| **F14** | `weight_slope_28d` | OLS linear regression slope of weights in $[t-27, t]$ | $\text{kg/d}$ | $[t-27, t]$ | `Measurement` slope | Derived | YES | Weight taken after $t$ (strictly barred) |
| **F15** | `measurement_count_28d`| Number of scale weigh-ins recorded in $[t-27, t]$ | Count (int) | $[t-27, t]$ | `Measurement` count | Derived | YES | None |
| **F16** | `activity_multiplier` | Physical activity factor based on activity level | $[1.20, 1.90]$ | Current ($t$) | `Profile.activity_level` | Derived | YES | None |

---

## 7. Target Construction ($\Delta\text{Weight}_{28}$)

### 7.1 Mathematical Definition
$$\Delta\text{Weight}_{28} = W_{\text{post}} - W_{\text{base}}$$
Where:
- $W_{\text{base}}$ is the baseline body weight observed at index date $t$ ($W_t$).
- $W_{\text{post}}$ is the post-intervention body weight observed at approximately $t + 28$ days.

### 7.2 Feasibility Classification
- **In Simulation / Daily Longitudinal Data:** **DIRECT** (exact 28-day timestamp difference).
- **In Human Clinical Cohorts:** **DIRECT WITH TOLERANCE WINDOW**.

### 7.3 Operational Rules & Guardrails
1. **Allowable Observation Tolerance Window:** Human subjects do not attend clinic visits or step on home scales on exactly Day 28.000. An observation is eligible as $W_{\text{post}}$ if its timestamp falls within:
   $$t + 28 \pm 3\text{ days}\quad ([t + 25, t + 31])$$
2. **Multiple Weigh-ins in Tolerance Window:** If multiple measurements exist in the window, select the measurement closest to $t + 28$; if equidistant, compute the arithmetic mean.
3. **Handling Missing Follow-up Weigh-ins:** If no measurement exists within $[t + 25, t + 31]$, the prediction window is **INVALID AND DROPPED**. Linear interpolation across multi-month gaps (e.g. connecting Month 0 to Month 6) is strictly prohibited because human weight trajectories under energy imbalance are non-linear due to metabolic adaptation and fluid shifts.
4. **Multiple Windows per Participant:** A participant followed for multi-month durations may generate multiple non-overlapping observation windows:
   - Window 1: Day 0 $\to$ Day 28
   - Window 2: Day 28 $\to$ Day 56
   - Window 3: Day 56 $\to$ Day 84
   Overlapping rolling windows (e.g. Day 7 $\to$ Day 35) are prohibited in standard validation splits to prevent autoregressive autocorrelation.

---

## 8. Leakage Prevention Rules

The feature pipeline must implement strict temporal, target, and split isolation:

1. **Temporal Horizon Firewall:** At prediction time $t$, queries must enforce a hard upper bound: `WHERE timestamp <= t`. Any record created at $t' > t$ is inaccessible to the feature extractor.
2. **Target Isolation:** The target variable $\Delta\text{Weight}_{28}$ and any measurement recorded at $t' > t$ must never appear in input features $X_t$.
3. **Preprocessing Encapsulation:** All scalers (`StandardScaler`), encoders (`OneHotEncoder`), and imputers (`SimpleImputer`) must be fitted strictly on training fold data within an `sklearn.pipeline.Pipeline`. Preprocessing must never be fitted globally across the full dataset prior to cross-validation partitioning.
4. **Subject Holdout Separation:** No subject's data may span across both training and validation/test splits.
5. **Scenario Separation in What-If Simulator:** In the What-If Simulator, hypothetical future caloric intakes are supplied strictly as candidate scenario parameters $EI_{\text{scenario}}$, never extracted from ground-truth future logs.

---

## 9. Validation Strategy: Subject-Grouped Purged Temporal Evaluation

Standard random $k$-fold cross-validation or unconstrained `GroupKFold` on rolling time-series windows allows temporal leakage and autoregressive lookahead.

FitMind adopts a **Two-Tier Purged Grouped Validation Protocol**:

```
[Full Dataset: N Participants, Multi-Month Records]
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
[Train/Dev Cohort: 80% Subjects]    [Held-out Test Cohort: 20% Subjects]
         │                                 │
         ▼                                 ▼
5-Fold Subject GroupKFold           Strictly Unseen Final Test
(Zero subject overlap across folds)  (Evaluated once at completion)
         │
         ▼
Purged Non-Overlapping Windows
(Window 1: d0-28, Window 2: d28-56)
```

### 9.1 Tier 1: Subject-Level Holdout Partition
- $20\%$ of distinct participants are randomly assigned to a permanent **Held-Out Test Set**.
- These subjects are sequestered and never exposed to model training, feature selection, or hyperparameter optimization.

### 9.2 Tier 2: 5-Fold Subject GroupKFold with Non-Overlapping Windows
- The remaining $80\%$ of subjects are partitioned using `GroupKFold(n_splits=5)` grouped strictly by `subject_id`.
- Within each subject, observation windows are strictly **non-overlapping** (minimum 28-day step).
- If rolling multi-window data are evaluated, a **28-day temporal purge/embargo** is enforced between training windows and validation windows to prevent serial autocorrelation.

### 9.3 Baseline Benchmark Requirement
Every candidate ML model must be benchmarked against:
1. **Naive Zero-Change Baseline:** Always predicting $\Delta\text{Weight}_{28} = 0.0\text{ kg}$.
2. **Simple Linear Regression / Ridge Baseline:** Using baseline weight and estimated calorie balance alone.

---

## 10. Role of the NIH Kevin Hall Biophysical Model

The **NIH Kevin Hall Model** (*The Lancet*, 2011; 378:826–837) represents a system of validated biophysical ordinary differential equations modeling human macronutrient flux, metabolic adaptation, glycogen/fluid shifts, fat mass, and lean mass partitioning:

$$\rho_F \frac{dF}{dt} + \rho_L \frac{dL}{dt} = EI(t) - TEE(t)$$

### 10.1 Approved Roles
1. **Thermodynamic Grounding & Bounds Checking:** Establishing physical sanity bounds on predicted weight change (e.g. verifying that a 500 kcal daily deficit cannot physiologically produce $+3.0\text{ kg}$ weight gain over 28 days).
2. **What-If Simulation Engine:** Powering forward scenario projections under user-selected hypothetical calorie adjustments.
3. **Controlled Synthetic Benchmark Cohort:** Generating a synthetic benchmark dataset ($N=1,000$ profiles across age 18–65, BMI 20–35) to verify pipeline integrity, train baseline regression estimators, and validate edge-case stability without external network dependencies.

### 10.2 Strictly Forbidden Descriptions
- It must **NOT** be described as empirical clinical ground truth.
- It must **NOT** be cited as evidence of real-world human accuracy.
- Synthetic evaluation metrics must **NOT** be reported as real-world clinical validation.

---

## 11. Practical Fallback Dataset & Hybrid Strategy

Because CALERIE Phase 2 requires institutional faculty PI sponsorship and formal Biobank data transfer agreements, FitMind establishes a **Dual-Pillar Open Fallback Architecture**:

```
                    FITMIND DATASET STRATEGY
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
[Pillar 1: Empirical Noise Floor]      [Pillar 2: Thermodynamic Grounding]
        PMData (CC BY 4.0)                     NIH Hall ODE Model
     16 Users, 5 Months Logs               1,000 Simulated Profiles
(Real wearable & tracking noise)      (Physiologically consistent curves)
       │                                               │
       └───────────────────────┬───────────────────────┘
                               ▼
            [Unified FitMind ML Training Pipeline]
```

### Pillar 1: Empirical Lifelogging Foundation — PMData
- **Source:** Simula Research Laboratory / ACM MMSys 2020 ([datasets.simula.no/pmdata](https://datasets.simula.no/pmdata/)).
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0) — verified open, immediate download without registration.
- **Content:** 16 participants tracked for 5 months with minute-level Fitbit Versa 2 data, daily Google Forms food logs, and repeated body weights.
- **Role:** Supplies empirical device variance, missing-log friction, and realistic human tracking behavior.

### Pillar 2: Biophysical Augmentation & Grounding — NIH Hall Model
- **Source:** Public domain mathematical formulation (*The Lancet*, 2011).
- **Content:** Synthetically simulated cohort of $N=1,000$ virtual subjects initialized with realistic demographic distributions (from CDC NHANES public demographic tables).
- **Role:** Supplies large-sample statistical stability, covers extreme deficit/surplus scenarios, and anchors the models to the first law of thermodynamics.

### Long-Term Reference Benchmark — CALERIE Phase 2
- Maintained as the gold-standard external benchmark target once institutional faculty sponsorship is established.

---

## 12. Empirical vs. Synthetic Data Distinction

To maintain complete scientific and academic integrity, FitMind enforces three distinct data classifications:

| Category | Data Source | Nature | Primary Role in FitMind | Ethical / Reporting Constraint |
| :--- | :--- | :--- | :--- | :--- |
| **Category A: Empirical Human Data** | CALERIE Phase 2 / PMData | Real human observations | Empirical training and clinical baseline benchmarking | Real-world noise, reporting errors, and behavioral non-compliance must be preserved. |
| **Category B: Biophysical Simulation** | NIH Kevin Hall ODE Model | Deterministic mathematical simulation | Thermodynamic bounding, What-If simulator engine, pipeline testing | Must never be reported as human clinical evidence. |
| **Category C: FitMind User Data** | Internal PostgreSQL Database | Real operational application logs | Deployment target, personalized calibration, fine-tuning | Currently too small for cold-start population training ($N=12$). |

---

## 13. Methodological Defensibility

This methodology is fully defensible for an advanced undergraduate / master's level engineering capstone project:

1. **Grounded in Verified Literature:** The system uses established biophysical models (Hall et al., Lancet 2011) and NIH clinical trial schemas rather than ad-hoc heuristics.
2. **Zero Temporal Lookahead:** The feature pipeline mathematically guarantees that no data after index date $t$ enters the feature vector.
3. **Subject-Isolated Validation:** Subject-grouped partitioning eliminates identity memorization and cross-subject data leakage.
4. **Honest Baseline Benchmarking:** The proposed model must beat naive persistence ($\Delta W = 0$) and Ridge regression before any claim of ML efficacy is made.
5. **Clear Non-Causal Framing:** All outputs are explicitly documented as *model-based scenario projections*, not deterministic clinical guarantees.

---

## 14. Dataset Limitations

The following limitations must be formally included in the academic project report:

1. **CALERIE Demographic Boundary:** CALERIE Phase 2 enrolled non-obese healthy adults (BMI 22.0–27.9, age 21–50). Generalization to severe clinical obesity ($BMI > 35$) cannot be guaranteed.
2. **PMData Sample Size ($N=16$):** While PMData is open and rich in lifelogging signals, 16 subjects cannot capture broad population heterogeneity.
3. **Self-Report Underreporting:** Free-living food tracking typically underreports caloric intake by $10\% - 20\%$. Calorie adherence ($F12$) serves as a relative behavioral indicator rather than absolute calorimetric truth.
4. **Non-Causal Projections:** Machine learning models predict statistical expectations under energy imbalance, not individual medical causality.

---

## 15. Final Dataset Strategy Summary

FitMind AI adopts a **Dual-Pillar Open Implementation Strategy with Clinical Reference Benchmarking**:
1. **Primary Operational Training Data:** Dual-Pillar combination of **PMData (CC BY 4.0)** for empirical noise modeling and **NIH Hall ODE Formulation** for thermodynamic stability.
2. **Gold-Standard Scientific Reference:** **CALERIE Phase 2 (NIA Biobank)** maintained as the target clinical benchmark pending institutional PI sponsorship.
3. **Target Variable:** $\Delta\text{Weight}_{28} = W_{\text{post}} - W_{\text{base}}$ ($28 \pm 3$ days tolerance).
4. **Input Feature Space:** Exactly 16 canonical features ($F01 \dots F16$).
5. **Validation:** 5-fold subject-grouped purged cross-validation with an isolated 20% subject holdout.

---

## 16. Phase 2C Prerequisites Checklist

Before Phase 2C (Feature Engineering & Pipeline Implementation) begins, all methodology prerequisites must be satisfied:

- [x] Dataset access tiers verified and administrative gating documented
- [x] Variable availability audited against official study forms
- [x] External clinical variables mapped cleanly to FitMind schemas
- [x] Canonical feature list finalized with exactly 16 numbered features ($F01 \dots F16$)
- [x] Target construction finalized with explicit $\pm 3$-day tolerance and drop rules
- [x] Temporal and target leakage rules mathematically formalized
- [x] Validation methodology finalized (Subject GroupKFold + Purged Windows)
- [x] Hall biophysical model role restricted to grounding and simulation
- [x] Practical open fallback dataset strategy (PMData + Hall Model) verified
- [x] Empirical vs. synthetic distinctions formally established
- [x] Academic defensibility and non-causal language constraints defined

---

### **STATUS: READY FOR PHASE 2C**
All methodological ambiguities, accessibility assumptions, feature definitions, and validation strategies are resolved and verified.
