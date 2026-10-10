import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { getWorkoutLogsApi, getWorkoutLogByIdApi } from '../../lib/api/workout';
import { getErrorMessage } from '../../utils/apiError';
import { formatDuration } from '../../lib/format';
import type { WorkoutLog } from '../../types/workout';
import { Award, ChevronLeft } from 'lucide-react';

export const WorkoutHistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getWorkoutLogsApi(30, 0);
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
      const detail = await getWorkoutLogByIdApi(logId);
      setSelectedLog(detail);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingDetail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-border bg-surface rounded-md min-h-[300px]">
        <h3 className="text-sm font-semibold text-text animate-pulse">
          Loading workout history...
        </h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Workout History"
        description="Review all recorded workout sessions, volume calculations, and personal records."
        action={
          <NavLink to="/workouts">
            <Button variant="secondary" className="gap-1.5">
              <ChevronLeft className="w-4 h-4" />
              Back to Workouts
            </Button>
          </NavLink>
        }
      />

      {error && (
        <div className="p-4 rounded-md bg-danger-soft text-danger border border-danger/20 text-sm">
          {error}
        </div>
      )}

      {logs.length === 0 ? (
        <EmptyState
          title="No Workout Logs Yet"
          description="You haven't logged any workout sessions yet. Start a session to track exercises, sets, and progress."
          actionLabel="Start a Workout"
          onAction={() => {}}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Log List */}
          <div className="md:col-span-1 flex flex-col gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-3 px-1">
              Sessions ({logs.length})
            </span>
            {logs.map((log) => {
              const isSelected = selectedLog?.id === log.id;
              const dateStr = new Date(log.started_at).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              const prCount = log.logged_exercises.filter((le) => le.is_personal_record).length;

              return (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => handleSelectLog(log.id)}
                  className={`p-3.5 text-left rounded-md border transition-all ${
                    isSelected
                      ? 'border-accent bg-accent-soft text-text ring-1 ring-accent'
                      : 'border-border bg-surface hover:border-text-3/50 text-text-2'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-text">{dateStr}</span>
                    {prCount > 0 && (
                      <Chip variant="warning" className="text-[10px] py-0 px-1.5">
                        {prCount} PR
                      </Chip>
                    )}
                  </div>
                  <p className="text-xs text-text-2 mt-1 truncate">
                    {log.name || log.notes || 'Workout session'}
                  </p>
                  <div className="text-[11px] text-text-3 mt-1.5 font-mono">
                    {log.total_volume_kg ? `${log.total_volume_kg}kg` : ''} • {log.duration_seconds ? formatDuration(log.duration_seconds) : `${log.logged_exercises.length} sets`}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Selected Log Detail */}
          <div className="md:col-span-2">
            {isLoadingDetail ? (
              <Card className="p-8 text-center text-xs text-text-2 animate-pulse">
                Loading session details...
              </Card>
            ) : selectedLog ? (
              <Card className="p-6 flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-text">
                      {selectedLog.name || 'Workout Session'}
                    </h3>
                    <p className="text-xs text-text-2 mt-0.5">
                      {new Date(selectedLog.started_at).toLocaleString(undefined, {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip variant="accent">
                      {selectedLog.total_sets_completed ?? selectedLog.logged_exercises.length} Sets
                    </Chip>
                    {selectedLog.total_volume_kg && (
                      <Chip variant="neutral">{selectedLog.total_volume_kg} kg volume</Chip>
                    )}
                  </div>
                </div>

                {selectedLog.notes && (
                  <div className="p-3 rounded-md bg-surface-2 border border-border text-xs text-text">
                    <span className="font-semibold block mb-0.5 text-text-2">Notes</span>
                    "{selectedLog.notes}"
                  </div>
                )}

                {/* Performed Sets */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-2 mb-3">
                    Completed Sets & Performance
                  </h4>
                  <div className="flex flex-col gap-2">
                    {selectedLog.logged_exercises.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between p-3 rounded-sm border border-border bg-surface-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text">
                            {item.exercise?.name || `Exercise Set #${item.set_number}`}
                          </span>
                          <span className="text-text-3 font-mono">Set {item.set_number}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-text font-medium">
                            {item.weight_kg ?? 0}kg × {item.reps_completed ?? 0} reps
                          </span>
                          {item.rpe && (
                            <span className="text-text-3 font-mono">RPE {item.rpe}</span>
                          )}
                          {item.is_personal_record && (
                            <Chip variant="warning" className="gap-1 py-0 px-1.5 text-[10px]">
                              <Award className="w-3 h-3" /> PR
                            </Chip>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center text-xs text-text-3">
                Select a completed session to view set details.
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
