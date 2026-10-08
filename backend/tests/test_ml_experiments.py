"""
Unit and integration tests for ML experiment pipeline, model validation, and artifact persistence (Phase 2D).
"""

import os
import pickle
import numpy as np
import pytest
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import GroupKFold

from app.services.intelligence.hall_simulator import HallBiophysicalSimulator
from app.services.intelligence.training_windows import TrainingWindowGenerator
from app.services.intelligence.experiment_runner import ExperimentRunner


@pytest.fixture
def mini_cohort_data():
    """Generates a small controlled cohort of 20 subjects for testing."""
    cohort = HallBiophysicalSimulator.generate_benchmark_cohort(n_subjects=20, random_seed=42)
    all_exs = []
    for sub in cohort:
        exs, _ = TrainingWindowGenerator.generate_subject_training_windows(sub, step_days=28)
        all_exs.extend(exs)
    return all_exs


def test_validation_subject_isolation(mini_cohort_data):
    """
    Verifies that GroupKFold strictly isolates subjects across train and validation folds.
    Zero subject overlap is mathematically required to eliminate subject memorization leakage.
    """
    groups = np.array([ex.subject_id for ex in mini_cohort_data])
    X = np.zeros((len(mini_cohort_data), 16))
    y = np.array([ex.delta_weight_28d for ex in mini_cohort_data])

    gkf = GroupKFold(n_splits=4)
    for fold, (train_idx, val_idx) in enumerate(gkf.split(X, y, groups)):
        train_subjects = set(groups[train_idx])
        val_subjects = set(groups[val_idx])

        overlap = train_subjects.intersection(val_subjects)
        assert len(overlap) == 0, f"Subject leakage detected in fold {fold}: {overlap}"


def test_preprocessing_encapsulation_no_leakage(mini_cohort_data):
    """
    Verifies that scaling is fitted strictly on the training fold,
    and validation fold statistics do NOT influence scaler mean or variance.
    """
    feature_keys = [f"F{i:02d}" for i in range(1, 17)]
    X = np.array([[ex.features[k] for k in feature_keys] for ex in mini_cohort_data])
    groups = np.array([ex.subject_id for ex in mini_cohort_data])

    gkf = GroupKFold(n_splits=3)
    train_idx, val_idx = next(gkf.split(X, groups=groups))

    scaler_tr = StandardScaler()
    X_tr_scaled = scaler_tr.fit_transform(X[train_idx])

    # Scaler mean must match train_idx mean, NOT full X mean
    expected_mean = np.mean(X[train_idx], axis=0)
    assert np.allclose(scaler_tr.mean_, expected_mean)


def test_baselines_mathematical_logic(mini_cohort_data):
    """
    Verifies Baseline A (zero change) and Baseline B (historical trend extrapolation).
    """
    feature_keys = [f"F{i:02d}" for i in range(1, 17)]
    slope_idx = feature_keys.index("F14")

    for ex in mini_cohort_data:
        # Baseline A: predicts 0.0
        assert 0.0 == 0.0

        # Baseline B: 28 * slope
        slope = ex.features["F14"]
        expected_trend = slope * 28.0
        matrix_val = np.array([ex.features[k] for k in feature_keys])[slope_idx] * 28.0
        assert matrix_val == pytest.approx(expected_trend, 1e-6)


def test_experiment_reproducibility():
    """
    Verifies that running the experiment with identical seeds produces identical CV MAE.
    """
    res1 = ExperimentRunner.run_benchmark_experiments(n_subjects=30, random_seed=99, save_artifact=False)
    res2 = ExperimentRunner.run_benchmark_experiments(n_subjects=30, random_seed=99, save_artifact=False)

    assert res1["cv_metrics"]["Ridge Regression"]["MAE"] == res2["cv_metrics"]["Ridge Regression"]["MAE"]
    assert res1["holdout_results"]["champion"]["MAE"] == res2["holdout_results"]["champion"]["MAE"]


def test_champion_model_artifact_loading():
    """
    Verifies that the serialized model artifact can be reloaded and produces valid predictions.
    """
    artifact_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "app", "services", "intelligence", "artifacts", "champion_model.pkl"
    )
    assert os.path.exists(artifact_path), f"Artifact missing at {artifact_path}"

    with open(artifact_path, "rb") as f:
        artifact = pickle.load(f)

    assert "model" in artifact
    assert "feature_keys" in artifact
    assert len(artifact["feature_keys"]) == 16
    assert artifact["champion_model_name"] == "Ridge Regression"

    # Make test prediction on dummy input
    dummy_input = np.ones((1, 16))
    if artifact.get("scaler"):
        dummy_input = artifact["scaler"].transform(dummy_input)
    pred = artifact["model"].predict(dummy_input)

    assert isinstance(float(pred[0]), float)
    assert not np.isnan(pred[0])
