import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Search, Sparkles, Clock, ListFilter } from 'lucide-react';
import { Button } from '../ui/Button';
import { NumberStepper } from '../ui/NumberStepper';
import { TextField } from '../ui/TextField';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import {
  getFoodsApi,
  getRecentFoodsApi,
  logMealApi,
  quickAddMealApi,
  seedFoodsApi,
} from '../../lib/api/nutrition';
import { formatNumber } from '../../lib/format';
import type { Food, QuickAddMealPayload } from '../../types/nutrition';

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface AddFoodSheetProps {
  isOpen: boolean;
  initialMealType?: MealCategory;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddFoodSheet: React.FC<AddFoodSheetProps> = ({
  isOpen,
  initialMealType = 'lunch',
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [mealType, setMealType] = useState<MealCategory>(initialMealType);
  const [activeTab, setActiveTab] = useState<'recent' | 'all' | 'quick'>('recent');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantityGrams, setQuantityGrams] = useState<number>(100);

  // Quick Add state
  const [quickName, setQuickName] = useState<string>('');
  const [quickCalories, setQuickCalories] = useState<string>('');
  const [quickProtein, setQuickProtein] = useState<string>('');
  const [quickCarbs, setQuickCarbs] = useState<string>('');
  const [quickFat, setQuickFat] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMealType(initialMealType);
      setSelectedFood(null);
      setSearchQuery('');
      setError(null);
      // Auto focus search field after sheet opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialMealType]);

  // Fetch recent foods
  const {
    data: recentFoods = [],
    isLoading: isRecentLoading,
  } = useQuery({
    queryKey: ['recentFoods'],
    queryFn: async () => {
      await seedFoodsApi().catch(() => {});
      return getRecentFoodsApi(20);
    },
    enabled: isOpen,
  });

  // Fetch catalog foods with search query debounce
  const {
    data: catalogFoods = [],
    isLoading: isCatalogLoading,
  } = useQuery({
    queryKey: ['catalogFoods', searchQuery],
    queryFn: () => getFoodsApi({ search: searchQuery.trim() || undefined, limit: 30 }),
    enabled: isOpen && activeTab === 'all',
  });

  if (!isOpen) return null;

  const mealLabels: Record<MealCategory, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
  };

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setQuantityGrams(100);
    setError(null);
  };

  const handleAddSelectedFood = async () => {
    if (!selectedFood) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await logMealApi({
        meal_type: mealType,
        logged_at: new Date().toISOString(),
        items: [
          {
            food_id: selectedFood.id,
            quantity_grams: quantityGrams,
          },
        ],
      });

      await queryClient.invalidateQueries({ queryKey: ['todayNutritionSummary'] });
      await queryClient.invalidateQueries({ queryKey: ['recentFoods'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add food';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cals = parseFloat(quickCalories);
    if (isNaN(cals) || cals < 0) {
      setError('Please enter a valid calorie amount');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: QuickAddMealPayload = {
        meal_type: mealType,
        calories: cals,
        protein_g: parseFloat(quickProtein) || 0,
        carbs_g: parseFloat(quickCarbs) || 0,
        fat_g: parseFloat(quickFat) || 0,
        name: quickName.trim() || 'Quick Add',
        logged_at: new Date().toISOString(),
      };

      await quickAddMealApi(payload);

      await queryClient.invalidateQueries({ queryKey: ['todayNutritionSummary'] });
      await queryClient.invalidateQueries({ queryKey: ['recentFoods'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to quick add food';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Selected food live macro calculation
  const calsPer100 = selectedFood ? Number(selectedFood.calories_per_100g) || 0 : 0;
  const protPer100 = selectedFood ? Number(selectedFood.protein_per_100g) || 0 : 0;
  const carbsPer100 = selectedFood ? Number(selectedFood.carbs_per_100g) || 0 : 0;
  const fatPer100 = selectedFood ? Number(selectedFood.fat_per_100g) || 0 : 0;

  const liveCals = Math.round((calsPer100 * quantityGrams) / 100);
  const liveProt = (Math.round(((protPer100 * quantityGrams) / 100) * 10) / 10).toFixed(1);
  const liveCarbs = (Math.round(((carbsPer100 * quantityGrams) / 100) * 10) / 10).toFixed(1);
  const liveFat = (Math.round(((fatPer100 * quantityGrams) / 100) * 10) / 10).toFixed(1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Add food to ${mealLabels[mealType]}`}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4"
    >
      <div className="w-full md:max-w-2xl bg-surface border border-border shadow-2xl rounded-t-xl md:rounded-xl flex flex-col max-h-[92dvh] md:max-h-[85dvh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-text">Add food to</span>
            {/* Meal Selector dropdown / buttons */}
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealCategory)}
              className="bg-surface-2 border border-border rounded-sm text-sm font-semibold text-accent px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close add food sheet"
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-2 hover:text-text hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar (Auto-focused) */}
        {activeTab !== 'quick' && (
          <div className="p-4 border-b border-border bg-surface">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-text-3 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search food catalog..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab === 'recent') {
                    setActiveTab('all');
                  }
                }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-surface-2 border border-border rounded-sm text-text placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 text-text-3 hover:text-text text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab Switcher: Recent | All | Quick add */}
        <div className="flex border-b border-border bg-surface-2 px-4 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('recent');
              setSelectedFood(null);
            }}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'recent'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-2 hover:text-text'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Recent
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              setSelectedFood(null);
            }}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-2 hover:text-text'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            All Foods
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('quick');
              setSelectedFood(null);
            }}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'quick'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-2 hover:text-text'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Quick Add
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="m-4 p-3 text-xs rounded-sm bg-danger/10 text-danger border border-danger/30">
            {error}
          </div>
        )}

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'recent' && (
            <div className="flex flex-col gap-2">
              {isRecentLoading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : recentFoods.length === 0 ? (
                <EmptyState
                  title="No recent foods logged"
                  description="Search from the full catalog to log your first food."
                  actionLabel="Browse all foods"
                  onAction={() => setActiveTab('all')}
                />
              ) : (
                recentFoods.map((food) => {
                  const isSelected = selectedFood?.id === food.id;
                  return (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => handleSelectFood(food)}
                      className={`w-full text-left p-3 rounded-md border transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'border-accent bg-accent/5 ring-1 ring-accent'
                          : 'border-border bg-surface hover:bg-surface-2'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-text">{food.name}</span>
                        <span className="text-xs text-text-2">
                          {food.brand ? `${food.brand} • ` : ''}P: {food.protein_per_100g}g • C:{' '}
                          {food.carbs_per_100g}g • F: {food.fat_per_100g}g
                        </span>
                      </div>
                      <span className="text-sm font-bold text-accent tabular-nums">
                        {Math.round(food.calories_per_100g)} kcal
                        <span className="text-[10px] text-text-3 font-normal block text-right">
                          / 100g
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'all' && (
            <div className="flex flex-col gap-2">
              {isCatalogLoading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : catalogFoods.length === 0 ? (
                <EmptyState
                  title="No matching foods found"
                  description="Try another search term or use Quick Add to enter calories manually."
                  actionLabel="Quick add food"
                  onAction={() => setActiveTab('quick')}
                />
              ) : (
                catalogFoods.map((food) => {
                  const isSelected = selectedFood?.id === food.id;
                  return (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => handleSelectFood(food)}
                      className={`w-full text-left p-3 rounded-md border transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'border-accent bg-accent/5 ring-1 ring-accent'
                          : 'border-border bg-surface hover:bg-surface-2'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-text">{food.name}</span>
                        <span className="text-xs text-text-2">
                          {food.brand ? `${food.brand} • ` : ''}P: {food.protein_per_100g}g • C:{' '}
                          {food.carbs_per_100g}g • F: {food.fat_per_100g}g
                        </span>
                      </div>
                      <span className="text-sm font-bold text-accent tabular-nums">
                        {Math.round(food.calories_per_100g)} kcal
                        <span className="text-[10px] text-text-3 font-normal block text-right">
                          / 100g
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'quick' && (
            <form onSubmit={handleQuickAdd} className="flex flex-col gap-4">
              <TextField
                label="Food name (optional)"
                placeholder="e.g. Home cooked biryani"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
              />

              <TextField
                label="Calories (kcal) *"
                type="number"
                placeholder="e.g. 450"
                required
                value={quickCalories}
                onChange={(e) => setQuickCalories(e.target.value)}
              />

              <div className="grid grid-cols-3 gap-3">
                <TextField
                  label="Protein (g)"
                  type="number"
                  placeholder="0"
                  value={quickProtein}
                  onChange={(e) => setQuickProtein(e.target.value)}
                />
                <TextField
                  label="Carbs (g)"
                  type="number"
                  placeholder="0"
                  value={quickCarbs}
                  onChange={(e) => setQuickCarbs(e.target.value)}
                />
                <TextField
                  label="Fat (g)"
                  type="number"
                  placeholder="0"
                  value={quickFat}
                  onChange={(e) => setQuickFat(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isSubmitting || !quickCalories}
                >
                  {isSubmitting ? 'Adding...' : `Add to ${mealLabels[mealType]}`}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Bottom Selection Stepper Panel (When food is selected from Recent or All) */}
        {selectedFood && activeTab !== 'quick' && (
          <div className="p-4 border-t border-border bg-surface-2 flex flex-col gap-3 sticky bottom-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-text-2">Selected item</span>
                <span className="text-sm font-bold text-text block truncate max-w-[220px]">
                  {selectedFood.name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-accent tabular-nums">
                  {formatNumber(liveCals)} kcal
                </span>
                <span className="text-xs text-text-2 block tabular-nums">
                  P: {liveProt}g • C: {liveCarbs}g • F: {liveFat}g
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <NumberStepper
                value={quantityGrams}
                onChange={(val) => setQuantityGrams(val)}
                min={10}
                max={2000}
                step={25}
                unit="g"
                className="flex-1"
              />

              <Button
                variant="primary"
                onClick={handleAddSelectedFood}
                disabled={isSubmitting}
                className="min-w-[140px]"
              >
                {isSubmitting ? 'Adding...' : `Add to ${mealLabels[mealType]}`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
