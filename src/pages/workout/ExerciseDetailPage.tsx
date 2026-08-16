import React, { useEffect, useState } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { getExerciseByIdApi } from '../../lib/api/workout';
import { getErrorMessage } from '../../utils/apiError';
import type { Exercise } from '../../types/workout';

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
      <div className="flex flex-col items-center justify-center p-12 border border-borderLine bg-bone min-h-[300px]">
        <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-2">
          FitMind Exercise Catalog
        </span>
        <h3 className="text-xl font-bold uppercase tracking-tighter animate-pulse font-mono">
          Loading Exercise Specification...
        </h3>
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="flex flex-col gap-4 p-8 border border-error bg-error/5 text-error">
        <h3 className="font-mono text-lg font-bold uppercase">Exercise Not Found</h3>
        <p className="text-xs font-sans">{error || 'The requested exercise specification could not be retrieved.'}</p>
        <NavLink to="/workout">
          <Button variant="secondary">← Back to Workouts</Button>
        </NavLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderLine pb-6">
        <div>
          <span className="font-mono text-xs text-olive uppercase tracking-widest font-bold block mb-1">
            Exercise Catalog Specification
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase text-graphite">
            {exercise.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="olive">{exercise.primary_muscle}</Badge>
            {exercise.category && <Badge variant="faded">{exercise.category}</Badge>}
            {exercise.difficulty && (
              <Badge variant="faded">
                {exercise.difficulty.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        <NavLink to="/workout">
          <Button variant="secondary">← Back to Overview</Button>
        </NavLink>
      </div>

      {/* Grid: Primary Attributes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <span className="font-mono text-[10px] uppercase tracking-widest text-faded block mb-2">
            Primary Muscle Group
          </span>
          <span className="font-mono text-xl font-bold text-graphite block">
            {exercise.primary_muscle}
          </span>
          {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
            <div className="mt-4 pt-4 border-t border-borderLine">
              <span className="font-mono text-[10px] uppercase tracking-widest text-faded block mb-2">
                Secondary Muscles Engaged
              </span>
              <div className="flex flex-wrap gap-1.5">
                {exercise.secondary_muscles.map((muscle) => (
                  <Badge key={muscle} variant="faded">
                    {muscle}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <span className="font-mono text-[10px] uppercase tracking-widest text-faded block mb-2">
            Required Training Equipment
          </span>
          <div className="flex flex-wrap gap-2 mt-1">
            {exercise.equipment_required && exercise.equipment_required.length > 0 ? (
              exercise.equipment_required.map((eq) => (
                <Badge key={eq} variant="olive">
                  {eq.replace('_', ' ')}
                </Badge>
              ))
            ) : (
              <span className="font-mono text-sm text-graphite font-bold">Bodyweight Only</span>
            )}
          </div>
        </Card>
      </div>

      {/* Description */}
      {exercise.description && (
        <Card className="p-6">
          <h2 className="text-sm font-mono uppercase font-bold text-graphite tracking-widest mb-3">
            Overview & Biomechanics
          </h2>
          <p className="text-sm text-charcoal font-sans leading-relaxed">{exercise.description}</p>
        </Card>
      )}

      {/* Step-by-Step Instructions */}
      {exercise.instructions && (
        <Card className="p-6">
          <h2 className="text-sm font-mono uppercase font-bold text-graphite tracking-widest mb-3">
            Execution Instructions
          </h2>
          <div className="text-sm text-charcoal font-sans whitespace-pre-line leading-relaxed">
            {exercise.instructions}
          </div>
        </Card>
      )}
    </div>
  );
};
