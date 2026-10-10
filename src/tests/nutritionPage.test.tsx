import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { NutritionOverviewPage } from '../pages/nutrition/NutritionOverviewPage';
import * as nutritionApi from '../lib/api/nutrition';
import type { DailyNutritionSummary, Food, MealLogItem } from '../types/nutrition';

vi.mock('../lib/api/nutrition', () => ({
  getTodayNutritionSummaryApi: vi.fn(),
  seedFoodsApi: vi.fn(),
  getFoodsApi: vi.fn(),
  getRecentFoodsApi: vi.fn(),
  logMealApi: vi.fn(),
  quickAddMealApi: vi.fn(),
  deleteMealItemApi: vi.fn(),
  deleteMealLogApi: vi.fn(),
  updateMealItemApi: vi.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithQuery = (ui: React.ReactNode) => {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const mockFoodRoti: Food = {
  id: 'f-roti-1',
  name: 'Roti (Whole Wheat Chapati)',
  brand: 'Indian Staple',
  calories_per_100g: 264.0,
  protein_per_100g: 9.2,
  carbs_per_100g: 52.0,
  fat_per_100g: 2.5,
  fiber_per_100g: 9.0,
  is_verified: true,
  created_at: new Date().toISOString(),
};

const mockFoodDal: Food = {
  id: 'f-dal-1',
  name: 'Yellow Moong Dal (Cooked)',
  brand: 'Indian Staple',
  calories_per_100g: 105.0,
  protein_per_100g: 7.0,
  carbs_per_100g: 14.5,
  fat_per_100g: 2.0,
  fiber_per_100g: 3.8,
  is_verified: true,
  created_at: new Date().toISOString(),
};

const mockMealItemRoti: MealLogItem = {
  id: 'item-roti-1',
  meal_log_id: 'log-lunch-1',
  food_id: mockFoodRoti.id,
  quantity_grams: 120,
  calculated_calories: 316.8,
  calculated_protein: 11.0,
  calculated_carbs: 62.4,
  calculated_fat: 3.0,
  food: mockFoodRoti,
};

const mockMealItemDal: MealLogItem = {
  id: 'item-dal-1',
  meal_log_id: 'log-lunch-1',
  food_id: mockFoodDal.id,
  quantity_grams: 150,
  calculated_calories: 157.5,
  calculated_protein: 10.5,
  calculated_carbs: 21.8,
  calculated_fat: 3.0,
  food: mockFoodDal,
};

const mockNutritionSummary: DailyNutritionSummary = {
  date: '2026-10-10',
  targets: {
    calories: 2000,
    protein_g: 130,
    carbs_g: 220,
    fat_g: 65,
  },
  consumed: {
    calories: 474.3,
    protein_g: 21.5,
    carbs_g: 84.2,
    fat_g: 6.0,
  },
  remaining: {
    calories: 1525.7,
    protein_g: 108.5,
    carbs_g: 135.8,
    fat_g: 59.0,
  },
  meals_by_type: {
    breakfast: [],
    lunch: [
      {
        id: 'log-lunch-1',
        user_id: 'u-user-1',
        meal_type: 'lunch',
        logged_at: '2026-10-10T13:00:00Z',
        notes: 'Lunch at home',
        created_at: '2026-10-10T13:00:00Z',
        items: [mockMealItemRoti, mockMealItemDal],
      },
    ],
    dinner: [],
    snack: [],
  },
};

describe('Milestone M5 — Nutrition Screen (NutritionOverviewPage)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: {
        id: 'u-user-1',
        email: 'user@example.com',
        full_name: 'Test Athlete',
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString(),
      },
      accessToken: 'token',
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
    vi.clearAllMocks();
    vi.mocked(nutritionApi.seedFoodsApi).mockResolvedValue([]);
    vi.mocked(nutritionApi.getTodayNutritionSummaryApi).mockResolvedValue(mockNutritionSummary);
    vi.mocked(nutritionApi.getRecentFoodsApi).mockResolvedValue([mockFoodRoti, mockFoodDal]);
    vi.mocked(nutritionApi.getFoodsApi).mockResolvedValue([mockFoodRoti, mockFoodDal]);
  });

  it('renders headline calorie balance, remaining calories, and macro progress bars', async () => {
    renderWithQuery(
      <MemoryRouter>
        <NutritionOverviewPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Calorie Balance/i)).toBeInTheDocument();
    expect(screen.getByText(/1,526/i)).toBeInTheDocument();
    expect(screen.getByText(/kcal remaining/i)).toBeInTheDocument();
    expect(screen.getByText(/474 \/ 2,000 kcal/i)).toBeInTheDocument();
    expect(screen.getByText(/21.5 \/ 130g/i)).toBeInTheDocument();
    expect(screen.getByText(/84.2 \/ 220g/i)).toBeInTheDocument();
    expect(screen.getByText(/6 \/ 65g/i)).toBeInTheDocument();
  });

  it('renders date navigation and allows navigating to previous and next days', async () => {
    renderWithQuery(
      <MemoryRouter>
        <NutritionOverviewPage />
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText(/Previous day/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Next day/i)).toBeInTheDocument();

    const prevBtn = screen.getByLabelText(/Previous day/i);
    fireEvent.click(prevBtn);

    await waitFor(() => {
      expect(nutritionApi.getTodayNutritionSummaryApi).toHaveBeenCalled();
    });
  });

  it('displays category meal cards with logged items and calorie totals', async () => {
    renderWithQuery(
      <MemoryRouter>
        <NutritionOverviewPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Lunch')).toBeInTheDocument();
    expect(screen.getByText(/474 kcal/i)).toBeInTheDocument();
    expect(screen.getByText(/Roti \(Whole Wheat Chapati\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Yellow Moong Dal \(Cooked\)/i)).toBeInTheDocument();
  });

  it('opens formula explanation modal when tapping info icon', async () => {
    renderWithQuery(
      <MemoryRouter>
        <NutritionOverviewPage />
      </MemoryRouter>,
    );

    const infoBtn = await screen.findByLabelText(/Target calculation explanation/i);
    fireEvent.click(infoBtn);

    expect(await screen.findByText(/How your targets are calculated/i)).toBeInTheDocument();
    expect(screen.getByText(/Mifflin-St Jeor equation/i)).toBeInTheDocument();
  });

  it('opens edit dialog when clicking a meal item and allows updating portion', async () => {
    vi.mocked(nutritionApi.updateMealItemApi).mockResolvedValueOnce({
      ...mockMealItemRoti,
      quantity_grams: 150,
      calculated_calories: 396.0,
    });

    renderWithQuery(
      <MemoryRouter>
        <NutritionOverviewPage />
      </MemoryRouter>,
    );

    const rotiItem = await screen.findByText(/Roti \(Whole Wheat Chapati\)/i);
    fireEvent.click(rotiItem);

    expect(await screen.findByText(/Edit Roti \(Whole Wheat Chapati\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Serving quantity/i)).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /Save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(nutritionApi.updateMealItemApi).toHaveBeenCalledWith('item-roti-1', 120);
    });
  });

  it('allows deleting a meal item from the edit dialog', async () => {
    vi.mocked(nutritionApi.deleteMealItemApi).mockResolvedValueOnce(undefined);

    renderWithQuery(
      <MemoryRouter>
        <NutritionOverviewPage />
      </MemoryRouter>,
    );

    const rotiItem = await screen.findByText(/Roti \(Whole Wheat Chapati\)/i);
    fireEvent.click(rotiItem);

    expect(await screen.findByText(/Edit Roti \(Whole Wheat Chapati\)/i)).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(nutritionApi.deleteMealItemApi).toHaveBeenCalledWith('item-roti-1');
    });
  });

  it('supports 3-tap Add Food from Recent tab in AddFoodSheet', async () => {
    vi.mocked(nutritionApi.logMealApi).mockResolvedValueOnce({
      id: 'log-new-1',
      user_id: 'u-user-1',
      meal_type: 'lunch',
      logged_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      items: [],
    });

    renderWithQuery(
      <MemoryRouter>
        <NutritionOverviewPage />
      </MemoryRouter>,
    );

    // Tap 1: Open Add Food sheet
    const addBtns = await screen.findAllByRole('button', { name: /Add food/i });
    fireEvent.click(addBtns[0]);

    const sheetDialog = await screen.findByRole('dialog', { name: /Add food to Lunch/i });
    expect(sheetDialog).toBeInTheDocument();

    // Select recent food within the sheet dialog
    const selectFoodBtn = await within(sheetDialog).findByText(/Roti \(Whole Wheat Chapati\)/i);
    fireEvent.click(selectFoodBtn);

    // Tap 2 & 3: Confirm portion and log
    const confirmAddBtn = await within(sheetDialog).findByRole('button', { name: /Add to Lunch/i });
    expect(confirmAddBtn).toBeInTheDocument();
    fireEvent.click(confirmAddBtn);

    await waitFor(() => {
      expect(nutritionApi.logMealApi).toHaveBeenCalledWith({
        meal_type: 'lunch',
        logged_at: expect.any(String),
        items: [
          {
            food_id: mockFoodRoti.id,
            quantity_grams: 100,
          },
        ],
      });
    });
  });
});
