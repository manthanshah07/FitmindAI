import React, { useEffect, useState } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { getExerciseByIdApi } from '../../lib/api/workout';
import { getErrorMessage } from '../../utils/apiError';
import type { Exercise } from '../../types/workout';
import { ChevronLeft } from 'lucide-react';

export const ExerciseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadExercise() {
      if (!id) return;
      try {
        setIsLoading(true);
        setError(null);
        const data = await getExerciseByIdApi(id);
        setExercise(data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadExercise();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-border bg-surface rounded-md min-h-[300px]">
        <h3 className="text-sm font-semibold text-text animate-pulse">
          Loading exercise specification...
        </h3>
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="flex flex-col gap-4 p-8 rounded-md border border-danger/20 bg-danger-soft text-danger max-w-xl mx-auto mt-12">
        <h3 className="text-base font-semibold">Exercise Not Found</h3>
        <p className="text-xs">{error || 'The requested exercise specification could not be retrieved.'}</p>
        <NavLink to="/workouts">
          <Button variant="secondary" className="gap-1.5 w-fit">
            <ChevronLeft className="w-4 h-4" />
            Back to Workouts
          </Button>
        </NavLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title={exercise.name}
        description={`Detailed biomechanics, form execution, and equipment requirements for ${exercise.name}.`}
        action={
          <NavLink to="/workouts">
            <Button variant="secondary" className="gap-1.5">
              <ChevronLeft className="w-4 h-4" />
              Back to Workouts
            </Button>
          </NavLink>
        }
      />

      <div className="flex items-center gap-2">
        <Chip variant="accent">{exercise.primary_muscle}</Chip>
        {exercise.category && <Chip variant="neutral">{exercise.category}</Chip>}
        {exercise.difficulty && (
          <Chip variant="neutral" className="capitalize">
            {exercise.difficulty}
          </Chip>
        )}
      </div>

      {/* Grid: Primary Attributes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 flex flex-col gap-2">
          <span className="text-xs font-semibold text-text-3 uppercase tracking-wider">
            Primary Muscle Group
          </span>
          <span className="text-lg font-semibold text-text">
            {exercise.primary_muscle}
          </span>
          {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <span className="text-xs text-text-3 block mb-1.5">
                Secondary Muscles Engaged
              </span>
              <div className="flex flex-wrap gap-1.5">
                {exercise.secondary_muscles.map((muscle) => (
                  <Chip key={muscle} variant="neutral">
                    {muscle}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5 flex flex-col gap-2">
          <span className="text-xs font-semibold text-text-3 uppercase tracking-wider">
            Required Equipment
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {exercise.equipment_required && exercise.equipment_required.length > 0 ? (
              exercise.equipment_required.map((eq) => (
                <Chip key={eq} variant="accent" className="capitalize">
                  {eq.replace('_', ' ')}
                </Chip>
              ))
            ) : (
              <span className="text-sm font-medium text-text">Bodyweight Only</span>
            )}
          </div>
        </Card>
      </div>

      {/* Description */}
      {exercise.description && (
        <Card className="p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-2 mb-2">
            Overview & Biomechanics
          </h2>
          <p className="text-sm text-text leading-relaxed">{exercise.description}</p>
        </Card>
      )}

      {/* Step-by-Step Instructions */}
      {exercise.instructions && (
        <Card className="p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-2 mb-2">
            Step-by-Step Instructions
          </h2>
          <div className="text-sm text-text leading-relaxed whitespace-pre-line p-4 rounded-md bg-surface-2 border border-border">
            {exercise.instructions}
          </div>
        </Card>
      )}
    </div>
  );
};
