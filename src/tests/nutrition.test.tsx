import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { NutritionOverviewPage } from '../pages/nutrition/NutritionOverviewPage';
import { FoodLoggerPage } from '../pages/nutrition/FoodLoggerPage';
import { NutritionHistoryPage } from '../pages/nutrition/NutritionHistoryPage';
import { AppShell } from '../components/layout/AppShell';
import * as nutritionApi from '../lib/api/nutrition';

vi.mock('../lib/api/nutrition', () => ({
  getTodayNutritionSummaryApi: vi.fn(),
  getMealLogsApi: vi.fn(),
  getMealLogByIdApi: vi.fn(),
  getFoodsApi: vi.fn(),
  getFoodByIdApi: vi.fn(),
  seedFoodsApi: vi.fn(),
  logMealApi: vi.fn(),
}));

const mockFood = {
  id: 'food-1',
  name: 'Whole Wheat Roti (Chapati)',
  brand: 'Standard',
  calories_per_100g: 264.0,
  protein_per_100g: 9.2,
  carbs_per_100g: 52.0,
  fat_per_100g: 2.5,
  fiber_per_100g: 9.0,
  is_verified: true,
  created_at: new Date().toISOString(),
};

const mockSummary = {
  date: '2026-08-16',
  targets: {
    calories: 2200.0,
    protein_g: 140.0,
    carbs_g: 250.0,
    fat_g: 61.1,
  },
  consumed: {
    calories: 316.8,
    protein_g: 11.0,
    carbs_g: 62.4,
    fat_g: 3.0,
  },
  remaining: {
    calories: 1883.2,
    protein_g: 129.0,
    carbs_g: 187.6,
    fat_g: 58.1,
  },
  meals_by_type: {
    breakfast: [],
    lunch: [
      {
        id: 'log-1',
        user_id: 'u-123',
        meal_type: 'lunch' as const,
        logged_at: new Date().toISOString(),
        notes: 'Healthy lunch',
        created_at: new Date().toISOString(),
        items: [
          {
            id: 'item-1',
            meal_log_id: 'log-1',
            food_id: 'food-1',
            quantity_grams: 120,
            calculated_calories: 316.8,
            calculated_protein: 11.0,
            calculated_carbs: 62.4,
            calculated_fat: 3.0,
            food: mockFood,
          },
        ],
      },
    ],
    dinner: [],
    snack: [],
  },
};

const mockMealLog = mockSummary.meals_by_type.lunch[0];

describe('Phase 4 — Nutrition Frontend Module', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: {
        id: 'u-123',
        email: 'athlete@example.com',
        full_name: 'Athlete User',
        is_active: true,
        is_verified: false,
        created_at: new Date().toISOString(),
      },
      accessToken: 'mock_token',
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('renders Nutrition Overview Page with calorie progress and logged lunch item', async () => {
    vi.mocked(nutritionApi.seedFoodsApi).mockResolvedValueOnce([mockFood]);
    vi.mocked(nutritionApi.getTodayNutritionSummaryApi).mockResolvedValueOnce(mockSummary);

    render(
      <MemoryRouter initialEntries={['/nutrition']}>
        <AppShell>
          <NutritionOverviewPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Today's Nutrition Summary/i)).toBeInTheDocument();
    expect(screen.getAllByText(/316.8 \/ 2200/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Whole Wheat Roti \(Chapati\)/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Log Meal \+/i })).toBeInTheDocument();
  });

  it('allows selecting food, adjusting portion size, and logging a meal entry', async () => {
    vi.mocked(nutritionApi.seedFoodsApi).mockResolvedValueOnce([mockFood]);
    vi.mocked(nutritionApi.getFoodsApi).mockResolvedValue([mockFood]);
    vi.mocked(nutritionApi.logMealApi).mockResolvedValueOnce(mockMealLog);

    render(
      <MemoryRouter initialEntries={['/nutrition/log']}>
        <Routes>
          <Route path="/nutrition/log" element={<FoodLoggerPage />} />
          <Route path="/nutrition" element={<div>Nutrition Overview Target</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Log Food Entry/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Whole Wheat Roti \(Chapati\)/i).length).toBeGreaterThan(0);

    // Click Save Meal Entry
    fireEvent.click(screen.getByRole('button', { name: /Save Meal Entry ✓/i }));

    await waitFor(() => {
      expect(nutritionApi.logMealApi).toHaveBeenCalledWith(
        expect.objectContaining({
          meal_type: 'lunch',
          items: [
            expect.objectContaining({
              food_id: 'food-1',
              quantity_grams: 100,
            }),
          ],
        }),
      );
      expect(screen.getByText(/Nutrition Overview Target/i)).toBeInTheDocument();
    });
  });

  it('displays meal log history and allows inspecting itemized details', async () => {
    vi.mocked(nutritionApi.getMealLogsApi).mockResolvedValueOnce([mockMealLog]);
    vi.mocked(nutritionApi.getMealLogByIdApi).mockResolvedValueOnce(mockMealLog);

    render(
      <MemoryRouter initialEntries={['/nutrition/history']}>
        <AppShell>
          <NutritionHistoryPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Meal Log History/i)).toBeInTheDocument();
    expect(screen.getAllByText(/LUNCH/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByText(/LUNCH/i)[0]);

    await waitFor(() => {
      expect(nutritionApi.getMealLogByIdApi).toHaveBeenCalledWith('log-1');
      expect(screen.getByText(/Logged Food Items & Macro Breakdown/i)).toBeInTheDocument();
    });
  });

  it('displays empty history state when no meal logs exist', async () => {
    vi.mocked(nutritionApi.getMealLogsApi).mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/nutrition/history']}>
        <AppShell>
          <NutritionHistoryPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/No Meal Logs Recorded/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Log First Meal →/i })).toBeInTheDocument();
  });
});
