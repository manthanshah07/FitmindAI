import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { NumberStepper } from '../ui/NumberStepper';
import { updateMealItemApi, deleteMealItemApi } from '../../lib/api/nutrition';
import { formatNumber } from '../../lib/format';
import type { MealLogItem } from '../../types/nutrition';

export interface EditMealItemDialogProps {
  item: MealLogItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditMealItemDialog: React.FC<EditMealItemDialogProps> = ({
  item,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [quantityGrams, setQuantityGrams] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setQuantityGrams(Number(item.quantity_grams) || 100);
      setError(null);
    }
  }, [item]);

  if (!item) return null;

  const food = item.food;
  const foodName = food?.name || 'Meal Item';
  const calsPer100 = Number(food?.calories_per_100g) || 0;
  const protPer100 = Number(food?.protein_per_100g) || 0;
  const carbsPer100 = Number(food?.carbs_per_100g) || 0;
  const fatPer100 = Number(food?.fat_per_100g) || 0;

  const liveCals = Math.round((calsPer100 * quantityGrams) / 100);
  const liveProt = (Math.round(((protPer100 * quantityGrams) / 100) * 10) / 10).toFixed(1);
  const liveCarbs = (Math.round(((carbsPer100 * quantityGrams) / 100) * 10) / 10).toFixed(1);
  const liveFat = (Math.round(((fatPer100 * quantityGrams) / 100) * 10) / 10).toFixed(1);

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await updateMealItemApi(item.id, quantityGrams);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update item';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await deleteMealItemApi(item.id);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete item';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${foodName}`}
      description="Adjust your logged portion size or remove this item from your meal."
    >
      <div className="flex flex-col gap-5 py-2">
        {error && (
          <div className="p-3 text-xs rounded-sm bg-danger/10 text-danger border border-danger/30">
            {error}
          </div>
        )}

        <NumberStepper
          label="Serving quantity"
          value={quantityGrams}
          onChange={(val) => setQuantityGrams(val)}
          min={10}
          max={2000}
          step={25}
          unit="g"
        />

        {/* Live calculated macros card */}
        <div className="p-4 rounded-md border border-border bg-surface-2 flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-text-2">Calculated calories</span>
            <span className="text-xl font-bold text-text tabular-nums">
              {formatNumber(liveCals)}{' '}
              <span className="text-xs font-normal text-text-2">kcal</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs">
            <div>
              <span className="text-text-2 block">Protein</span>
              <span className="font-semibold text-text tabular-nums">{liveProt}g</span>
            </div>
            <div>
              <span className="text-text-2 block">Carbs</span>
              <span className="font-semibold text-text tabular-nums">{liveCarbs}g</span>
            </div>
            <div>
              <span className="text-text-2 block">Fat</span>
              <span className="font-semibold text-text tabular-nums">{liveFat}g</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between w-full gap-3 pt-3 border-t border-border">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || isSubmitting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting || isDeleting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSubmitting || isDeleting}>
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
