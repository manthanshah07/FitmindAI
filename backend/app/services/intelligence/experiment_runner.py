"""
FitMind AI ML Experiment Runner (Phase 2D).
Executes reproducible, point-in-time ML experiments across baselines and non-linear models.
Strictly enforces:
- Subject-level holdout (20% unseen subjects)
- 5-fold subject GroupKFold on remaining 80%
- Preprocessing encapsulation (fitted strictly inside training folds)
- Categorical separation between Empirical Human Data and Biophysical Simulation
"""

import os
import math
import random
import pickle
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional

import numpy as np
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import GroupKFold
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from app.core.database import SessionLocal
from app.models.user import User
from app.services.intelligence.adapters import FitMindDBAdapter
from app.services.intelligence.training_windows import TrainingWindowGenerator
from app.services.intelligence.contracts import TrainingExample, ExcludedWindow
from app.services.intelligence.hall_simulator import HallBiophysicalSimulator


class ExperimentRunner:
    """Orchestrates Phase 2D experimental evaluation and model selection."""

    FEATURE_KEYS = [f"F{i:02d}" for i in range(1, 17)]

    @classmethod
    def audit_empirical_dataset(cls) -> Dict[str, Any]:
        """
        EXPERIMENT 1: Audit real empirical internal FitMind database (Category A/C).
        Checks whether sufficient valid training windows exist for machine learning.
        """
        db = SessionLocal()
        try:
            users = db.query(User).all()
            user_count = len(users)

            all_examples: List[TrainingExample] = []
            all_excluded: List[ExcludedWindow] = []

            for u in users:
                sub_data = FitMindDBAdapter.extract_subject_data(db, u.id)
                if not sub_data:
                    continue
                exs, excl = TrainingWindowGenerator.generate_subject_training_windows(
                    sub_data, step_days=28, min_lead_in_days=28
                )
                all_examples.extend(exs)
                all_excluded.extend(excl)

            exclusion_counts: Dict[str, int] = {}
            for e in all_excluded:
                exclusion_counts[e.exclusion_reason] = exclusion_counts.get(e.exclusion_reason, 0) + 1

            targets = [ex.delta_weight_28d for ex in all_examples]

            audit_result = {
                "dataset_name": "FitMind Internal Database (dev.db)",
                "subject_count": user_count,
                "valid_training_windows": len(all_examples),
                "excluded_windows": len(all_excluded),
                "exclusion_breakdown": exclusion_counts,
                "is_adequate_for_training": len(all_examples) >= 50,
                "target_summary": {
                    "count": len(targets),
                    "mean": float(np.mean(targets)) if targets else None,
                    "std": float(np.std(targets)) if targets else None,
                    "min": float(np.min(targets)) if targets else None,
                    "max": float(np.max(targets)) if targets else None,
                },
            }
            return audit_result
        finally:
            db.close()

    @classmethod
    def run_benchmark_experiments(
        cls,
        n_subjects: int = 150,
        random_seed: int = 42,
        save_artifact: bool = True,
    ) -> Dict[str, Any]:
        """
        Runs the full Phase 2D experiment suite on Category B (Biophysical Simulation).
        Evaluates Baselines (Zero-change, Historical trend, Ridge) and Non-linear models
        (Random Forest, HistGradientBoosting) with 20% subject holdout and 5-fold GroupKFold.
        """
        rng = np.random.RandomState(random_seed)

        # 1. Generate Controlled Benchmark Cohort
        cohort = HallBiophysicalSimulator.generate_benchmark_cohort(
            n_subjects=n_subjects, random_seed=random_seed
        )

        all_examples: List[TrainingExample] = []
        all_excluded: List[ExcludedWindow] = []
        for sub in cohort:
            exs, excl = TrainingWindowGenerator.generate_subject_training_windows(sub, step_days=28)
            all_examples.extend(exs)
            all_excluded.extend(excl)

        # Subject-level partitioning: 20% holdout subjects
        unique_subjects = sorted(list(set(ex.subject_id for ex in all_examples)))
        n_total_subs = len(unique_subjects)
        n_holdout_subs = max(5, int(n_total_subs * 0.20))

        # Deterministic shuffle of subject IDs
        shuffled_subs = list(unique_subjects)
        random.Random(random_seed).shuffle(shuffled_subs)

        holdout_sub_ids = set(shuffled_subs[:n_holdout_subs])
        train_sub_ids = set(shuffled_subs[n_holdout_subs:])

        train_examples = [ex for ex in all_examples if ex.subject_id in train_sub_ids]
        holdout_examples = [ex for ex in all_examples if ex.subject_id in holdout_sub_ids]

        # Extract matrices
        X_train_raw = np.array([[ex.features[k] for k in cls.FEATURE_KEYS] for ex in train_examples])
        y_train = np.array([ex.delta_weight_28d for ex in train_examples])
        groups_train = np.array([ex.subject_id for ex in train_examples])

        X_holdout_raw = np.array([[ex.features[k] for k in cls.FEATURE_KEYS] for ex in holdout_examples])
        y_holdout = np.array([ex.delta_weight_28d for ex in holdout_examples])

        # -------------------------------------------------------------
        # 2. 5-Fold Subject GroupKFold Cross-Validation
        # -------------------------------------------------------------
        gkf = GroupKFold(n_splits=5)

        models = {
            "Zero-Change Baseline": None,
            "Historical-Trend Baseline": None,
            "Ridge Regression": Ridge(alpha=1.0, random_state=random_seed),
            "Random Forest": RandomForestRegressor(
                n_estimators=100, max_depth=6, min_samples_leaf=4, random_state=random_seed
            ),
            "HistGradientBoosting": HistGradientBoostingRegressor(
                max_iter=100, max_depth=4, min_samples_leaf=6, l2_regularization=1.0, random_state=random_seed
            ),
        }

        cv_predictions = {name: np.zeros(len(y_train)) for name in models}

        # Track fold metrics
        for train_idx, val_idx in gkf.split(X_train_raw, y_train, groups_train):
            X_tr, y_tr = X_train_raw[train_idx], y_train[train_idx]
            X_val, y_val = X_train_raw[val_idx], y_train[val_idx]

            # Fit scaler strictly on training fold
            scaler = StandardScaler()
            X_tr_scaled = scaler.fit_transform(X_tr)
            X_val_scaled = scaler.transform(X_val)

            # Baseline A: Zero-change (predict 0.0)
            cv_predictions["Zero-Change Baseline"][val_idx] = 0.0

            # Baseline B: Historical trend (28 * weight_slope_28d)
            # F14 index is 13
            slope_idx = cls.FEATURE_KEYS.index("F14")
            cv_predictions["Historical-Trend Baseline"][val_idx] = X_val[:, slope_idx] * 28.0

            # Baseline C: Ridge
            ridge = Ridge(alpha=1.0, random_state=random_seed)
            ridge.fit(X_tr_scaled, y_tr)
            cv_predictions["Ridge Regression"][val_idx] = ridge.predict(X_val_scaled)

            # Model 1: Random Forest
            rf = RandomForestRegressor(n_estimators=100, max_depth=6, min_samples_leaf=4, random_state=random_seed)
            rf.fit(X_tr, y_tr)
            cv_predictions["Random Forest"][val_idx] = rf.predict(X_val)

            # Model 2: HistGradientBoosting
            hgb = HistGradientBoostingRegressor(
                max_iter=100, max_depth=4, min_samples_leaf=6, l2_regularization=1.0, random_state=random_seed
            )
            hgb.fit(X_tr, y_tr)
            cv_predictions["HistGradientBoosting"][val_idx] = hgb.predict(X_val)

        # Compute CV Metrics
        cv_summary: Dict[str, Dict[str, float]] = {}
        for name, preds in cv_predictions.items():
            mae = float(mean_absolute_error(y_train, preds))
            rmse = float(math.sqrt(mean_squared_error(y_train, preds)))
            r2 = float(r2_score(y_train, preds))
            med_ae = float(np.median(np.abs(y_train - preds)))
            bias = float(np.mean(preds - y_train))
            cv_summary[name] = {
                "MAE": round(mae, 4),
                "RMSE": round(rmse, 4),
                "R2": round(r2, 4),
                "Median_AE": round(med_ae, 4),
                "Bias": round(bias, 4),
            }

        # -------------------------------------------------------------
        # 3. Model Selection & Final Holdout Evaluation
        # -------------------------------------------------------------
        # Champion is selected based on lowest CV MAE
        ranked_models = sorted(
            [m for m in cv_summary.keys() if "Baseline" not in m],
            key=lambda m: cv_summary[m]["MAE"]
        )
        champion_name = ranked_models[0]

        # Train champion on full training cohort
        scaler_full = StandardScaler()
        X_train_scaled = scaler_full.fit_transform(X_train_raw)
        X_holdout_scaled = scaler_full.transform(X_holdout_raw)

        if champion_name == "Ridge Regression":
            champion_model = Ridge(alpha=1.0, random_state=random_seed)
            champion_model.fit(X_train_scaled, y_train)
            holdout_preds = champion_model.predict(X_holdout_scaled)
        elif champion_name == "Random Forest":
            champion_model = RandomForestRegressor(
                n_estimators=100, max_depth=6, min_samples_leaf=4, random_state=random_seed
            )
            champion_model.fit(X_train_raw, y_train)
            holdout_preds = champion_model.predict(X_holdout_raw)
        else:
            champion_model = HistGradientBoostingRegressor(
                max_iter=100, max_depth=4, min_samples_leaf=6, l2_regularization=1.0, random_state=random_seed
            )
            champion_model.fit(X_train_raw, y_train)
            holdout_preds = champion_model.predict(X_holdout_raw)

        # Holdout metrics
        holdout_mae = float(mean_absolute_error(y_holdout, holdout_preds))
        holdout_rmse = float(math.sqrt(mean_squared_error(y_holdout, holdout_preds)))
        holdout_r2 = float(r2_score(y_holdout, holdout_preds))
        holdout_med_ae = float(np.median(np.abs(y_holdout - holdout_preds)))
        holdout_bias = float(np.mean(holdout_preds - y_holdout))

        # Baselines on Holdout
        zero_preds_holdout = np.zeros(len(y_holdout))
        slope_idx = cls.FEATURE_KEYS.index("F14")
        trend_preds_holdout = X_holdout_raw[:, slope_idx] * 28.0

        zero_mae_holdout = float(mean_absolute_error(y_holdout, zero_preds_holdout))
        trend_mae_holdout = float(mean_absolute_error(y_holdout, trend_preds_holdout))

        # -------------------------------------------------------------
        # 4. Permutation Feature Importance
        # -------------------------------------------------------------
        importance_results: List[Dict[str, Any]] = []
        base_holdout_mae = holdout_mae

        for f_idx, f_key in enumerate(cls.FEATURE_KEYS):
            corrupted_maes = []
            for _ in range(10):
                X_corrupted = np.copy(X_holdout_raw)
                shuffled_col = np.random.permutation(X_corrupted[:, f_idx])
                X_corrupted[:, f_idx] = shuffled_col

                if champion_name == "Ridge Regression":
                    X_cor_scaled = scaler_full.transform(X_corrupted)
                    p_cor = champion_model.predict(X_cor_scaled)
                else:
                    p_cor = champion_model.predict(X_corrupted)
                corrupted_maes.append(float(mean_absolute_error(y_holdout, p_cor)))

            imp = float(np.mean(corrupted_maes) - base_holdout_mae)
            importance_results.append({
                "feature": f_key,
                "importance_mae_drop": round(imp, 4),
            })

        importance_results.sort(key=lambda x: x["importance_mae_drop"], reverse=True)

        # -------------------------------------------------------------
        # 5. Uncertainty & Prediction Intervals
        # -------------------------------------------------------------
        train_residuals = y_train - cv_predictions[champion_name]
        residual_std = float(np.std(train_residuals))
        # 90% normal prediction interval: ± 1.645 * std
        half_interval_90 = 1.645 * residual_std

        # Empirical coverage on holdout
        covered = np.abs(y_holdout - holdout_preds) <= half_interval_90
        empirical_coverage_90 = float(np.mean(covered) * 100.0)

        # -------------------------------------------------------------
        # 6. Save Model Artifact
        # -------------------------------------------------------------
        artifact_dir = os.path.join(os.path.dirname(__file__), "artifacts")
        os.makedirs(artifact_dir, exist_ok=True)
        artifact_path = os.path.join(artifact_dir, "champion_model.pkl")

        if save_artifact:
            artifact_data = {
                "champion_model_name": champion_name,
                "feature_keys": cls.FEATURE_KEYS,
                "model": champion_model,
                "scaler": scaler_full if champion_name == "Ridge Regression" else None,
                "training_metrics_cv": cv_summary[champion_name],
                "holdout_metrics": {
                    "MAE": round(holdout_mae, 4),
                    "RMSE": round(holdout_rmse, 4),
                    "R2": round(holdout_r2, 4),
                    "Median_AE": round(holdout_med_ae, 4),
                    "Bias": round(holdout_bias, 4),
                },
                "residual_std": round(residual_std, 4),
                "half_interval_90": round(half_interval_90, 4),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "n_train_examples": len(y_train),
                "n_holdout_examples": len(y_holdout),
            }
            with open(artifact_path, "wb") as f_out:
                pickle.dump(artifact_data, f_out)

        return {
            "dataset_info": {
                "cohort_subjects": n_subjects,
                "total_valid_windows": len(all_examples),
                "train_windows": len(train_examples),
                "holdout_windows": len(holdout_examples),
                "train_subjects": len(train_sub_ids),
                "holdout_subjects": len(holdout_sub_ids),
            },
            "cv_metrics": cv_summary,
            "champion_model": champion_name,
            "holdout_results": {
                "champion": {
                    "MAE": round(holdout_mae, 4),
                    "RMSE": round(holdout_rmse, 4),
                    "R2": round(holdout_r2, 4),
                    "Median_AE": round(holdout_med_ae, 4),
                    "Bias": round(holdout_bias, 4),
                },
                "zero_change_baseline": {
                    "MAE": round(zero_mae_holdout, 4),
                },
                "historical_trend_baseline": {
                    "MAE": round(trend_mae_holdout, 4),
                },
                "improvement_vs_zero_pct": round(
                    ((zero_mae_holdout - holdout_mae) / zero_mae_holdout) * 100.0, 2
                ),
                "improvement_vs_trend_pct": round(
                    ((trend_mae_holdout - holdout_mae) / trend_mae_holdout) * 100.0, 2
                ),
            },
            "feature_importance": importance_results,
            "uncertainty": {
                "residual_std": round(residual_std, 4),
                "half_interval_90": round(half_interval_90, 4),
                "empirical_coverage_90_pct": round(empirical_coverage_90, 2),
            },
            "artifact_path": artifact_path,
        }
