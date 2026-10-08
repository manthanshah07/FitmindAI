"""
Model Loading and Inference Service for FitMind AI Intelligence Engine.
Loads the Phase 2D champion Ridge Regression artifact and its preprocessing pipeline.
Enforces feature order, feature versioning, scaler integrity, and fails safely if artifact is missing or corrupted.
"""

import os
import pickle
from typing import Dict, Any, Tuple, Optional

import numpy as np


class ModelArtifactError(Exception):
    """Raised when the ML model artifact is missing, corrupted, or has an invalid schema."""
    pass


class ModelService:
    """
    Singleton-style service that loads and caches the champion model artifact.
    Expects strictly F01..F16 in the Phase 2C canonical order.
    """

    FEATURE_KEYS = [f"F{i:02d}" for i in range(1, 17)]
    FEATURE_SCHEMA_VERSION = "2.4.0-canonical-16"
    MODEL_NAME = "Ridge Regression (Standard Scaled)"
    MODEL_VERSION = "2.4.0-phase2d-champion"
    _cached_artifact: Optional[Dict[str, Any]] = None

    @classmethod
    def get_artifact_path(cls) -> str:
        """Returns absolute path to the serialized champion model artifact."""
        return os.path.join(
            os.path.dirname(__file__),
            "artifacts",
            "champion_model.pkl",
        )

    @classmethod
    def get_model_identity(cls) -> Dict[str, str]:
        """Returns model identity and schema version metadata."""
        return {
            "model_name": cls.MODEL_NAME,
            "model_version": cls.MODEL_VERSION,
            "feature_schema_version": cls.FEATURE_SCHEMA_VERSION,
        }

    @classmethod
    def load_champion_artifact(cls, force_reload: bool = False) -> Dict[str, Any]:
        """
        Loads and validates the champion model artifact from disk.
        Caches in memory for subsequent requests.
        Ensures model, scaler, feature keys, and schema ordering remain strictly coupled.
        """
        if cls._cached_artifact is not None and not force_reload:
            return cls._cached_artifact

        artifact_path = cls.get_artifact_path()
        if not os.path.exists(artifact_path):
            raise ModelArtifactError(
                f"Champion model artifact not found at {artifact_path}. "
                "Phase 2D experiment must be run before serving predictions."
            )

        try:
            with open(artifact_path, "rb") as f:
                artifact = pickle.load(f)
        except Exception as e:
            raise ModelArtifactError(f"Failed to deserialize model artifact: {str(e)}")

        if not isinstance(artifact, dict):
            raise ModelArtifactError("Deserialized artifact is not a valid dictionary.")

        # 1. Validate model object
        if "model" not in artifact or not hasattr(artifact["model"], "predict"):
            raise ModelArtifactError("Artifact is missing a valid trained model object.")

        # 2. Validate feature schema keys and exact order
        artifact_keys = artifact.get("feature_keys", [])
        if artifact_keys != cls.FEATURE_KEYS:
            raise ModelArtifactError(
                f"Feature schema mismatch! Model expects {artifact_keys}, "
                f"but system requires canonical {cls.FEATURE_KEYS}."
            )

        # 3. Validate scaler object and input dimension coupling
        scaler = artifact.get("scaler")
        if scaler is not None:
            if not hasattr(scaler, "transform"):
                raise ModelArtifactError("Artifact scaler does not implement transform().")
            if hasattr(scaler, "n_features_in_") and scaler.n_features_in_ != len(cls.FEATURE_KEYS):
                raise ModelArtifactError(
                    f"Scaler expects {scaler.n_features_in_} features, "
                    f"but canonical schema requires {len(cls.FEATURE_KEYS)}."
                )

        cls._cached_artifact = artifact
        return cls._cached_artifact

    @classmethod
    def predict_delta_weight_28d(cls, feature_dict: Dict[str, float]) -> float:
        """
        Computes projected 28-day weight change (kg) from canonical F01..F16 feature dictionary.
        """
        artifact = cls.load_champion_artifact()
        model = artifact["model"]
        scaler = artifact.get("scaler")

        # Verify all 16 features are present
        vector: list[float] = []
        for key in cls.FEATURE_KEYS:
            if key not in feature_dict or feature_dict[key] is None:
                raise ValueError(f"Missing required feature '{key}' for prediction.")
            vector.append(float(feature_dict[key]))

        X = np.array([vector], dtype=np.float64)

        # Apply preprocessing scaler if model was trained with one
        if scaler is not None:
            X = scaler.transform(X)

        raw_pred = model.predict(X)[0]
        return float(round(raw_pred, 4))
