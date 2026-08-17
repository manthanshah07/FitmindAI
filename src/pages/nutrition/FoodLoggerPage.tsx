import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { getFoodsApi, seedFoodsApi, logMealApi } from '../../lib/api/nutrition';
import { getErrorMessage } from '../../utils/apiError';
import type { Food } from '../../types/nutrition';

const MEAL_TYPE_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

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
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        setIsLoading(true);
        setError(null);
        await seedFoodsApi();
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

  // Live Calculated Macro Preview
  const previewCals = selectedFood
    ? Math.round(((selectedFood.calories_per_100g * quantityGrams) / 100) * 10) / 10
    : 0;
  const previewProt = selectedFood
    ? Math.round(((selectedFood.protein_per_100g * quantityGrams) / 100) * 10) / 10
    : 0;
  const previewCarbs = selectedFood
    ? Math.round(((selectedFood.carbs_per_100g * quantityGrams) / 100) * 10) / 10
    : 0;
  const previewFat = selectedFood
    ? Math.round(((selectedFood.fat_per_100g * quantityGrams) / 100) * 10) / 10
    : 0;

  const handleSubmitMeal = async () => {
    if (!selectedFood) {
      setError('Please select a food item from the catalog.');
      return;
    }
    if (quantityGrams <= 0) {
      setError('Quantity in grams must be greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await logMealApi({
        meal_type: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        logged_at: new Date().toISOString(),
        notes: sessionNotes || undefined,
        items: [
          {
            food_id: selectedFood.id,
            quantity_grams: quantityGrams,
          },
        ],
      });

      navigate('/nutrition', {
        state: { message: `Logged ${quantityGrams}g of ${selectedFood.name} to ${mealType}!` },
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
          Food Catalog Search
        </span>
        <h3 className="text-xl font-bold uppercase tracking-tighter animate-pulse font-mono">
          Loading Food Catalog...
        </h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderLine pb-6">
        <div>
          <span className="font-mono text-xs text-olive uppercase tracking-widest font-bold block mb-1">
            Meal Logging Station
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase text-graphite">
            Log Food Entry
          </h1>
          <p className="text-sm text-charcoal font-sans mt-1">
            Search food catalog items, adjust portion size in grams, and preview real-time nutrition macros.
          </p>
        </div>

        <NavLink to="/nutrition">
          <Button variant="secondary">← Cancel</Button>
        </NavLink>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 border border-error bg-error/5 text-error font-mono text-xs uppercase" role="alert">
          {error}
        </div>
      )}

      {/* Grid: Form & Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Col: Search & Options */}
        <Card className="p-6 flex flex-col gap-5">
          <Select
            label="Meal Category"
            options={MEAL_TYPE_OPTIONS}
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            disabled={isSubmitting}
          />

          <Input
            label="Search Food Catalog"
            placeholder="Type food name e.g. Roti, Chicken, Eggs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isSubmitting}
          />

          {/* Catalog Results List */}
          <div>
            <label className="font-mono text-xs uppercase tracking-widest text-graphite font-bold block mb-2">
              Select Catalog Item ({foods.length})
            </label>
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
              {foods.map((food) => {
                const isSelected = selectedFood?.id === food.id;
                return (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => setSelectedFood(food)}
                    className={`p-3 text-left border transition-all text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 ${
                      isSelected
                        ? 'border-olive bg-olive/10 font-bold text-graphite'
                        : 'border-borderLine bg-bone hover:border-graphite text-charcoal'
                    }`}
                  >
                    <span>{food.name}</span>
                    <Badge variant="faded">{food.calories_per_100g} kcal/100g</Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Portion Quantity (grams)"
            type="number"
            min={1}
            max={5000}
            value={quantityGrams}
            onChange={(e) => setQuantityGrams(parseFloat(e.target.value) || 0)}
            disabled={isSubmitting}
          />
        </Card>

        {/* Right Col: Live Calculated Macro Preview */}
        <Card className="p-6 flex flex-col justify-between gap-6">
          <div>
            <span className="font-mono text-[10px] text-olive uppercase tracking-widest font-bold block mb-1">
              Calculated Macro Preview
            </span>
            <h2 className="text-2xl font-bold uppercase text-graphite font-mono">
              {selectedFood ? selectedFood.name : 'Select a food'}
            </h2>
            <p className="text-xs text-charcoal font-sans mt-1">
              Portion Size: <strong className="font-mono text-graphite">{quantityGrams} grams</strong>
            </p>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-4 border border-borderLine bg-bone text-center">
                <span className="font-mono text-[10px] uppercase text-faded block">Calories</span>
                <span className="font-mono text-xl font-bold text-olive">{previewCals} <span className="text-xs text-graphite font-normal">kcal</span></span>
              </div>

              <div className="p-4 border border-borderLine bg-bone text-center">
                <span className="font-mono text-[10px] uppercase text-faded block">Protein</span>
                <span className="font-mono text-xl font-bold text-graphite">{previewProt} <span className="text-xs text-graphite font-normal">g</span></span>
              </div>

              <div className="p-4 border border-borderLine bg-bone text-center">
                <span className="font-mono text-[10px] uppercase text-faded block">Carbohydrates</span>
                <span className="font-mono text-xl font-bold text-graphite">{previewCarbs} <span className="text-xs text-graphite font-normal">g</span></span>
              </div>

              <div className="p-4 border border-borderLine bg-bone text-center">
                <span className="font-mono text-[10px] uppercase text-faded block">Fats</span>
                <span className="font-mono text-xl font-bold text-graphite">{previewFat} <span className="text-xs text-graphite font-normal">g</span></span>
              </div>
            </div>

            <div className="mt-6">
              <label className="font-mono text-xs uppercase tracking-widest text-graphite font-bold block mb-2">
                Meal Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Post-workout meal..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-bone border border-borderLine p-3 text-xs font-sans text-graphite placeholder:text-faded focus:outline-none focus:ring-2 focus:ring-olive disabled:opacity-60"
              />
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleSubmitMeal}
            isLoading={isSubmitting}
            className="w-full"
          >
            Save Meal Entry ✓
          </Button>
        </Card>
      </div>
    </div>
  );
};
