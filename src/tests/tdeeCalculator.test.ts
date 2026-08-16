import { describe, it, expect } from 'vitest';
import { calculateTDEE, calculateAgeFromDOB } from '../utils/tdeeCalculator';

describe('tdeeCalculator', () => {
  it('calculates age from DOB correctly', () => {
    expect(calculateAgeFromDOB('1990-01-01')).toBeGreaterThanOrEqual(35);
    expect(calculateAgeFromDOB('')).toBeNull();
    expect(calculateAgeFromDOB(null)).toBeNull();
  });

  it('calculates Mifflin-St Jeor TDEE with full user inputs', () => {
    const result = calculateTDEE({
      weight_kg: 80,
      height_cm: 180,
      age: 30,
      gender: 'male',
      activity_level: 'moderate',
    });

    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    // TDEE = 1780 * 1.55 = 2759
    expect(result.bmr).toBe(1780);
    expect(result.tdee).toBe(2759);
    expect(result.isWeightDefaulted).toBe(false);
    expect(result.isAgeDefaulted).toBe(false);
  });

  it('uses female gender offset correctly', () => {
    const result = calculateTDEE({
      weight_kg: 60,
      height_cm: 165,
      age: 25,
      gender: 'female',
      activity_level: 'sedentary',
    });

    // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 -> 1345
    // TDEE = 1345 * 1.2 = 1614
    expect(result.bmr).toBe(1345);
    expect(result.tdee).toBe(1614);
  });
});
