import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatNumber,
  formatCalories,
  formatWeight,
  formatMacro,
  formatDuration,
  formatPercent,
} from '../lib/format';

describe('Format Utilities (src/lib/format.ts)', () => {
  describe('formatDate', () => {
    it('formats a date with weekday, day, and short month by default', () => {
      // 2026-10-09 is Friday
      const d = new Date(2026, 9, 9); // Oct is month index 9
      const result = formatDate(d);
      expect(result).toBe('Fri 9 Oct');
    });

    it('formats date including year when requested', () => {
      const d = new Date(2026, 9, 9);
      const result = formatDate(d, { includeYear: true });
      expect(result).toBe('Fri 9 Oct 2026');
    });

    it('formats date without weekday when requested', () => {
      const d = new Date(2026, 9, 9);
      const result = formatDate(d, { includeWeekday: false });
      expect(result).toBe('9 Oct');
    });

    it('returns empty string for invalid date', () => {
      expect(formatDate('invalid-date')).toBe('');
      expect(formatDate('')).toBe('');
    });
  });

  describe('formatNumber', () => {
    it('formats numbers with thousands separators', () => {
      expect(formatNumber(1234)).toBe('1,234');
      expect(formatNumber(1234567)).toBe('1,234,567');
      expect(formatNumber(0)).toBe('0');
    });

    it('formats decimals correctly', () => {
      expect(formatNumber(80.56, 1)).toBe('80.6');
      expect(formatNumber(80.54, 1)).toBe('80.5');
      expect(formatNumber(80, 2)).toBe('80.00');
    });

    it('handles null/undefined safely', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
    });
  });

  describe('formatCalories', () => {
    it('rounds and formats kcal with thousands separators', () => {
      expect(formatCalories(3093.4)).toBe('3,093 kcal');
      expect(formatCalories(2685.8)).toBe('2,686 kcal');
      expect(formatCalories(0)).toBe('0 kcal');
      expect(formatCalories(null)).toBe('0 kcal');
    });
  });

  describe('formatWeight', () => {
    it('formats weight in kg to one decimal', () => {
      expect(formatWeight(80.9)).toBe('80.9 kg');
      expect(formatWeight(81)).toBe('81.0 kg');
      expect(formatWeight(0)).toBe('0.0 kg');
    });

    it('converts and formats weight in lbs', () => {
      // 80.9 kg * 2.20462 = 178.3537... -> 178.4 lbs
      expect(formatWeight(80.9, 'lbs')).toBe('178.4 lbs');
    });

    it('handles null/undefined safely', () => {
      expect(formatWeight(null)).toBe('0.0 kg');
    });
  });

  describe('formatMacro', () => {
    it('formats macro in grams with one decimal', () => {
      expect(formatMacro(162)).toBe('162.0 g');
      expect(formatMacro(178.5)).toBe('178.5 g');
      expect(formatMacro(null)).toBe('0 g');
    });
  });

  describe('formatDuration', () => {
    it('formats minutes under 1 hour', () => {
      expect(formatDuration(45)).toBe('45 min');
      expect(formatDuration(15)).toBe('15 min');
    });

    it('formats duration 1 hour or more', () => {
      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(125)).toBe('2h 5m');
    });

    it('handles zero or invalid duration', () => {
      expect(formatDuration(0)).toBe('0 min');
      expect(formatDuration(null)).toBe('0 min');
    });
  });

  describe('formatPercent', () => {
    it('formats percentages correctly', () => {
      expect(formatPercent(86.66)).toBe('87%');
      expect(formatPercent(86.66, 1)).toBe('86.7%');
      expect(formatPercent(100)).toBe('100%');
      expect(formatPercent(null)).toBe('0%');
    });
  });
});
