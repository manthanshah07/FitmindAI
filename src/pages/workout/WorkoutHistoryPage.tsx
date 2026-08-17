import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { getWorkoutLogsApi, getWorkoutLogByIdApi } from '../../lib/api/workout';
import { getErrorMessage } from '../../utils/apiError';
import type { WorkoutLog } from '../../types/workout';

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
      <div className="flex flex-col items-center justify-center p-12 border border-borderLine bg-bone min-h-[300px]">
        <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-2">
          Workout Logs History
        </span>
        <h3 className="text-xl font-bold uppercase tracking-tighter animate-pulse font-mono">
          Loading Workout History...
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
            Workout History & Analytics
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase text-graphite">
            Completed Workout Sessions
          </h1>
          <p className="text-sm text-charcoal font-sans mt-1">
            Review your past workout sessions, logged sets, weights, and exertion ratings.
          </p>
        </div>

        <NavLink to="/workout">
          <Button variant="secondary">← Back to Overview</Button>
        </NavLink>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 border border-error bg-error/5 text-error font-mono text-xs uppercase" role="alert">
          {error}
        </div>
      )}

      {/* Log History Grid / Empty State */}
      {logs.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center gap-4">
          <span className="font-mono text-xs text-olive uppercase tracking-widest">
            No Workout Logs Recorded
          </span>
          <h3 className="text-xl font-bold uppercase text-graphite font-mono">
            You haven't logged any workout sessions yet.
          </h3>
          <p className="text-xs text-charcoal max-w-md">
            Start your first live workout session to begin tracking set completion, volume, and exercise metrics.
          </p>
          <NavLink to="/workout/session">
            <Button variant="primary">Start First Workout →</Button>
          </NavLink>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Log List */}
          <div className="md:col-span-1 flex flex-col gap-3">
            <span className="font-mono text-xs font-bold uppercase text-graphite tracking-widest block mb-1">
              History Sessions ({logs.length})
            </span>
            {logs.map((log) => {
              const isSelected = selectedLog?.id === log.id;
              const dateStr = new Date(log.started_at).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => handleSelectLog(log.id)}
                  className={`p-4 text-left border transition-all ${
                    isSelected
                      ? 'border-olive bg-olive/10 font-bold'
                      : 'border-borderLine bg-bone hover:border-graphite'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase text-graphite font-bold">{dateStr}</span>
                    <Badge variant="olive">{log.logged_exercises.length} Sets</Badge>
                  </div>
                  <p className="text-xs text-charcoal mt-2 truncate">
                    {log.notes || 'Workout session'}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right Column: Selected Log Detail */}
          <div className="md:col-span-2">
            {isLoadingDetail ? (
              <Card className="p-8 text-center animate-pulse font-mono text-xs uppercase">
                Loading Session Details...
              </Card>
            ) : selectedLog ? (
              <Card className="p-6 md:p-8 flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-borderLine pb-4">
                  <div>
                    <span className="font-mono text-[10px] text-olive uppercase tracking-widest font-bold">
                      Session Detail
                    </span>
                    <h3 className="text-2xl font-bold uppercase text-graphite font-mono">
                      {new Date(selectedLog.started_at).toLocaleString()}
                    </h3>
                  </div>
                  <Badge variant="olive">
                    {selectedLog.logged_exercises.length} Sets Completed
                  </Badge>
                </div>

                {selectedLog.notes && (
                  <div>
                    <span className="font-mono text-[10px] uppercase text-faded block mb-1">
                      Session Reflection
                    </span>
                    <p className="text-xs text-graphite font-sans bg-bone/80 p-3 border border-borderLine">
                      {selectedLog.notes}
                    </p>
                  </div>
                )}

                {/* Performed Sets */}
                <div>
                  <span className="font-mono text-[10px] uppercase text-faded block mb-3 font-bold tracking-widest">
                    Logged Sets & Load Performance
                  </span>
                  <div className="flex flex-col gap-2">
                    {selectedLog.logged_exercises.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between p-3 border border-borderLine bg-bone text-xs font-mono"
                      >
                        <div className="font-bold text-graphite">
                          {item.exercise?.name || `Exercise Set #${item.set_number}`}
                        </div>
                        <div className="flex items-center gap-4 text-charcoal">
                          <span>Set {item.set_number}</span>
                          <span>{item.reps_completed || 0} reps</span>
                          <span className="font-bold text-olive">{item.weight_kg || 0} kg</span>
                          {item.rpe && <span>RPE {item.rpe}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center font-mono text-xs uppercase text-faded">
                Select a completed session on the left to view detailed set logs.
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
