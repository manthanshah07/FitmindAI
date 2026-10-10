/**
 * FitMind AI Standard Formatting Utilities
 * Single formatter module across all screens to ensure data consistency (Finding D5, D8).
 */

export function formatDate(
  input: string | Date | number,
  options: {
    includeWeekday?: boolean;
    includeYear?: boolean;
    monthFormat?: 'short' | 'long' | 'numeric';
  } = {},
): string {
  if (!input) return '';
  let date: Date;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;
  }
  if (isNaN(date.getTime())) return '';

  const {
    includeWeekday = true,
    includeYear = false,
    monthFormat = 'short',
  } = options;

  const weekday = includeWeekday
    ? new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date) + ' '
    : '';
  const day = date.getDate();
  const month = new Intl.DateTimeFormat('en-GB', { month: monthFormat }).format(date);
  const year = includeYear ? ` ${date.getFullYear()}` : '';

  return `${weekday}${day} ${month}${year}`.trim();
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCalories(kcal: number | null | undefined): string {
  if (kcal === null || kcal === undefined || isNaN(kcal)) return '0 kcal';
  return `${formatNumber(Math.round(kcal), 0)} kcal`;
}

export function formatWeight(
  weightKg: number | null | undefined,
  unit: 'kg' | 'lbs' = 'kg',
): string {
  if (weightKg === null || weightKg === undefined || isNaN(weightKg)) {
    return `0.0 ${unit}`;
  }
  const val = unit === 'lbs' ? weightKg * 2.20462 : weightKg;
  return `${formatNumber(val, 1)} ${unit}`;
}

export function formatMacro(grams: number | null | undefined): string {
  if (grams === null || grams === undefined || isNaN(grams)) return '0 g';
  return `${formatNumber(grams, 1)} g`;
}

export const formatGrams = formatMacro;

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes) || minutes <= 0) {
    return '0 min';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function formatPercent(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${formatNumber(value, decimals)}%`;
}

export function formatWeightByUnit(
  weightKg: number | null | undefined,
  unitSystem: 'metric' | 'imperial' = 'metric',
): string {
  if (weightKg === null || weightKg === undefined || isNaN(weightKg)) {
    return unitSystem === 'imperial' ? '0.0 lbs' : '0.0 kg';
  }
  if (unitSystem === 'imperial') {
    return `${formatNumber(weightKg * 2.20462, 1)} lbs`;
  }
  return `${formatNumber(weightKg, 1)} kg`;
}

export function formatHeightByUnit(
  heightCm: number | null | undefined,
  unitSystem: 'metric' | 'imperial' = 'metric',
): string {
  if (heightCm === null || heightCm === undefined || isNaN(heightCm) || heightCm <= 0) {
    return unitSystem === 'imperial' ? '0 ft 0 in' : '0 cm';
  }
  if (unitSystem === 'imperial') {
    const totalInches = heightCm / 2.54;
    let feet = Math.floor(totalInches / 12);
    let inches = Math.round(totalInches % 12);
    if (inches === 12) {
      feet += 1;
      inches = 0;
    }
    return `${feet} ft ${inches} in`;
  }
  return `${formatNumber(heightCm, 0)} cm`;
}

export function formatCircumferenceByUnit(
  circCm: number | null | undefined,
  unitSystem: 'metric' | 'imperial' = 'metric',
): string {
  if (circCm === null || circCm === undefined || isNaN(circCm) || circCm <= 0) {
    return unitSystem === 'imperial' ? '0.0 in' : '0.0 cm';
  }
  if (unitSystem === 'imperial') {
    return `${formatNumber(circCm / 2.54, 1)} in`;
  }
  return `${formatNumber(circCm, 1)} cm`;
}

