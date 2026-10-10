import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Target,
  Activity,
  Sliders,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Info,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { completeOnboardingApi, getProfileApi } from '../../lib/api/profile';
import { createGoalApi, getActiveGoalApi } from '../../lib/api/goals';
import { getErrorMessage } from '../../utils/apiError';
import { calculateTDEE } from '../../utils/tdeeCalculator';
import type { Gender, ActivityLevel, DietPreference } from '../../types/profile';
import type { GoalType } from '../../types/goal';

interface OnboardingWizardState {
  // Step 1: Personal Info
  full_name: string;
  date_of_birth: string;
  gender: Gender | '';
  height_cm: string;
  weight_kg: string;

  // Step 2: Goals
  goal_type: GoalType | '';
  target_weight_kg: string;
  target_date: string;

  // Step 3: Fitness Level
  activity_level: ActivityLevel | '';

  // Step 4: Preferences
  diet_preference: DietPreference | '';
  equipment: string[];
  medical_notes: string;
}

const EQUIPMENT_OPTIONS = [
  { id: 'bodyweight', label: 'Bodyweight Only' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'barbell', label: 'Barbell & Plates' },
  { id: 'kettlebell', label: 'Kettlebells' },
  { id: 'pull_up_bar', label: 'Pull-up Bar' },
  { id: 'bench', label: 'Weight Bench' },
  { id: 'machines', label: 'Gym Machines' },
  { id: 'resistance_bands', label: 'Resistance Bands' },
];

const STEP_LABELS = [
  { number: 1, label: 'Profile', icon: User },
  { number: 2, label: 'Goal', icon: Target },
  { number: 3, label: 'Activity', icon: Activity },
  { number: 4, label: 'Preferences', icon: Sliders },
  { number: 5, label: 'Summary', icon: Sparkles },
];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<OnboardingWizardState>({
    full_name: user?.full_name || '',
    date_of_birth: '',
    gender: '',
    height_cm: '',
    weight_kg: '',
    goal_type: 'general_fitness',
    target_weight_kg: '',
    target_date: '',
    activity_level: 'moderate',
    diet_preference: 'omnivore',
    equipment: ['bodyweight'],
    medical_notes: '',
  });

  useEffect(() => {
    let isMounted = true;
    async function loadExistingData() {
      try {
        const [existingProfile, existingGoal] = await Promise.allSettled([
          getProfileApi(),
          getActiveGoalApi(),
        ]);

        if (isMounted) {
          if (existingProfile.status === 'fulfilled' && existingProfile.value) {
            const p = existingProfile.value;
            setFormData((prev) => ({
              ...prev,
              full_name: p.full_name || prev.full_name,
              date_of_birth: p.date_of_birth ? p.date_of_birth.split('T')[0] : prev.date_of_birth,
              gender: (p.gender as Gender) || prev.gender,
              height_cm: p.height_cm ? String(p.height_cm) : prev.height_cm,
              weight_kg: p.weight_kg ? String(p.weight_kg) : prev.weight_kg,
              activity_level: (p.activity_level as ActivityLevel) || prev.activity_level,
              diet_preference: (p.diet_preference as DietPreference) || prev.diet_preference,
              equipment: p.equipment && p.equipment.length > 0 ? p.equipment : prev.equipment,
              medical_notes: p.medical_notes || prev.medical_notes,
            }));
          }

          if (existingGoal.status === 'fulfilled' && existingGoal.value) {
            const g = existingGoal.value;
            setFormData((prev) => ({
              ...prev,
              goal_type: (g.goal_type as GoalType) || prev.goal_type,
              target_weight_kg: g.target_weight_kg ? String(g.target_weight_kg) : prev.target_weight_kg,
              target_date: g.target_date ? g.target_date.split('T')[0] : prev.target_date,
            }));
          }
        }
      } catch {
        // Silently ignore initial fetch errors
      }
    }
    loadExistingData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (user?.full_name) {
      setFormData((prev) => (prev.full_name ? prev : { ...prev, full_name: user.full_name || '' }));
    }
  }, [user?.full_name]);

  const updateField = (field: keyof OnboardingWizardState, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (stepErrors[field]) {
      setStepErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const toggleEquipment = (id: string) => {
    setFormData((prev) => {
      const exists = prev.equipment.includes(id);
      const updated = exists ? prev.equipment.filter((item) => item !== id) : [...prev.equipment, id];
      return { ...prev, equipment: updated };
    });
  };

  // Step Validation
  const validateStep = (currentStep: number): boolean => {
    const errors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.full_name.trim()) {
        errors.full_name = 'Full name is required';
      }

      if (!formData.height_cm.trim()) {
        errors.height_cm = 'Height in cm is required';
      } else {
        const height = parseFloat(formData.height_cm);
        if (isNaN(height) || height < 50 || height > 300) {
          errors.height_cm = 'Height must be between 50 and 300 cm';
        }
      }

      if (!formData.weight_kg.trim()) {
        errors.weight_kg = 'Current weight in kg is required';
      } else {
        const weight = parseFloat(formData.weight_kg);
        if (isNaN(weight) || weight < 30 || weight > 300) {
          errors.weight_kg = 'Current weight must be between 30 and 300 kg';
        }
      }
    }

    if (currentStep === 2) {
      if (!formData.goal_type) {
        errors.goal_type = 'Please select a primary fitness goal';
      }
      if (formData.target_weight_kg.trim()) {
        const targetW = parseFloat(formData.target_weight_kg);
        if (isNaN(targetW) || targetW < 30 || targetW > 300) {
          errors.target_weight_kg = 'Target weight must be between 30 and 300 kg';
        } else {
          const currentW = parseFloat(formData.weight_kg);
          if (!isNaN(currentW)) {
            if (
              (formData.goal_type === 'fat_loss' || formData.goal_type === 'weight_loss') &&
              targetW >= currentW
            ) {
              errors.target_weight_kg = `For fat loss, target weight (${targetW} kg) must be lower than your current weight (${currentW} kg).`;
            } else if (formData.goal_type === 'muscle_gain' && targetW < currentW) {
              errors.target_weight_kg = `For muscle gain, target weight (${targetW} kg) must be at or above your current weight (${currentW} kg).`;
            }
          }
        }
      }
    }

    if (currentStep === 3) {
      if (!formData.activity_level) {
        errors.activity_level = 'Please select your baseline activity level';
      }
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSkipStep4 = () => {
    // Optional step 4 can be skipped directly
    setStep(5);
  };

  // Final Submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      const height = parseFloat(formData.height_cm);
      const weight = parseFloat(formData.weight_kg);
      const targetWeight = formData.target_weight_kg.trim()
        ? parseFloat(formData.target_weight_kg)
        : undefined;

      // 1. Submit Goal
      await createGoalApi({
        goal_type: formData.goal_type as GoalType,
        target_weight_kg: targetWeight,
        target_date: formData.target_date || undefined,
      });

      // 2. Complete Profile Onboarding
      await completeOnboardingApi({
        full_name: formData.full_name,
        date_of_birth: formData.date_of_birth || undefined,
        gender: formData.gender ? (formData.gender as Gender) : undefined,
        height_cm: height,
        weight_kg: weight,
        activity_level: formData.activity_level as ActivityLevel,
        diet_preference: formData.diet_preference ? (formData.diet_preference as DietPreference) : undefined,
        equipment: formData.equipment.length > 0 ? formData.equipment : ['bodyweight'],
        medical_notes: formData.medical_notes.trim() ? formData.medical_notes.trim() : undefined,
      });

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setApiError(getErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  const tdeeResult = calculateTDEE({
    weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined,
    height_cm: formData.height_cm ? parseFloat(formData.height_cm) : undefined,
    date_of_birth: formData.date_of_birth,
    gender: formData.gender,
    activity_level: formData.activity_level,
  });

  return (
    <div className="min-h-screen bg-bg text-text py-8 px-4 flex justify-center items-center">
      <Card className="w-full max-w-xl p-6 sm:p-8 bg-surface border border-border shadow-sm">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-semibold text-accent tracking-wider">
              Step {step} of 5 — {STEP_LABELS[step - 1].label}
            </span>
            <span className="text-xs text-text-3 font-mono">
              {Math.round((step / 5) * 100)}% Completed
            </span>
          </div>

          {/* Progress Indicators */}
          <div className="grid grid-cols-5 gap-2">
            {STEP_LABELS.map((item) => (
              <div
                key={item.number}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= item.number ? 'bg-accent' : 'bg-surface-2'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Global Error Banner */}
        {apiError && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-lg bg-danger-soft border border-danger/30 text-danger text-sm font-medium"
          >
            {apiError}
          </div>
        )}

        {/* STEP HEADINGS */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text mb-1">
            {step === 1 && 'Personal Information'}
            {step === 2 && 'Fitness Goals'}
            {step === 3 && 'Activity & Fitness Level'}
            {step === 4 && 'Preferences & Constraints'}
            {step === 5 && 'Initial Baseline Assessment'}
          </h1>
          <p className="text-xs sm:text-sm text-text-2">
            {step === 1 && 'Your baseline metrics calibrate accurate energy and nutrition targets.'}
            {step === 2 && 'Define your objective so FitMind can design goal-aligned recommendations.'}
            {step === 3 && 'Your daily energy burn determines total maintenance calories.'}
            {step === 4 && 'Customize workout equipment and note any injuries or restrictions.'}
            {step === 5 && 'Review your calibrated metabolic baseline and get started.'}
          </p>
        </div>

        {/* STEP 1: PERSONAL INFORMATION */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <Input
              label="Full Name"
              required
              placeholder="e.g. Alex Rivera"
              value={formData.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              error={stepErrors.full_name}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="dob-input" className="text-xs font-medium text-text-2">
                Date of Birth (Optional)
              </label>
              <input
                id="dob-input"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => updateField('date_of_birth', e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <Select
              label="Gender (Optional)"
              value={formData.gender}
              onChange={(e) => updateField('gender', e.target.value as Gender)}
              options={[
                { label: 'Select Gender', value: '' },
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
                { label: 'Other', value: 'other' },
                { label: 'Prefer Not to Say', value: 'prefer_not_to_say' },
              ]}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Height (CM)"
                required
                type="number"
                placeholder="175"
                value={formData.height_cm}
                onChange={(e) => updateField('height_cm', e.target.value)}
                error={stepErrors.height_cm}
              />

              <Input
                label="Current Weight (KG)"
                required
                type="number"
                step="0.1"
                placeholder="70"
                value={formData.weight_kg}
                onChange={(e) => updateField('weight_kg', e.target.value)}
                error={stepErrors.weight_kg}
              />
            </div>
          </div>
        )}

        {/* STEP 2: FITNESS GOALS */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <Select
              label="Primary Goal"
              required
              value={formData.goal_type}
              onChange={(e) => updateField('goal_type', e.target.value as GoalType)}
              error={stepErrors.goal_type}
              options={[
                { label: 'Select Primary Goal', value: '' },
                { label: 'Weight Loss', value: 'weight_loss' },
                { label: 'Fat Loss', value: 'fat_loss' },
                { label: 'Muscle Gain', value: 'muscle_gain' },
                { label: 'Maintain Weight & Health', value: 'maintain' },
                { label: 'Endurance & Stamina', value: 'endurance' },
                { label: 'General Fitness', value: 'general_fitness' },
              ]}
            />

            <div>
              <Input
                label="Target Weight (KG) — Optional"
                type="number"
                step="0.1"
                placeholder="e.g. 68"
                value={formData.target_weight_kg}
                onChange={(e) => updateField('target_weight_kg', e.target.value)}
                error={stepErrors.target_weight_kg}
              />
              <p className="text-[11px] text-text-3 mt-1">
                {formData.goal_type === 'fat_loss' || formData.goal_type === 'weight_loss'
                  ? 'Must be lower than your current weight.'
                  : formData.goal_type === 'muscle_gain'
                  ? 'Must be at or above your current weight.'
                  : 'Optional target weight.'}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="target-date-input" className="text-xs font-medium text-text-2">
                Target Date (Optional)
              </label>
              <input
                id="target-date-input"
                type="date"
                value={formData.target_date}
                onChange={(e) => updateField('target_date', e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        )}

        {/* STEP 3: FITNESS LEVEL */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <Select
              label="Baseline Activity Level"
              required
              value={formData.activity_level}
              onChange={(e) => updateField('activity_level', e.target.value as ActivityLevel)}
              error={stepErrors.activity_level}
              options={[
                { label: 'Select Activity Level', value: '' },
                { label: 'Sedentary (Little or no exercise, desk job)', value: 'sedentary' },
                { label: 'Light (Light exercise 1-3 days/week)', value: 'light' },
                { label: 'Moderate (Moderate exercise 3-5 days/week)', value: 'moderate' },
                { label: 'Very Active (Hard exercise 6-7 days/week)', value: 'very_active' },
                { label: 'Extra Active (Very hard exercise & physical job)', value: 'extra_active' },
              ]}
            />
          </div>
        )}

        {/* STEP 4: PREFERENCES */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <Select
              label="Dietary Preference (Optional)"
              value={formData.diet_preference}
              onChange={(e) => updateField('diet_preference', e.target.value as DietPreference)}
              options={[
                { label: 'Omnivore (No restrictions)', value: 'omnivore' },
                { label: 'Vegetarian', value: 'vegetarian' },
                { label: 'Vegan', value: 'vegan' },
                { label: 'Keto', value: 'keto' },
                { label: 'Paleo', value: 'paleo' },
                { label: 'Pescatarian', value: 'pescatarian' },
                { label: 'Other', value: 'other' },
              ]}
            />

            <div>
              <label className="text-xs font-medium text-text-2 block mb-2">
                Available Equipment (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map((item) => {
                  const selected = formData.equipment.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleEquipment(item.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selected
                          ? 'bg-accent text-white border-accent'
                          : 'bg-surface-2 text-text-2 border-border hover:border-accent/40'
                      }`}
                    >
                      {selected ? '✓ ' : '+ '}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="medical-notes" className="text-xs font-medium text-text-2">
                Medical Notes / Injuries (Optional)
              </label>
              <textarea
                id="medical-notes"
                rows={3}
                placeholder="Mention any physical injuries, back pain, or medical conditions for AI safety..."
                value={formData.medical_notes}
                onChange={(e) => updateField('medical_notes', e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-md p-3 text-sm text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="text-[11px] text-text-3">
                Factored into your AI Coach workout recommendations to protect against injury.
              </p>
            </div>
          </div>
        )}

        {/* STEP 5: INITIAL ASSESSMENT (HONEST DISPLAY) */}
        {step === 5 && (
          <div className="flex flex-col gap-6">
            <div className="p-4 rounded-lg border border-accent/30 bg-accent/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs uppercase tracking-wider font-semibold text-accent">
                  Baseline Evaluation
                </span>
                <Badge variant="olive">Calibrated</Badge>
              </div>
              <p className="text-xs text-text-2 leading-relaxed">
                Your physical metrics ({tdeeResult.heightUsed} cm, {tdeeResult.weightUsed} kg) and activity level have been calibrated.
                Numeric fitness score tracking will activate after your first logged workout session.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-border bg-surface-2">
                <span className="text-[11px] uppercase tracking-wider text-text-3 block mb-1">
                  Estimated TDEE (Mifflin-St Jeor)
                </span>
                <span className="text-2xl font-bold text-text">
                  {tdeeResult.tdee} kcal/day
                </span>
                <p className="text-xs text-text-3 mt-1">
                  BMR: {tdeeResult.bmr} kcal/day (Age: {tdeeResult.ageUsed}
                  {tdeeResult.isAgeDefaulted ? ' [Default]' : ''})
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border bg-surface-2">
                <span className="text-[11px] uppercase tracking-wider text-text-3 block mb-1">
                  Primary Goal Target
                </span>
                <span className="text-lg font-bold capitalize text-text">
                  {formData.goal_type ? formData.goal_type.replace('_', ' ') : 'General Fitness'}
                </span>
                <p className="text-xs text-text-3 mt-1">
                  {formData.target_weight_kg ? `Target: ${formData.target_weight_kg} kg` : 'Target weight not specified'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-surface-2 text-xs text-text-2 flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
              <div>
                <strong className="text-text block mb-0.5">Caloric Target Derivation</strong>
                Your BMR represents the basal energy needed by your body at complete rest. FitMind applies your activity multiplier to calculate TDEE, then automatically structures your safe daily macronutrient and caloric deficit/surplus.
              </div>
            </div>
          </div>
        )}

        {/* NAVIGATION CONTROLS */}
        <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
          <div>
            {step > 1 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBack}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 4 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipStep4}
              >
                Skip Step
              </Button>
            )}

            {step < 5 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleNext}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                onClick={handleSubmit}
                icon={<Check className="w-4 h-4" />}
              >
                {isSubmitting ? 'Saving...' : 'View My Plan'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
