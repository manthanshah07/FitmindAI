from typing import List, Optional
from uuid import UUID
from sqlalchemy import String, cast, case
from sqlalchemy.orm import Session
from app.models.workout import Exercise
from app.schemas.workout import ExerciseResponse

DEFAULT_EXERCISES = [
    # --- CHEST ---
    {
        "name": "Barbell Bench Press",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Triceps", "Front Deltoids"],
        "equipment_required": ["barbell", "bench"],
        "difficulty": "intermediate",
        "category": "strength",
        "description": "Foundational compound horizontal push for upper body power and pectoral hypertrophy.",
        "instructions": "Lie flat on the bench with feet firmly planted on the floor. Grip the barbell slightly wider than shoulder width and unrack it directly over your chest. Lower the bar smoothly to mid-chest while tucking your elbows slightly. Press forcefully back to lockout without bouncing.",
    },
    {
        "name": "Incline Dumbbell Press",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Front Deltoids", "Triceps"],
        "equipment_required": ["dumbbells", "bench"],
        "difficulty": "intermediate",
        "category": "hypertrophy",
        "description": "Upper pectoral compound press providing greater range of motion and stabilizer recruitment.",
        "instructions": "Set an incline bench to roughly 30 to 45 degrees. Hold dumbbells at shoulder height with palms facing forward. Press the weights up and slightly inward over your clavicles. Lower under control until you feel a deep, comfortable chest stretch.",
    },
    {
        "name": "Dumbbell Bench Press",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Triceps", "Front Deltoids"],
        "equipment_required": ["dumbbells", "bench"],
        "difficulty": "beginner",
        "category": "strength",
        "description": "Flat bench press variation allowing independent arm movement and balanced pectoral development.",
        "instructions": "Lie on a flat bench with a dumbbell in each hand above your chest. Lower both weights slowly until your elbows reach just below bench level. Drive the dumbbells back up along a gentle arc, squeezing your chest at the top.",
    },
    {
        "name": "Push-up",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Triceps", "Front Deltoids", "Core"],
        "equipment_required": ["bodyweight"],
        "difficulty": "beginner",
        "category": "strength",
        "description": "Classic horizontal bodyweight pushing exercise building chest, shoulder, and trunk stability.",
        "instructions": "Set your hands slightly outside shoulder width in a firm high plank position. Keep your glutes engaged and brace your core so your body forms a straight line. Lower your chest until it is an inch from the floor. Push through your palms back to full extension.",
    },
    {
        "name": "Dips (Chest Focus)",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Triceps", "Front Deltoids"],
        "equipment_required": ["bodyweight"],
        "difficulty": "advanced",
        "category": "strength",
        "description": "Bodyweight compound movement emphasizing the lower pectorals and pressing strength.",
        "instructions": "Mount parallel dip bars and lock out your arms. Lean your torso slightly forward to bias the chest and bend your knees. Lower your body until your shoulders descend below elbow height. Drive yourself back up, keeping the slight forward lean throughout.",
    },
    {
        "name": "Cable Crossover",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Front Deltoids"],
        "equipment_required": ["cables"],
        "difficulty": "intermediate",
        "category": "hypertrophy",
        "description": "Constant tension isolation exercise for complete pectoral contraction across the midline.",
        "instructions": "Set cable pulleys to shoulder height or higher and step forward into a staggered stance. With a slight bend in your elbows, pull both handles together in a hugging motion. Pause and squeeze your chest hard at peak contraction. Control the handles back out along the same wide arc.",
    },
    {
        "name": "Knee Push-Up",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Triceps", "Front Deltoids"],
        "equipment_required": ["bodyweight"],
        "difficulty": "beginner",
        "category": "strength",
        "description": "Accessible pressing regression designed to build horizontal push mechanics.",
        "instructions": "Start on hands and knees with hands positioned slightly wider than shoulder width. Shift your weight forward until your thighs and torso align in a straight line. Lower your chest smoothly toward the floor. Press back up without letting your lower back sag.",
    },

    # --- BACK & LATS ---
    {
        "name": "Barbell Deadlift",
        "primary_muscle": "Hamstrings",
        "secondary_muscles": ["Glutes", "Lower Back", "Traps", "Lats"],
        "equipment_required": ["barbell"],
        "difficulty": "advanced",
        "category": "strength",
        "description": "Pivotal posterior chain compound exercise developing total-body pulling power and spinal integrity.",
        "instructions": "Stand with feet hip-width apart and the barbell over mid-foot. Hinge at your hips, grip the bar firmly, and pull your shoulder blades down to set your lats. Drive through the floor with your legs while maintaining a neutral spine. Lock out hips and knees simultaneously at the top.",
    },
    {
        "name": "Pull-up",
        "primary_muscle": "Lats",
        "secondary_muscles": ["Biceps", "Upper Back", "Forearms"],
        "equipment_required": ["pull_up_bar"],
        "difficulty": "intermediate",
        "category": "strength",
        "description": "The gold-standard vertical pulling movement for lat width and upper body pulling resilience.",
        "instructions": "Grasp the overhead bar with an overhand grip slightly wider than shoulder width. Depress your scapulae and pull your elbows straight down toward your ribs. Pull until your chin clearly passes above the bar. Lower with full control until your arms are fully extended.",
    },
    {
        "name": "Chin-up",
        "primary_muscle": "Lats",
        "secondary_muscles": ["Biceps", "Upper Back"],
        "equipment_required": ["pull_up_bar"],
        "difficulty": "intermediate",
        "category": "strength",
        "description": "Underhand vertical pull combining high lat activation with significant biceps recruitment.",
        "instructions": "Grip the bar with palms facing toward you at roughly shoulder width. Engage your core to prevent swinging, then pull your chest upward toward the bar. Drive elbows down and back until your chin clears the bar. Lower yourself smoothly back to a dead hang.",
    },
    {
        "name": "Lat Pulldown",
        "primary_muscle": "Lats",
        "secondary_muscles": ["Biceps", "Upper Back"],
        "equipment_required": ["cables", "full_gym"],
        "difficulty": "beginner",
        "category": "hypertrophy",
        "description": "Machine-supported vertical pull ideal for building lat volume with controllable loading.",
        "instructions": "Sit with thighs secured snugly under the padded rollers. Grip the wide bar with an overhand grip and lean back just a few degrees. Pull the bar down smoothly to your upper chest by driving your elbows down. Slowly guide the bar back up until your lats are fully stretched.",
    },
    {
        "name": "Barbell Bent-Over Row",
        "primary_muscle": "Upper Back",
        "secondary_muscles": ["Lats", "Biceps", "Hamstrings", "Lower Back"],
        "equipment_required": ["barbell"],
        "difficulty": "intermediate",
        "category": "strength",
        "description": "Heavy horizontal pull building upper back thickness, rhomboid strength, and hip endurance.",
        "instructions": "Hinge forward at the hips with a flat back until your torso is roughly 45 degrees to the floor. Hold the barbell with an overhand grip hanging beneath your shoulders. Row the bar toward your lower ribcage, pulling with your elbows. Lower under control without changing your hip hinge angle.",
    },
    {
        "name": "One-Arm Dumbbell Row",
        "primary_muscle": "Lats",
        "secondary_muscles": ["Biceps", "Upper Back", "Core"],
        "equipment_required": ["dumbbells", "bench"],
        "difficulty": "beginner",
        "category": "strength",
        "description": "Unilateral horizontal pull allowing full stretch and targeted lat engagement without lower back fatigue.",
        "instructions": "Place one knee and same-side hand firmly on a flat bench for support. Hold a dumbbell in the opposite hand with arm hanging naturally down. Pull the dumbbell upward along a slight arc toward your hip crease. Lower the weight under control until you feel a complete lat stretch.",
    },
    {
        "name": "Seated Cable Row",
        "primary_muscle": "Upper Back",
        "secondary_muscles": ["Lats", "Biceps", "Rear Deltoids"],
        "equipment_required": ["cables"],
        "difficulty": "beginner",
        "category": "hypertrophy",
        "description": "Stable horizontal row targeting mid-back thickness, rhomboids, and lower trapezius.",
        "instructions": "Sit upright with feet on the footplates and a slight bend in your knees. Grasp the close-grip handle and maintain an upright chest with shoulders back. Pull the handle directly into your abdomen, squeezing your shoulder blades together. Return with control without rounding your back.",
    },
    {
        "name": "Cable Face Pull",
        "primary_muscle": "Rear Deltoids",
        "secondary_muscles": ["Upper Back", "Rotator Cuff"],
        "equipment_required": ["cables"],
        "difficulty": "beginner",
        "category": "hypertrophy",
        "description": "Crucial postural and shoulder health movement targeting the posterior delts and external rotators.",
        "instructions": "Set a rope attachment at upper chest or eye level. Grip the rope with thumbs pointing backward and step back into tension. Pull the center of the rope directly toward your forehead while separating your hands. Externally rotate your shoulders at the end, then control the release.",
    },

    # --- SHOULDERS ---
    {
        "name": "Overhead Press",
        "primary_muscle": "Shoulders",
        "secondary_muscles": ["Triceps", "Upper Chest", "Core"],
        "equipment_required": ["barbell"],
        "difficulty": "intermediate",
        "category": "strength",
        "description": "Primary vertical pressing movement for deltoid development and standing trunk stability.",
        "instructions": "Stand with feet shoulder-width apart, holding the barbell resting across your anterior deltoids. Squeeze your glutes, brace your core, and tilt your head back slightly to clear the bar. Press the barbell straight overhead until your arms are fully locked out. Lower the bar smoothly back to clavicle height.",
    },
    {
        "name": "Dumbbell Shoulder Press",
        "primary_muscle": "Shoulders",
        "secondary_muscles": ["Triceps", "Upper Chest"],
        "equipment_required": ["dumbbells", "bench"],
        "difficulty": "beginner",
        "category": "strength",
        "description": "Vertical dumbbell press providing natural shoulder wrist alignment and deltoid overload.",
        "instructions": "Sit on an upright bench with dumbbells held at shoulder level, palms forward. Press the weights upward in a smooth arc until your arms are fully extended overhead. Avoid clinking the weights together at the top. Lower slowly back to ear level before repeating.",
    },
    {
        "name": "Dumbbell Lateral Raise",
        "primary_muscle": "Shoulders",
        "secondary_muscles": ["Traps"],
        "equipment_required": ["dumbbells"],
        "difficulty": "beginner",
        "category": "hypertrophy",
        "description": "Targeted medial deltoid isolation for building shoulder width and upper body silhouette.",
        "instructions": "Stand with dumbbells at your sides and a very slight forward torso lean. With soft elbows, raise the weights out to your sides until they reach shoulder height. Lead with your elbows rather than your wrists. Lower under control without swinging your hips.",
    },
    {
        "name": "Cable Lateral Raise",
        "primary_muscle": "Shoulders",
        "secondary_muscles": ["Traps"],
        "equipment_required": ["cables"],
        "difficulty": "beginner",
        "category": "hypertrophy",
        "description": "Side deltoid isolation delivering continuous resistance through the entire range of motion.",
        "instructions": "Set a low cable pulley and stand sideways to the machine. Grip the handle across your body with the far hand. Raise your arm outward to shoulder level while keeping your torso quiet. Slowly lower the weight back across your body to maintain tension.",
    },
    {
        "name": "Arnold Press",
        "primary_muscle": "Shoulders",
        "secondary_muscles": ["Triceps", "Upper Chest"],
        "equipment_required": ["dumbbells", "bench"],
        "difficulty": "intermediate",
        "category": "hypertrophy",
        "description": "Rotating overhead press hitting the anterior and medial deltoids through an extended arc.",
        "instructions": "Sit upright holding dumbbells in front of your chest with palms facing your torso. As you press upward, rotate your hands until palms face forward at the top lockout. Reverse the rotation smoothly as you descend back to the start. Keep the movement fluid and controlled.",
    },

    # --- LEGS: QUADRICEPS ---
    {
        "name": "Barbell Squat",
        "primary_muscle": "Quadriceps",
        "secondary_muscles": ["Glutes", "Hamstrings", "Core"],
        "equipment_required": ["barbell"],
        "difficulty": "intermediate",
        "category": "strength",
        "description": "The premier compound lower-body exercise for quad hypertrophy, glute power, and leg strength.",
        "instructions": "Rest the barbell firmly across your upper traps and stand with feet slightly wider than shoulder width. Brace your abdominal wall, break at hips and knees, and squat down until your hip crease dips below your knees. Keep your chest tall and knees tracking over your toes. Drive up forcefully through mid-foot to stand.",
    },
    {
        "name": "Leg Press",
        "primary_muscle": "Quadriceps",
        "secondary_muscles": ["Glutes", "Hamstrings"],
        "equipment_required": ["full_gym"],
        "difficulty": "beginner",
        "category": "hypertrophy",
        "description": "Heavy machine compound leg exercise providing maximal quadriceps loading with minimal spinal stress.",
        "instructions": "Sit into the sled seat with your lower back pressed firmly against the back pad. Place your feet shoulder-width apart in the center of the platform. Disengage the safeties and lower the platform until your knees bend to 90 degrees. Press through your full foot back up without locking your knees.",
    },
    {
        "name": "Bulgarian Split Squat",
        "primary_muscle": "Quadriceps",
        "secondary_muscles": ["Glutes", "Hamstrings"],
        "equipment_required": ["dumbbells", "bench"],
        "difficulty": "intermediate",
        "category": "hypertrophy",
        "description": "Unilateral leg builder addressing imbalances while producing intense quad and glute hypertrophy.",
        "instructions": "Stand two feet in front of a bench and place the laces of your rear foot on the bench pad. Hold dumbbells at your sides or use bodyweight. Descend until your front thigh is parallel to the ground and your back knee hovers above the floor. Push up through your front heel back to the top.",
    },
    {
        "name": "Goblet Squat",
        "primary_muscle": "Quadriceps",
        "secondary_muscles": ["Glutes", "Core"],
        "equipment_required": ["dumbbells"],
        "difficulty": "beginner",
        "category": "strength",
        "description": "Front-loaded squat pattern excellent for teaching upright posture and deep quad engagement.",
        "instructions": "Hold a dumbbell vertically against your chest with both hands under the top bell. Stand with feet shoulder-width apart and toes angled slightly outward. Sit down between your heels while keeping your elbows pointing down. Drive back up through your heels to a full hip extension.",
    },
    {
        "name": "Leg Extension",
        "primary_muscle": "Quadriceps",
        "secondary_muscles": [],
        "equipment_required": ["full_gym"],
        "difficulty": "beginner",
        "category": "hypertrophy",
        "description": "Open-chain machine isolation specifically targeting all four heads of the quadriceps.",
        "instructions": "Adjust the backrest so your knees align directly with the machine's pivot point. Position the shin pad just above your ankles and grip the side handles. Extend your legs forward until knees are straight, pausing briefly to squeeze your quads. Lower the weight under strict control.",
    },
    {
        "name": "Walking Lunge",
        "primary_muscle": "Quadriceps",
        "secondary_muscles": ["Glutes", "Hamstrings", "Calves"],
        "equipment_required": ["dumbbells"],
        "difficulty": "beginner",
        "category": "hypertrophy",
        "description": "Dynamic unilateral movement building functional quad strength, hip mobility, and single-leg balance.",
        "instructions": "Hold dumbbells at your sides and stand tall. Take a deliberate stride forward and lower your hips until both knees form 90-degree angles. Push off the back foot and step forward smoothly into the next lunge. Maintain an upright torso throughout.",
    },
    {
        "name": "Bodyweight Squat",
        "primary_muscle": "Quadriceps",
        "secondary_muscles": ["Glutes", "Hamstrings"],
        "equipment_required": ["bodyweight"],
        "difficulty": "beginner",
        "category": "strength",
        "description": "Fundamental lower body knee-dominant movement establishing baseline hip and ankle mobility.",
        "instructions": "Stand with feet shoulder-width apart and arms out for counter-balance. Hinge back and descend into a deep squat, keeping heels planted. Drive through your heels to return to a full upright standing position. Ensure knees track naturally over your toes.",
    },

    # --- LEGS: HAMSTRINGS & GLUTES ---
    {
        "name": "Romanian Deadlift",
        "primary_muscle": "Hamstrings",
        "secondary_muscles": ["Glutes", "Lower Back"],
        "equipment_required": ["barbell"],
        "difficulty": "intermediate",
        "category": "hypertrophy",
        "description": "Hip-hinge staple emphasizing hamstring eccentric stretch and glute hypertrophy.",
        "instructions": "Hold a barbell at hip height with an overhand grip and knees slightly unlocked. Push your hips back as far as possible while keeping the bar in contact with your thighs. Lower until you feel a strong stretch across your hamstrings. Drive hips forward to stand, squeezing glutes at the top.",
    },
    {
        "name": "Dumbbell Romanian Deadlift",
        "primary_muscle": "Hamstrings",
        "secondary_muscles": ["Glutes", "Lower Back"],
        "equipment_required": ["dumbbells"],
        "difficulty": "beginner",
        "category": "hypertrophy",
        "description": "Accessible hip-hinge exercise building posterior chain strength and hamstring flexibility.",
        "instructions": "Hold a dumbbell in each hand resting on the front of your thighs. Keep a soft bend in your knees and push your hips straight backward. Lower the weights just below knee height while keeping your back flat. Squeeze your hamstrings and glutes to pull your hips forward.",
    },
    {
        "name": "Lying Leg Curl",
        "primary_muscle": "Hamstrings",
        "secondary_muscles": ["Calves"],
        "equipment_required": ["full_gym"],
        "difficulty": "beginner",
        "category": "hypertrophy",
        "description": "Direct hamstring knee-flexion machine isolation for complete posterior leg development.",
        "instructions": "Lie face down with the lever pad resting on the back of your lower legs just below the calves. Grasp the machine handles and keep your hips pinned to the bench. Curl the pad upward toward your glutes through a full range of motion. Lower slowly to a full stretch without letting the plates crash.",
    },
    {
        "name": "Barbell Hip Thrust",
        "primary_muscle": "Glutes",
        "secondary_muscles": ["Hamstrings"],
        "equipment_required": ["barbell", "bench"],
        "difficulty": "intermediate",
        "category": "hypertrophy",
        "description": "Premier horizontal hip extension movement generating maximum glute tension at peak contraction.",
        "instructions": "Sit on the floor with your upper back against a bench and a padded barbell over your hips. Place your feet flat on the ground shoulder-width apart. Drive through your heels and elevate your hips until your thighs and torso are parallel to the floor. Squeeze your glutes hard at the top, then lower with control.",
    },
    {
        "name": "Glute Bridge",
        "primary_muscle": "Glutes",
        "secondary_muscles": ["Hamstrings", "Core"],
        "equipment_required": ["bodyweight"],
        "difficulty": "beginner",
        "category": "strength",
        "description": "Floor-based glute activator building pelvic stability and baseline hip extension.",
        "instructions": "Lie on your back with knees bent and feet flat on the floor hip-width apart. Press your arms into the floor, engage your core, and drive your hips upward. Hold the top bridge position for one second with glutes contracted. Lower your hips smoothly back to the floor.",
    },
    {
        "name": "Kettlebell Swing",
        "primary_muscle": "Glutes",
        "secondary_muscles": ["Hamstrings", "Core", "Lower Back"],
        "equipment_required": ["kettlebell"],
        "difficulty": "intermediate",
        "category": "cardio",
        "description": "Ballistic hip-hinge movement developing explosive posterior power and cardiovascular endurance.",
        "instructions": "Stand with feet shoulder-width apart with a kettlebell placed a foot in front of you. Hinge back, hike the bell between your legs, and snap your hips forward explosively. The kettlebell should rise to chest height from hip momentum alone. Guide the bell back through the hinge and repeat in rhythm.",
    },

    # --- ARMS: BICEPS & TRICEPS ---
    {
        "name": "Barbell Bicep Curl",
        "primary_muscle": "Biceps",
        "secondary_muscles": ["Forearms"],
        "equipment_required": ["barbell"],
        "difficulty": "beginner",
        "category": "hypertrophy",
        "description": "Heavy bilateral curl pattern designed for maximum overload of both bicep heads.",
        "instructions": "Stand tall holding a barbell with a shoulder-width underhand grip. Pin your elbows close to your ribcage and curl the bar toward your shoulders. Squeeze your biceps hard at peak flexion without leaning back. Lower the weight smoothly back to complete arm extension.",
    },
    {
        "name": "Dumbbell Bicep Curl",
        "primary_muscle": "Biceps",
        "secondary_muscles": ["Forearms"],
        "equipment_required": ["dumbbells"],
        "difficulty": "beginner",
        "category": "hypertrophy",
        "description": "Standard dumbbell arm curl allowing supination through the full range of motion.",
        "instructions": "Hold dumbbells at arm's length with palms facing inward. As you curl upward, rotate your wrists so palms face upward near the top. Pause briefly at peak contraction to squeeze the muscle. Lower the dumbbells back down under strict control.",
    },
    {
        "name": "Dumbbell Hammer Curl",
        "primary_muscle": "Biceps",
        "secondary_muscles": ["Forearms"],
        "equipment_required": ["dumbbells"],
        "difficulty": "beginner",
        "category": "hypertrophy",
        "description": "Neutral-grip curl emphasizing the brachialis and brachioradialis for arm thickness.",
        "instructions": "Hold dumbbells with palms facing each other in a neutral handshake grip. Keeping your upper arms still, curl the weights up toward your shoulders. Maintain the neutral palm position throughout the entire lift. Lower slowly back to arm's length.",
    },
    {
        "name": "Tricep Rope Pushdown",
        "primary_muscle": "Triceps",
        "secondary_muscles": [],
        "equipment_required": ["cables"],
        "difficulty": "beginner",
        "category": "hypertrophy",
        "description": "High-tension cable triceps isolation hitting the lateral and medial tricep heads.",
        "instructions": "Attach a rope to a high cable pulley and hold the ends with a neutral grip. Pin your elbows to your sides and lean slightly forward from your hips. Push the rope down, spreading the ends apart at the bottom for peak triceps contraction. Let the rope rise back until elbows reach 90 degrees.",
    },
    {
        "name": "Skull Crusher (Barbell Lying Extension)",
        "primary_muscle": "Triceps",
        "secondary_muscles": ["Forearms"],
        "equipment_required": ["barbell", "bench"],
        "difficulty": "intermediate",
        "category": "hypertrophy",
        "description": "Overhead tricep extension targeting the long head of the triceps under deep stretch.",
        "instructions": "Lie on a flat bench holding an EZ-curl or straight barbell directly above your chest. Keeping your upper arms stationary and angled slightly back, bend your elbows to lower the bar toward your crown. Extend your elbows back up to full lockout using tricep power alone.",
    },
    {
        "name": "Overhead Dumbbell Tricep Extension",
        "primary_muscle": "Triceps",
        "secondary_muscles": [],
        "equipment_required": ["dumbbells"],
        "difficulty": "beginner",
        "category": "hypertrophy",
        "description": "Overhead extension providing extreme eccentric stretch on the long head of the triceps.",
        "instructions": "Sit or stand holding a single dumbbell vertically overhead with both hands cup-gripping the top plate. Lower the dumbbell behind your head by bending only at your elbows. When your triceps are fully stretched, press the weight back overhead to lockout.",
    },
    {
        "name": "Close-Grip Bench Press",
        "primary_muscle": "Triceps",
        "secondary_muscles": ["Chest", "Front Deltoids"],
        "equipment_required": ["barbell", "bench"],
        "difficulty": "intermediate",
        "category": "strength",
        "description": "Compound pressing variation shifting mechanical load directly onto the triceps.",
        "instructions": "Lie on a flat bench and grip the barbell with hands roughly shoulder-width apart. Unrack the bar and lower it smoothly to your lower sternum while keeping elbows tucked near your ribs. Drive the bar straight back up to lockout, focusing on extending with your triceps.",
    },

    # --- CORE, CALVES & CARDIO ---
    {
        "name": "Standing Calf Raise",
        "primary_muscle": "Calves",
        "secondary_muscles": [],
        "equipment_required": ["dumbbells"],
        "difficulty": "beginner",
        "category": "hypertrophy",
        "description": "Straight-leg calf exercise developing the gastrocnemius through deep ankle flexion.",
        "instructions": "Stand with the balls of your feet on a raised ledge, holding a dumbbell for resistance. Lower your heels below the ledge until your calves are fully stretched. Drive onto the balls of your toes as high as possible, pausing for one second at the top. Lower with control back into the stretch.",
    },
    {
        "name": "Plank",
        "primary_muscle": "Abs",
        "secondary_muscles": ["Obliques", "Lower Back", "Shoulders"],
        "equipment_required": ["bodyweight"],
        "difficulty": "beginner",
        "category": "core",
        "description": "Foundational isometric core exercise training anti-extension trunk stability.",
        "instructions": "Rest on your forearms with elbows directly under your shoulders and legs straight back on your toes. Brace your abs as if taking a punch and squeeze your glutes. Maintain a rigid, horizontal line from head to heels. Breathe steadily without letting your lower back sag.",
    },
    {
        "name": "Hanging Leg Raise",
        "primary_muscle": "Abs",
        "secondary_muscles": ["Forearms", "Hip Flexors"],
        "equipment_required": ["pull_up_bar"],
        "difficulty": "advanced",
        "category": "core",
        "description": "Challenging core movement emphasizing the lower rectus abdominis and grip strength.",
        "instructions": "Hang from an overhead pull-up bar with an overhand grip and arms straight. Without swinging your legs for momentum, raise your legs or knees up toward your chest. Roll your pelvis slightly forward at the top to fully engage the abs. Lower slowly back to a dead hang.",
    },
    {
        "name": "Stationary Cycling",
        "primary_muscle": "Cardio",
        "secondary_muscles": ["Quadriceps", "Calves"],
        "equipment_required": ["cardio_machines"],
        "difficulty": "beginner",
        "category": "cardio",
        "description": "Low-impact aerobic conditioning preserving joint integrity while boosting cardiovascular recovery.",
        "instructions": "Adjust the bike seat so your knees have a slight bend at the bottom of the pedal stroke. Begin pedaling at a steady, rhythmic cadence with light resistance. Gradually increase resistance to your target training heart rate zone. Maintain smooth circular pedal strokes throughout.",
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
        equipment: Optional[str] = None,
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
        if equipment:
            query = query.filter(cast(Exercise.equipment_required, String).ilike(f"%{equipment}%"))

        if search:
            # Sort exact and prefix matches first, then alphabetical
            is_exact = case((Exercise.name.ilike(search), 0), else_=1)
            is_prefix = case((Exercise.name.ilike(f"{search}%"), 0), else_=1)
            exercises = query.order_by(is_exact, is_prefix, Exercise.name).all()
        else:
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
                # Update placeholder text or missing fields on existing records
                updated = False
                if not existing.instructions or "Standard training exercise" in (existing.description or ""):
                    existing.instructions = item["instructions"]
                    existing.description = item["description"]
                    existing.secondary_muscles = item["secondary_muscles"]
                    existing.equipment_required = item["equipment_required"]
                    existing.difficulty = item["difficulty"]
                    existing.category = item["category"]
                    updated = True
                if updated:
                    db.commit()
                    db.refresh(existing)
                seeded.append(ExerciseResponse.model_validate(existing))
        return seeded
