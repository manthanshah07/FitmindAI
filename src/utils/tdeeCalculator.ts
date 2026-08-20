/**
 * PREVIEW ONLY:
 * Used for instant TDEE/BMR feedback during the onboarding wizard.
 * Backend calculations (tdee_calculator.py) are authoritative for persisted/user-facing values.
 */

export interface TDEECalculationInput {
  weight_kg?: number | null;
  height_cm?: number | null;
  date_of_birth?: string | null;
  age?: number | null;
  gender?: string | null;
  activity_level?: string | null;
}

export interface TDEECalculationResult {
  bmr: number;
  tdee: number;
  ageUsed: number;
  weightUsed: number;
  heightUsed: number;
  isAgeDefaulted: boolean;
  isWeightDefaulted: boolean;
}

export function calculateAgeFromDOB(dobString?: string | null): number | null {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 && age <= 120 ? age : null;
}

export function calculateTDEE(input: TDEECalculationInput): TDEECalculationResult {
  const heightUsed = input.height_cm && input.height_cm > 0 ? input.height_cm : 175;

  let weightUsed = 70;
  let isWeightDefaulted = true;
  if (input.weight_kg && input.weight_kg > 0) {
    weightUsed = input.weight_kg;
    isWeightDefaulted = false;
  }

  let ageUsed = 25;
  let isAgeDefaulted = true;
  if (input.age && input.age > 0) {
    ageUsed = input.age;
    isAgeDefaulted = false;
  } else if (input.date_of_birth) {
    const computedAge = calculateAgeFromDOB(input.date_of_birth);
    if (computedAge !== null) {
      ageUsed = computedAge;
      isAgeDefaulted = false;
    }
  }

  let genderOffset = -78; // Neutral average between +5 (male) and -161 (female)
  if (input.gender === 'male') {
    genderOffset = 5;
  } else if (input.gender === 'female') {
    genderOffset = -161;
  }

  // Mifflin-St Jeor BMR equation
  const bmr = Math.round(10 * weightUsed + 6.25 * heightUsed - 5 * ageUsed + genderOffset);

  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };

  const multiplier = activityMultipliers[input.activity_level || 'moderate'] || 1.55;
  const tdee = Math.round(bmr * multiplier);

  return {
    bmr,
    tdee,
    ageUsed,
    weightUsed,
    heightUsed,
    isAgeDefaulted,
    isWeightDefaulted,
  };
}
