import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Info,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { PageHeader } from '../../components/ui/PageHeader';
import { Chip } from '../../components/ui/Chip';
import { Dialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { AddFoodSheet } from '../../components/nutrition/AddFoodSheet';
import type { MealCategory } from '../../components/nutrition/AddFoodSheet';
import { EditMealItemDialog } from '../../components/nutrition/EditMealItemDialog';
import { getTodayNutritionSummaryApi, seedFoodsApi } from '../../lib/api/nutrition';
import { formatDate, formatNumber } from '../../lib/format';
import type { MealLogItem } from '../../types/nutrition';

function toISODateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const NutritionOverviewPage: React.FC = () => {
  const queryClient = useQueryClient();

  const todayIso = toISODateString(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  // Add food sheet state
  const [isAddSheetOpen, setIsAddSheetOpen] = useState<boolean>(false);
  const [addMealType, setAddMealType] = useState<MealCategory>('lunch');

  // Edit item dialog state
  const [editingItem, setEditingItem] = useState<MealLogItem | null>(null);

  // Info modal state
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);

  const {
    data: summary,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['todayNutritionSummary', selectedDate],
    queryFn: async () => {
      await seedFoodsApi().catch(() => {});
      return getTodayNutritionSummaryApi(selectedDate);
    },
  });

  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    setSelectedDate(toISODateString(current));
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    setSelectedDate(toISODateString(current));
  };

  const handleTodayClick = () => {
    setSelectedDate(todayIso);
  };

  const openAddFoodFor = (cat: MealCategory) => {
    setAddMealType(cat);
    setIsAddSheetOpen(true);
  };

  const isToday = selectedDate === todayIso;
  const displayDate = formatDate(selectedDate);

  const mealCategories: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const categoryLabels: Record<MealCategory, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snacks',
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-16">
      {/* Page Header */}
      <PageHeader
        title="Nutrition"
        subtitle="Track daily calorie intake, macronutrients, and meals calibrated to your fitness goals."
        action={
          <Button
            variant="primary"
            onClick={() => openAddFoodFor('lunch')}
            className="hidden md:inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add food
          </Button>
        }
      />

      {/* Date Navigation Bar */}
      <Card className="p-3 flex items-center justify-between bg-surface border-border">
        <div className="flex items-center gap-1">
          <IconButton
            icon={<ChevronLeft className="w-4 h-4" />}
            aria-label="Previous day"
            variant="ghost"
            size="sm"
            onClick={handlePrevDay}
          />
          <span className="text-sm font-semibold text-text px-2 min-w-[120px] text-center">
            {displayDate}
          </span>
          <IconButton
            icon={<ChevronRight className="w-4 h-4" />}
            aria-label="Next day"
            variant="ghost"
            size="sm"
            onClick={handleNextDay}
          />
        </div>

        <div className="flex items-center gap-2">
          {!isToday && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTodayClick}
              className="text-xs"
            >
              Today
            </Button>
          )}
          <Chip variant={isToday ? 'accent' : 'neutral'}>
            {isToday ? 'Today' : selectedDate}
          </Chip>
        </div>
      </Card>

      {/* Main Content Loading / Error / Data */}
      {isLoading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Could not load nutrition summary"
          message={error instanceof Error ? error.message : 'Please check your connection and try again.'}
          onRetry={() => refetch()}
        />
      ) : summary ? (
        <>
          {/* Summary Card with Headline Calories & Macro Bars */}
          <Card className="p-6 flex flex-col gap-6 bg-surface border-border shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <span className="text-xs font-semibold text-text-2 uppercase tracking-wider block mb-1">
                  Calorie Balance
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-bold text-accent tabular-nums">
                    {formatNumber(summary.remaining.calories)}
                  </span>
                  <span className="text-sm font-medium text-text-2">kcal remaining</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs text-text-2 block">Consumed vs Target</span>
                  <span className="text-sm font-semibold text-text tabular-nums">
                    {formatNumber(summary.consumed.calories)} / {formatNumber(summary.targets.calories)} kcal
                  </span>
                </div>

                <IconButton
                  icon={<Info className="w-4 h-4" />}
                  aria-label="Target calculation explanation"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsInfoOpen(true)}
                />
              </div>
            </div>

            {/* Macro Progress Bars Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Protein */}
              <div className="p-3 rounded-md bg-surface-2 border border-border flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-text">Protein</span>
                  <span className="text-text-2 tabular-nums">
                    {summary.consumed.protein_g} / {summary.targets.protein_g}g
                  </span>
                </div>
                <ProgressBar
                  value={summary.consumed.protein_g}
                  max={Math.max(summary.targets.protein_g, 1)}
                  variant="accent"
                />
              </div>

              {/* Carbs */}
              <div className="p-3 rounded-md bg-surface-2 border border-border flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-text">Carbohydrates</span>
                  <span className="text-text-2 tabular-nums">
                    {summary.consumed.carbs_g} / {summary.targets.carbs_g}g
                  </span>
                </div>
                <ProgressBar
                  value={summary.consumed.carbs_g}
                  max={Math.max(summary.targets.carbs_g, 1)}
                  variant="carbs"
                />
              </div>

              {/* Fat */}
              <div className="p-3 rounded-md bg-surface-2 border border-border flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-text">Fats</span>
                  <span className="text-text-2 tabular-nums">
                    {summary.consumed.fat_g} / {summary.targets.fat_g}g
                  </span>
                </div>
                <ProgressBar
                  value={summary.consumed.fat_g}
                  max={Math.max(summary.targets.fat_g, 1)}
                  variant="fat"
                />
              </div>
            </div>
          </Card>

          {/* Meals Grouped by Category */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-text">Meals logged</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mealCategories.map((cat) => {
                const logs = summary.meals_by_type[cat] || [];
                const allItems = logs.flatMap((l) => l.items);
                const subtotalCals = allItems.reduce(
                  (sum, it) => sum + Number(it.calculated_calories || 0),
                  0,
                );

                return (
                  <Card key={cat} className="p-4 flex flex-col justify-between gap-4 border-border bg-surface">
                    <div>
                      {/* Category Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-text">
                            {categoryLabels[cat]}
                          </h3>
                          <Chip variant="neutral">
                            {allItems.length} {allItems.length === 1 ? 'item' : 'items'}
                          </Chip>
                        </div>

                        <span className="text-xs font-bold text-accent tabular-nums">
                          {formatNumber(Math.round(subtotalCals))} kcal
                        </span>
                      </div>

                      {/* Items List */}
                      <div className="mt-3 flex flex-col gap-1.5">
                        {allItems.length === 0 ? (
                          <p className="text-xs text-text-3 py-2 italic">
                            No foods logged yet. Add your first food.
                          </p>
                        ) : (
                          allItems.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setEditingItem(item)}
                              aria-label={`Edit ${item.food?.name || 'item'}`}
                              className="w-full text-left p-2.5 rounded-sm bg-surface-2 border border-border/70 hover:border-accent hover:bg-surface-3 transition-colors flex items-center justify-between text-xs group"
                            >
                              <div className="flex flex-col truncate pr-2">
                                <span className="font-semibold text-text truncate group-hover:text-accent">
                                  {item.food?.name || 'Food item'}
                                </span>
                                <span className="text-[11px] text-text-2 tabular-nums">
                                  {Math.round(item.quantity_grams)}g • P: {item.calculated_protein}g • C: {item.calculated_carbs}g • F: {item.calculated_fat}g
                                </span>
                              </div>

                              <span className="font-bold text-text tabular-nums whitespace-nowrap">
                                {Math.round(item.calculated_calories)} kcal
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Add to Category CTA */}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openAddFoodFor(cat)}
                      className="w-full text-xs"
                    >
                      + Add to {categoryLabels[cat]}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {/* Floating Action Button on Mobile */}
      <div className="md:hidden fixed bottom-20 right-4 z-40">
        <Button
          variant="primary"
          onClick={() => openAddFoodFor('lunch')}
          className="rounded-full shadow-float h-12 px-5 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add food
        </Button>
      </div>

      {/* Full-screen / Modal Add Food Sheet */}
      <AddFoodSheet
        isOpen={isAddSheetOpen}
        initialMealType={addMealType}
        onClose={() => setIsAddSheetOpen(false)}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['todayNutritionSummary'] });
        }}
      />

      {/* Edit / Delete Meal Item Dialog */}
      <EditMealItemDialog
        item={editingItem}
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['todayNutritionSummary'] });
        }}
      />

      {/* Target Calculation Formula Popover Dialog */}
      <Dialog
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="How your targets are calculated"
        description="FitMind AI calculates your daily targets server-side using clinical metabolic formulas."
        primaryAction={{
          label: 'Close',
          onClick: () => setIsInfoOpen(false),
          variant: 'secondary',
        }}
      >
        <div className="flex flex-col gap-4 text-xs text-text-2 leading-relaxed">
          <div>
            <h4 className="font-semibold text-text text-sm mb-1">
              1. Basal Metabolic Rate (BMR)
            </h4>
            <p>
              Calculated using the Mifflin-St Jeor equation from your current weight, height, age, and biological sex.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-text text-sm mb-1">
              2. Total Daily Energy Expenditure (TDEE)
            </h4>
            <p>
              Your BMR is multiplied by your self-reported activity level factor (Sedentary, Light, Moderate, Active, or Extra Active).
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-text text-sm mb-1">
              3. Goal Adjustment & Macronutrient Distribution
            </h4>
            <p>
              Based on your active fitness goal:
            </p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><strong>Muscle Gain:</strong> TDEE + 300 kcal (Protein: 2.0g per kg of bodyweight).</li>
              <li><strong>Weight Loss:</strong> TDEE − 500 kcal (Protein: 2.2g per kg of bodyweight).</li>
              <li><strong>Maintain / General:</strong> TDEE (Protein: 1.6g per kg of bodyweight).</li>
            </ul>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
