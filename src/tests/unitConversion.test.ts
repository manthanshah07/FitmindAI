import { describe, it, expect } from 'vitest';
import { cmToInches, inchesToCm, formatInches } from '../utils/unitConversion';

describe('Unit Conversion Helpers — Body Circumference Measurements', () => {
  it('converts centimeters to inches correctly (1 in = 2.54 cm)', () => {
    expect(cmToInches(101.6)).toBe(40.0);
    expect(cmToInches(81.28)).toBe(32.0);
    expect(cmToInches(38.1)).toBe(15.0);
    expect(cmToInches(0)).toBe(0);
    expect(cmToInches(null)).toBeUndefined();
    expect(cmToInches(undefined)).toBeUndefined();
  });

  it('converts inches to centimeters correctly', () => {
    expect(inchesToCm(40)).toBe(101.6);
    expect(inchesToCm(32)).toBe(81.28);
    expect(inchesToCm(15)).toBe(38.1);
    expect(inchesToCm(null)).toBeUndefined();
    expect(inchesToCm(undefined)).toBeUndefined();
  });

  it('formats inches text for UI cards and summaries', () => {
    expect(formatInches(101.6)).toBe('40 in');
    expect(formatInches(81.28)).toBe('32 in');
    expect(formatInches(null)).toBe('N/A');
    expect(formatInches(undefined)).toBe('N/A');
  });
});
