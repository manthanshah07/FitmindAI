"""
FitMind AI Intelligence Service Package.

Provides deterministic feature extraction, data normalization,
model inference, What-If simulation, goal feasibility analysis,
plan optimization, and adaptive trajectory monitoring.
"""

from app.services.intelligence.contracts import (
    SubjectDemographics,
    MeasurementRecord,
    DailyNutritionRecord,
    NormalizedSubjectData,
    FeatureVector,
    DataCompletenessMetadata,
    FeatureExtractionResult,
    TrainingExample,
    ExcludedWindow,
)
from app.services.intelligence.feature_extractor import FeatureExtractor
from app.services.intelligence.training_windows import TrainingWindowGenerator
from app.services.intelligence.adapters import FitMindDBAdapter, DictRecordAdapter
from app.services.intelligence.sanity_checker import FeatureSanityChecker
from app.services.intelligence.model_service import ModelService, ModelArtifactError
from app.services.intelligence.prediction_service import PredictionService
from app.services.intelligence.feasibility_service import FeasibilityService
from app.services.intelligence.scenario_service import ScenarioService
from app.services.intelligence.optimizer_service import PlanOptimizerService
from app.services.intelligence.adaptation_service import AdaptationService

__all__ = [
    "SubjectDemographics",
    "MeasurementRecord",
    "DailyNutritionRecord",
    "NormalizedSubjectData",
    "FeatureVector",
    "DataCompletenessMetadata",
    "FeatureExtractionResult",
    "TrainingExample",
    "ExcludedWindow",
    "FeatureExtractor",
    "TrainingWindowGenerator",
    "FitMindDBAdapter",
    "DictRecordAdapter",
    "FeatureSanityChecker",
    "ModelService",
    "ModelArtifactError",
    "PredictionService",
    "FeasibilityService",
    "ScenarioService",
    "PlanOptimizerService",
    "AdaptationService",
]
