import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { completeOnboardingApi } from '../../lib/api/profile';
import { createGoalApi } from '../../lib/api/goals';
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
  { id: 'resistance_bands', label: 'Resistance Bands' },
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
        const weight = parseFloat(formData.target_weight_kg);
        if (isNaN(weight) || weight < 30 || weight > 300) {
          errors.target_weight_kg = 'Target weight must be between 30 and 300 kg';
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

  const handleSubmitFinal = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setApiError('Please complete all required onboarding steps.');
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    try {
      // 1. Submit Goal to backend goals API
      if (formData.goal_type) {
        await createGoalApi({
          goal_type: formData.goal_type as GoalType,
          target_weight_kg: formData.target_weight_kg ? parseFloat(formData.target_weight_kg) : undefined,
          target_date: formData.target_date || undefined,
        });
      }

      // 2. Submit Profile & complete onboarding to backend profile API
      await completeOnboardingApi({
        full_name: formData.full_name.trim(),
        date_of_birth: formData.date_of_birth || undefined,
        gender: (formData.gender as Gender) || undefined,
        height_cm: parseFloat(formData.height_cm),
        weight_kg: parseFloat(formData.weight_kg),
        activity_level: (formData.activity_level as ActivityLevel) || undefined,
        diet_preference: (formData.diet_preference as DietPreference) || undefined,
        equipment: formData.equipment.length > 0 ? formData.equipment : undefined,
        medical_notes: formData.medical_notes.trim() || undefined,
      });

      // Update local store state and navigate to dashboard
      const storeState = useAuthStore.getState();
      if (storeState.user) {
        useAuthStore.setState({
          user: { ...storeState.user, full_name: formData.full_name.trim() },
        });
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations for Step 5 Assessment using Mifflin-St Jeor formula
  const tdeeResult = calculateTDEE({
    weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined,
    height_cm: formData.height_cm ? parseFloat(formData.height_cm) : undefined,
    date_of_birth: formData.date_of_birth || undefined,
    gender: formData.gender || undefined,
    activity_level: formData.activity_level || undefined,
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 md:p-8 bg-bone">
      <Card className="max-w-2xl w-full shadow-none border-borderLine">
        {/* Step Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="olive">Step {step} of 5</Badge>
            <span className="font-mono text-xs text-faded uppercase tracking-widest font-bold">
              {step * 20}% Completed
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-borderLine h-1.5 rounded-none overflow-hidden mb-6">
            <div
              className="bg-graphite h-full transition-all duration-300 ease-out"
              style={{ width: `${step * 20}%` }}
            />
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tighter uppercase font-sans text-graphite mb-1">
            {step === 1 && 'Personal Information'}
            {step === 2 && 'Fitness Goals'}
            {step === 3 && 'Activity & Fitness Level'}
            {step === 4 && 'Preferences & Constraints'}
            {step === 5 && 'Initial Baseline Assessment'}
          </h1>
          <p className="text-sm text-charcoal font-sans">
            {step === 1 && 'Provide your biological metrics for accurate AI calibration.'}
            {step === 2 && 'Set your primary fitness target and timeline.'}
            {step === 3 && 'Estimate your baseline physical activity frequency.'}
            {step === 4 && 'Specify dietary preferences, equipment, and health considerations.'}
            {step === 5 && 'Your baseline evaluation and caloric targets have been calculated.'}
          </p>
        </div>

        {apiError && (
          <div
            className="mb-6 p-4 border border-error bg-error/5 text-error font-mono text-xs uppercase tracking-wider"
            role="alert"
          >
            {apiError}
          </div>
        )}

        {/* STEP 1: PERSONAL INFO */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <Input
              label="Full Name"
              type="text"
              placeholder="Alex Johnson"
              required
              value={formData.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              error={stepErrors.full_name}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Height (CM)"
                type="number"
                placeholder="175"
                required
                helperText="50 to 300 cm"
                value={formData.height_cm}
                onChange={(e) => updateField('height_cm', e.target.value)}
                error={stepErrors.height_cm}
              />

              <Input
                label="Current Weight (KG)"
                type="number"
                placeholder="75"
                required
                helperText="30 to 300 kg"
                value={formData.weight_kg}
                onChange={(e) => updateField('weight_kg', e.target.value)}
                error={stepErrors.weight_kg}
              />
            </div>

            <Input
              label="Date of Birth (Optional)"
              type="date"
              helperText="Used to compute age for TDEE energy expenditure calculation"
              value={formData.date_of_birth}
              onChange={(e) => updateField('date_of_birth', e.target.value)}
            />

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
          </div>
        )}

        {/* STEP 2: FITNESS GOALS */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <Select
              label="Primary Goal"
              required
              value={formData.goal_type}
              onChange={(e) => updateField('goal_type', e.target.value as GoalType)}
              error={stepErrors.goal_type}
              options={[
                { label: 'Select Primary Goal', value: '' },
                { label: 'Weight Loss', value: 'weight_loss' },
                { label: 'Muscle Gain', value: 'muscle_gain' },
                { label: 'Maintain Weight & Health', value: 'maintain' },
                { label: 'Endurance & Stamina', value: 'endurance' },
                { label: 'General Fitness', value: 'general_fitness' },
              ]}
            />

            <Input
              label="Target Weight (KG) — Optional"
              type="number"
              placeholder="70"
              value={formData.target_weight_kg}
              onChange={(e) => updateField('target_weight_kg', e.target.value)}
              error={stepErrors.target_weight_kg}
            />

            <Input
              label="Target Date — Optional"
              type="date"
              value={formData.target_date}
              onChange={(e) => updateField('target_date', e.target.value)}
            />
          </div>
        )}

        {/* STEP 3: FITNESS LEVEL */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
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
          <div className="flex flex-col gap-6">
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
              <label className="font-mono text-xs uppercase tracking-widest text-graphite font-bold mb-2 block">
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
                      className={`font-mono text-xs uppercase tracking-wider px-3.5 py-2.5 border transition-colors ${
                        selected
                          ? 'bg-graphite text-bone border-graphite'
                          : 'bg-bone text-graphite border-borderLine hover:border-graphite'
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
              <label htmlFor="medical-notes" className="font-mono text-xs uppercase tracking-widest text-graphite font-bold">
                Medical Notes / Injuries (Optional)
              </label>
              <textarea
                id="medical-notes"
                rows={3}
                placeholder="Mention any physical injuries, back pain, or medical conditions for AI safety..."
                value={formData.medical_notes}
                onChange={(e) => updateField('medical_notes', e.target.value)}
                className="w-full bg-bone border border-borderLine rounded-none p-3.5 font-sans text-sm text-graphite placeholder:text-faded focus:outline-none focus:border-graphite focus:ring-2 focus:ring-olive"
              />
            </div>
          </div>
        )}

        {/* STEP 5: INITIAL ASSESSMENT (HONEST DISPLAY) */}
        {step === 5 && (
          <div className="flex flex-col gap-6">
            <div className="p-6 border border-borderLine bg-black/5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs uppercase tracking-widest text-olive font-bold">
                  Baseline Evaluation
                </span>
                <Badge variant="olive">Ready</Badge>
              </div>
              <p className="text-xs text-charcoal leading-relaxed">
                Your physical metrics ({tdeeResult.heightUsed} cm, {tdeeResult.weightUsed} kg) and activity level have been calibrated.
                Numeric fitness score tracking will activate after your first logged workout.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 border border-borderLine">
                <span className="font-mono text-[10px] uppercase tracking-widest text-faded block mb-1">
                  Estimated TDEE (Mifflin-St Jeor)
                </span>
                <span className="font-mono text-2xl font-bold text-graphite">{tdeeResult.tdee} kcal/day</span>
                <p className="text-xs text-faded mt-1">
                  BMR: {tdeeResult.bmr} kcal/day (Age: {tdeeResult.ageUsed}
                  {tdeeResult.isAgeDefaulted ? ' [Default]' : ''})
                </p>
              </div>

              <div className="p-6 border border-borderLine">
                <span className="font-mono text-[10px] uppercase tracking-widest text-faded block mb-1">
                  Primary Goal Target
                </span>
                <span className="font-mono text-lg font-bold uppercase text-graphite">
                  {formData.goal_type ? formData.goal_type.replace('_', ' ') : 'General Fitness'}
                </span>
                <p className="text-xs text-faded mt-1">
                  {formData.target_weight_kg ? `Target: ${formData.target_weight_kg} kg` : 'Target weight not specified'}
                </p>
              </div>
            </div>

            <div className="p-6 border border-borderLine">
              <span className="font-mono text-xs uppercase tracking-widest text-graphite font-bold block mb-2">
                Routine Setup
              </span>
              <p className="text-sm text-charcoal font-sans">
                Your initial training structure will be assembled in your dashboard based on your {formData.activity_level || 'moderate'} activity level and selected equipment ({formData.equipment.join(', ')}).
              </p>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="mt-8 pt-6 border-t border-borderLine flex items-center justify-between">
          {step > 1 ? (
            <Button variant="secondary" onClick={handleBack} disabled={isSubmitting}>
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <Button variant="primary" onClick={handleNext}>
              Continue →
            </Button>
          ) : (
            <Button variant="primary" isLoading={isSubmitting} onClick={handleSubmitFinal}>
              View My Plan →
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
