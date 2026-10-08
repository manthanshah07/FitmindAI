import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { getFoodsApi, seedFoodsApi, logMealApi } from '../../lib/api/nutrition';
import { queryClient } from '../../lib/react-query';
import { getErrorMessage } from '../../utils/apiError';
import type { Food } from '../../types/nutrition';

const MEAL_TYPE_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

export interface DraftMealItem {
  id: string;
  food: Food;
  quantityGrams: number;
}

export const FoodLoggerPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const initialMealType =
    (location.state as { mealType?: string })?.mealType || 'lunch';

  const [mealType, setMealType] = useState<string>(initialMealType);
  const [foods, setFoods] = useState<Food[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantityGrams, setQuantityGrams] = useState<number>(100);
  const [draftItems, setDraftItems] = useState<DraftMealItem[]>([]);
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        setIsLoading(true);
        setError(null);
        await seedFoodsApi().catch(() => {});
        const data = await getFoodsApi();
        setFoods(data);
        if (data.length > 0) {
          setSelectedFood(data[0]);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadCatalog();
  }, []);

  useEffect(() => {
    async function filterFoods() {
      try {
        const data = await getFoodsApi({ search: searchQuery || undefined });
        setFoods(data);
        if (data.length > 0) {
          setSelectedFood((prev) => {
            if (prev && data.some((f) => f.id === prev.id)) {
              return prev;
            }
            return data[0];
          });
        } else {
          setSelectedFood(null);
        }
      } catch {
        // Soft error fallback
      }
    }

    const timer = setTimeout(() => {
      filterFoods();
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Live single-item preview
  const singlePreviewCals = selectedFood
    ? Math.round(((selectedFood.calories_per_100g * quantityGrams) / 100) * 10) / 10
    : 0;
  const singlePreviewProt = selectedFood
    ? Math.round(((selectedFood.protein_per_100g * quantityGrams) / 100) * 10) / 10
    : 0;
  const singlePreviewCarbs = selectedFood
    ? Math.round(((selectedFood.carbs_per_100g * quantityGrams) / 100) * 10) / 10
    : 0;
  const singlePreviewFat = selectedFood
    ? Math.round(((selectedFood.fat_per_100g * quantityGrams) / 100) * 10) / 10
    : 0;

  // Add selected food to temporary meal draft
  const handleAddToDraft = () => {
    if (!selectedFood) {
      setError('Please select a food item from the catalog.');
      return;
    }
    if (quantityGrams <= 0) {
      setError('Quantity in grams must be greater than zero.');
      return;
    }

    setError(null);
    const draftId = `${selectedFood.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setDraftItems((prev) => [
      ...prev,
      {
        id: draftId,
        food: selectedFood,
        quantityGrams,
      },
    ]);
  };

  // Remove item from draft
  const handleRemoveDraftItem = (id: string) => {
    setDraftItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Edit draft item portion size
  const handleUpdateDraftQuantity = (id: string, newGrams: number) => {
    setDraftItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantityGrams: Math.max(1, newGrams) } : item,
      ),
    );
  };

  // Aggregate macros across entire draft (or fallback to currently selected single item if draft empty)
  const isDraftEmpty = draftItems.length === 0;

  const totalCals = isDraftEmpty
    ? singlePreviewCals
    : Math.round(
        draftItems.reduce(
          (acc, item) => acc + (item.food.calories_per_100g * item.quantityGrams) / 100,
          0,
        ) * 10,
      ) / 10;

  const totalProt = isDraftEmpty
    ? singlePreviewProt
    : Math.round(
        draftItems.reduce(
          (acc, item) => acc + (item.food.protein_per_100g * item.quantityGrams) / 100,
          0,
        ) * 10,
      ) / 10;

  const totalCarbs = isDraftEmpty
    ? singlePreviewCarbs
    : Math.round(
        draftItems.reduce(
          (acc, item) => acc + (item.food.carbs_per_100g * item.quantityGrams) / 100,
          0,
        ) * 10,
      ) / 10;

  const totalFat = isDraftEmpty
    ? singlePreviewFat
    : Math.round(
        draftItems.reduce(
          (acc, item) => acc + (item.food.fat_per_100g * item.quantityGrams) / 100,
          0,
        ) * 10,
      ) / 10;

  const handleSubmitMeal = async () => {
    let itemsToSubmit: { food_id: string; quantity_grams: number }[] = [];

    if (draftItems.length > 0) {
      itemsToSubmit = draftItems.map((item) => ({
        food_id: item.food.id,
        quantity_grams: item.quantityGrams,
      }));
    } else if (selectedFood && quantityGrams > 0) {
      // Support 1-click submission for single item
      itemsToSubmit = [
        {
          food_id: selectedFood.id,
          quantity_grams: quantityGrams,
        },
      ];
    } else {
      setError('Please select a food and add it to your meal draft.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await logMealApi({
        meal_type: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        logged_at: new Date().toISOString(),
        notes: sessionNotes || undefined,
        items: itemsToSubmit,
      });

      // Invalidate nutrition query cache so overview updates immediately
      queryClient.invalidateQueries({ queryKey: ['todayNutritionSummary'] }).catch(() => {});

      const itemSummary =
        itemsToSubmit.length === 1 && selectedFood
          ? `${quantityGrams}g of ${selectedFood.name}`
          : `${itemsToSubmit.length} items`;

      navigate('/nutrition', {
        state: { message: `Logged ${itemSummary} to ${mealType}!` },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-borderLine bg-bone min-h-[400px]">
        <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-2">
          Food Catalog
        </span>
        <h3 className="text-xl font-bold uppercase tracking-tight animate-pulse font-sans">
          Loading food catalog...
        </h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderLine pb-6">
        <div>
          <span className="font-mono text-xs text-olive uppercase tracking-widest font-bold block mb-1">
            Nutrition Station
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-graphite">
            Log Food Entry
          </h1>
          <p className="text-sm text-charcoal font-sans mt-1">
            Search foods, assemble multi-item meals, and preview macro totals before saving.
          </p>
        </div>

        <NavLink to="/nutrition">
          <Button variant="secondary">← Cancel</Button>
        </NavLink>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 border border-error bg-error/5 text-error text-sm font-sans" role="alert">
          {error}
        </div>
      )}

      {/* Grid: Search & Selection on Left, Meal Draft & Totals on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Food Search & Portion */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <Card className="p-6 flex flex-col gap-5">
            <h2 className="text-lg font-bold text-graphite pb-2 border-b border-borderLine">
              1. Choose Food & Portion
            </h2>

            <Select
              label="Meal Category"
              options={MEAL_TYPE_OPTIONS}
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              disabled={isSubmitting}
            />

            <Input
              label="Search Catalog"
              placeholder="Type food name (e.g. Roti, Chicken, Egg...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSubmitting}
            />

            <div>
              <label className="text-xs uppercase tracking-wider text-graphite font-bold block mb-2 font-mono">
                Available Foods ({foods.length})
              </label>
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                {foods.length === 0 ? (
                  <p className="text-xs text-faded py-4 text-center">No foods matching query.</p>
                ) : (
                  foods.map((food) => {
                    const isSelected = selectedFood?.id === food.id;
                    return (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => setSelectedFood(food)}
                        className={`p-3 text-left border transition-all text-xs flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'border-olive bg-olive/10 font-bold text-graphite'
                            : 'border-borderLine bg-bone hover:border-graphite text-charcoal'
                        }`}
                      >
                        <span className="font-sans">{food.name}</span>
                        <Badge variant="faded">{food.calories_per_100g} kcal/100g</Badge>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-end gap-3 pt-2 border-t border-borderLine">
              <div className="flex-1 w-full">
                <Input
                  label="Portion Quantity (grams)"
                  type="number"
                  min={1}
                  max={5000}
                  value={quantityGrams}
                  onChange={(e) => setQuantityGrams(parseFloat(e.target.value) || 0)}
                  disabled={isSubmitting}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddToDraft}
                disabled={!selectedFood || isSubmitting}
                className="whitespace-nowrap w-full sm:w-auto"
              >
                + Add to Meal Draft
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Col: Meal Draft & Aggregated Macro Totals */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <Card className="p-6 flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between pb-2 border-b border-borderLine">
                <h2 className="text-lg font-bold text-graphite">
                  2. Meal Draft ({draftItems.length} {draftItems.length === 1 ? 'item' : 'items'})
                </h2>
                <Badge variant={draftItems.length > 0 ? 'olive' : 'faded'}>
                  {mealType.toUpperCase()}
                </Badge>
              </div>

              {/* Draft Items List */}
              {draftItems.length === 0 ? (
                <div className="p-4 border border-dashed border-borderLine bg-bone/50 text-center flex flex-col gap-2">
                  <p className="text-xs text-charcoal">
                    No items in draft yet.
                  </p>
                  {selectedFood && (
                    <p className="text-xs text-faded">
                      Current selection: <strong className="text-graphite">{selectedFood.name}</strong> ({quantityGrams}g).
                      Click <strong className="text-olive">"+ Add to Meal Draft"</strong> to include more items, or save directly.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {draftItems.map((item) => {
                    const itemCals = Math.round(((item.food.calories_per_100g * item.quantityGrams) / 100) * 10) / 10;
                    const itemProt = Math.round(((item.food.protein_per_100g * item.quantityGrams) / 100) * 10) / 10;
                    return (
                      <div
                        key={item.id}
                        className="p-3 border border-borderLine bg-bone flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-graphite truncate">{item.food.name}</p>
                          <p className="text-[11px] text-faded font-mono">
                            {itemCals} kcal • {itemProt}g protein
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={5000}
                            value={item.quantityGrams}
                            onChange={(e) => handleUpdateDraftQuantity(item.id, parseFloat(e.target.value) || 0)}
                            className="w-16 bg-white border border-borderLine px-2 py-1 text-xs text-center font-mono rounded"
                            title="Grams"
                          />
                          <span className="text-xs text-charcoal">g</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDraftItem(item.id)}
                            className="text-error hover:text-error/80 px-2 py-1 text-sm font-bold"
                            title="Remove item"
                            aria-label={`Remove ${item.food.name}`}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Combined Macro Summary */}
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-olive font-bold block mb-2">
                  Combined Meal Totals
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 border border-borderLine bg-bone text-center">
                    <span className="text-[10px] font-mono uppercase text-faded block">Calories</span>
                    <span className="text-lg font-bold text-olive font-mono">{totalCals} <span className="text-[10px] text-graphite font-normal">kcal</span></span>
                  </div>

                  <div className="p-3 border border-borderLine bg-bone text-center">
                    <span className="text-[10px] font-mono uppercase text-faded block">Protein</span>
                    <span className="text-lg font-bold text-graphite font-mono">{totalProt} <span className="text-[10px] font-normal">g</span></span>
                  </div>

                  <div className="p-3 border border-borderLine bg-bone text-center">
                    <span className="text-[10px] font-mono uppercase text-faded block">Carbs</span>
                    <span className="text-lg font-bold text-graphite font-mono">{totalCarbs} <span className="text-[10px] font-normal">g</span></span>
                  </div>

                  <div className="p-3 border border-borderLine bg-bone text-center">
                    <span className="text-[10px] font-mono uppercase text-faded block">Fats</span>
                    <span className="text-lg font-bold text-graphite font-mono">{totalFat} <span className="text-[10px] font-normal">g</span></span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-graphite font-bold block mb-2">
                  Meal Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Post-workout breakfast..."
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-bone border border-borderLine p-3 text-xs text-graphite placeholder:text-faded focus:outline-none focus:ring-2 focus:ring-olive disabled:opacity-60 rounded"
                />
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleSubmitMeal}
              isLoading={isSubmitting}
              className="w-full text-sm font-bold"
            >
              Save Meal Entry ✓
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
