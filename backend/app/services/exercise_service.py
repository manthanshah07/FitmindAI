from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.workout import Exercise
from app.schemas.workout import ExerciseCreate, ExerciseResponse

DEFAULT_EXERCISES = [
    {
        "name": "Push-up",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Triceps", "Shoulders"],
        "equipment_required": ["bodyweight"],
        "difficulty": "beginner",
        "category": "strength",
        "description": "Standard bodyweight chest push exercise.",
        "instructions": "Keep core tight, lower chest to floor, push up to full arm extension.",
    },
    {
        "name": "Bodyweight Squat",
        "primary_muscle": "Quadriceps",
        "secondary_muscles": ["Glutes", "Hamstrings"],
        "equipment_required": ["bodyweight"],
        "difficulty": "beginner",
        "category": "strength",
        "description": "Fundamental lower body knee-dominant exercise.",
        "instructions": "Stand feet shoulder-width apart, sit hips back and down, drive through heels to stand.",
    },
    {
        "name": "Dumbbell Bench Press",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Triceps", "Front Deltoids"],
        "equipment_required": ["dumbbells", "bench"],
        "difficulty": "intermediate",
        "category": "strength",
        "description": "Dumbbell chest pressing variation on flat bench.",
        "instructions": "Lie on bench, press dumbbells upwards over chest, lower under control.",
    },
    {
        "name": "Barbell Deadlift",
        "primary_muscle": "Hamstrings",
        "secondary_muscles": ["Glutes", "Lower Back", "Traps"],
        "equipment_required": ["barbell"],
        "difficulty": "intermediate",
        "category": "strength",
        "description": "Compound hip-hinge pulling movement.",
        "instructions": "Hinge at hips, grip bar, pull bar up legs while keeping flat spine.",
    },
    {
        "name": "Pull-up",
        "primary_muscle": "Lats",
        "secondary_muscles": ["Biceps", "Upper Back"],
        "equipment_required": ["pull_up_bar"],
        "difficulty": "intermediate",
        "category": "strength",
        "description": "Bodyweight vertical pull.",
        "instructions": "Grip overhead bar, pull chin above bar, lower smoothly.",
    },
    {
        "name": "Dumbbell Bicep Curl",
        "primary_muscle": "Biceps",
        "secondary_muscles": ["Forearms"],
        "equipment_required": ["dumbbells"],
        "difficulty": "beginner",
        "category": "strength",
        "description": "Isolation arm exercise.",
        "instructions": "Keep elbows close to torso, curl dumbbells up to shoulder level.",
    },
    {
        "name": "Plank",
        "primary_muscle": "Abs",
        "secondary_muscles": ["Obliques", "Lower Back"],
        "equipment_required": ["bodyweight"],
        "difficulty": "beginner",
        "category": "core",
        "description": "Isometric core stabilization.",
        "instructions": "Maintain straight body line on elbows and toes for specified duration.",
    },
    {
        "name": "Kettlebell Swing",
        "primary_muscle": "Glutes",
        "secondary_muscles": ["Hamstrings", "Core"],
        "equipment_required": ["kettlebell"],
        "difficulty": "intermediate",
        "category": "cardio",
        "description": "Explosive posterior chain swing.",
        "instructions": "Hinge hips back, snap hips forward to propel kettlebell to chest height.",
    },
]


class ExerciseService:
    @staticmethod
    def get_exercises(
        db: Session,
        muscle: Optional[str] = None,
        category: Optional[str] = None,
        difficulty: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[ExerciseResponse]:
        query = db.query(Exercise)

        if muscle:
            query = query.filter(Exercise.primary_muscle.ilike(f"%{muscle}%"))
        if category:
            query = query.filter(Exercise.category.ilike(f"%{category}%"))
        if difficulty:
            query = query.filter(Exercise.difficulty.ilike(f"%{difficulty}%"))
        if search:
            query = query.filter(Exercise.name.ilike(f"%{search}%"))

        exercises = query.order_by(Exercise.name).all()
        return [ExerciseResponse.model_validate(e) for e in exercises]

    @staticmethod
    def get_exercise_by_id(db: Session, exercise_id: UUID) -> Optional[ExerciseResponse]:
        exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
        if not exercise:
            return None
        return ExerciseResponse.model_validate(exercise)

    @staticmethod
    def seed_default_exercises(db: Session) -> List[ExerciseResponse]:
        seeded = []
        for item in DEFAULT_EXERCISES:
            existing = db.query(Exercise).filter(Exercise.name == item["name"]).first()
            if not existing:
                ex = Exercise(**item)
                db.add(ex)
                db.commit()
                db.refresh(ex)
                seeded.append(ExerciseResponse.model_validate(ex))
            else:
                seeded.append(ExerciseResponse.model_validate(existing))
        return seeded
