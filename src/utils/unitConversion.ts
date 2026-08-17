/**
 * Unit conversion helper utilities for body measurements.
 * 
 * Canonical Database Storage:
 * - Circumference measurements (chest, waist, hips, bicep, thigh) are stored as centimeters (cm) in DB.
 * - Displayed to users as Inches (in) across forms, logs, and summary cards.
 * - 1 inch = 2.54 centimeters.
 * - Weight is stored and displayed as Kilograms (kg).
 * - Height is stored and displayed as Centimeters (cm).
 */

export const cmToInches = (cm: number | null | undefined): number | undefined => {
  if (cm === null || cm === undefined || isNaN(cm)) return undefined;
  return Math.round((cm / 2.54) * 10) / 10;
};

export const inchesToCm = (inches: number | null | undefined): number | undefined => {
  if (inches === null || inches === undefined || isNaN(inches)) return undefined;
  return Math.round(inches * 2.54 * 100) / 100;
};

export const formatInches = (cm: number | null | undefined): string => {
  const inches = cmToInches(cm);
  if (inches === undefined) return 'N/A';
  return `${inches} in`;
};
