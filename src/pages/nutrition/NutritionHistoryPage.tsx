import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { getMealLogsApi, getMealLogByIdApi } from '../../lib/api/nutrition';
import { getErrorMessage } from '../../utils/apiError';
import type { MealLog } from '../../types/nutrition';

export const NutritionHistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<MealLog | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getMealLogsApi(30, 0);
        setLogs(data);
        if (data.length > 0) {
          setSelectedLog(data[0]);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, []);

  const handleSelectLog = async (logId: string) => {
    try {
      setIsLoadingDetail(true);
      const detail = await getMealLogByIdApi(logId);
      setSelectedLog(detail);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingDetail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-border rounded-card bg-surface min-h-[300px]">
        <span className="text-xs text-accent font-medium block mb-2">
          Nutrition History Log
        </span>
        <h3 className="text-xl font-bold tracking-tight animate-pulse font-sans text-text">
          Loading Meal History...
        </h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <span className="text-xs text-accent font-semibold block mb-1">
            Nutrition Log History
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
            Meal Log History
          </h1>
          <p className="text-sm text-text-2 font-sans mt-1">
            Review past meal entries, itemized portion sizes, and computed caloric values.
          </p>
        </div>

        <NavLink to="/nutrition">
          <Button variant="secondary">← Back to Overview</Button>
        </NavLink>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 border border-danger rounded-card bg-danger/10 text-danger text-xs font-sans" role="alert">
          {error}
        </div>
      )}

      {/* Grid or Empty State */}
      {logs.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center gap-4">
          <span className="text-xs text-accent font-medium">
            No Meal Logs Recorded
          </span>
          <h3 className="text-xl font-bold text-text font-sans">
            You haven't logged any meals yet.
          </h3>
          <p className="text-xs text-text-2 max-w-md">
            Log your first meal entry to track calorie consumption against daily macro goals.
          </p>
          <NavLink to="/nutrition/log">
            <Button variant="primary">Log First Meal →</Button>
          </NavLink>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Col: History List */}
          <div className="md:col-span-1 flex flex-col gap-3">
            <span className="text-xs font-bold text-text-2 block mb-1">
              Recorded Meals ({logs.length})
            </span>
            {logs.map((log) => {
              const isSelected = selectedLog?.id === log.id;
              const dateStr = new Date(log.logged_at).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              const logCals = log.items.reduce((sum, i) => sum + i.calculated_calories, 0);

              return (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => handleSelectLog(log.id)}
                  className={`p-4 text-left border rounded-card transition-all ${
                    isSelected
                      ? 'border-accent bg-accent/10 font-bold'
                      : 'border-border bg-surface hover:border-text-3'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-text font-bold">{dateStr}</span>
                    <Badge variant="olive">{log.meal_type.toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs font-mono text-text-2">
                    <span>{log.items.length} items</span>
                    <strong className="text-accent">{logCals.toFixed(1)} kcal</strong>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Col: Selected Detail */}
          <div className="md:col-span-2">
            {isLoadingDetail ? (
              <Card className="p-8 text-center animate-pulse text-xs text-text-2">
                Loading Meal Details...
              </Card>
            ) : selectedLog ? (
              <Card className="p-6 md:p-8 flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <span className="text-xs text-accent font-semibold">
                      Meal Session Detail
                    </span>
                    <h3 className="text-2xl font-bold text-text font-sans">
                      {selectedLog.meal_type.toUpperCase()} • {new Date(selectedLog.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </h3>
                  </div>
                  <Badge variant="olive">
                    {selectedLog.items.reduce((s, i) => s + i.calculated_calories, 0).toFixed(1)} kcal
                  </Badge>
                </div>

                {selectedLog.notes && (
                  <div>
                    <span className="text-xs text-text-3 block mb-1">
                      Session Notes
                    </span>
                    <p className="text-xs text-text font-sans bg-surface-2 p-3 border border-border rounded-input">
                      {selectedLog.notes}
                    </p>
                  </div>
                )}

                {/* Items */}
                <div>
                  <span className="text-xs text-text-3 block mb-3 font-semibold">
                    Logged Food Items & Macro Breakdown
                  </span>
                  <div className="flex flex-col gap-2">
                    {selectedLog.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border border-border rounded-input bg-surface-2 text-xs font-mono"
                      >
                        <div className="font-bold text-text font-sans">
                          {item.food?.name || 'Food item'}
                        </div>
                        <div className="flex items-center gap-4 text-text-2">
                          <span>{item.quantity_grams}g</span>
                          <span>{item.calculated_protein}g P</span>
                          <span>{item.calculated_carbs}g C</span>
                          <span>{item.calculated_fat}g F</span>
                          <span className="font-bold text-accent">{item.calculated_calories} kcal</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center text-xs text-text-3">
                Select a recorded meal entry on the left to view itemized breakdown.
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
