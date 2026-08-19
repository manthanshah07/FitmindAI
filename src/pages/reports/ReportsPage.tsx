import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { getWeeklyReportApi, getMonthlyReportApi } from '../../lib/api/reports';
import { getErrorMessage } from '../../utils/apiError';
import type { FitnessReportResponse } from '../../types/reports';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [report, setReport] = useState<FitnessReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadReport() {
      setIsLoading(true);
      setErrorBanner(null);
      try {
        const data =
          reportType === 'weekly'
            ? await getWeeklyReportApi()
            : await getMonthlyReportApi();
        if (isMounted) {
          setReport(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorBanner(getErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      isMounted = false;
    };
  }, [reportType]);

  const renderAdherenceBadge = (label?: string | null) => {
    switch (label?.toLowerCase()) {
      case 'high':
        return <Badge variant="olive">HIGH ADHERENCE</Badge>;
      case 'moderate':
        return <Badge variant="graphite">MODERATE ADHERENCE</Badge>;
      case 'low':
        return <Badge variant="error">LOW ADHERENCE</Badge>;
      default:
        return <Badge variant="faded">INSUFFICIENT DATA</Badge>;
    }
  };

  const renderTrendBadge = (trend?: string | null) => {
    switch (trend) {
      case 'improving':
        return <Badge variant="olive">IMPROVING ↑</Badge>;
      case 'declining':
        return <Badge variant="error">DECLINING ↓</Badge>;
      case 'stable':
      default:
        return <Badge variant="graphite">STABLE ↔</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="border border-borderLine p-6 md:p-8 bg-bone">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-1 font-bold">
              PERFORMANCE ARCHIVE & ANALYTICS
            </span>
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter text-graphite">
              Progress Reports
            </h1>
            <p className="text-sm text-charcoal mt-1">
              Deterministic performance analysis summarizing workouts, nutrition, measurements, and fitness score trends.
            </p>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex items-center border border-borderLine p-1 bg-black/5 shrink-0">
            <button
              type="button"
              onClick={() => setReportType('weekly')}
              className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-colors ${
                reportType === 'weekly'
                  ? 'bg-graphite text-bone'
                  : 'text-graphite hover:bg-black/5'
              }`}
            >
              WEEKLY (7-DAY)
            </button>
            <button
              type="button"
              onClick={() => setReportType('monthly')}
              className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-colors ${
                reportType === 'monthly'
                  ? 'bg-graphite text-bone'
                  : 'text-graphite hover:bg-black/5'
              }`}
            >
              MONTHLY (CALENDAR)
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorBanner && (
        <div className="p-4 border border-error bg-error/5 text-error text-xs font-mono uppercase tracking-wider font-bold">
          ⚠️ {errorBanner}
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-24 text-center border border-borderLine bg-bone space-y-3">
          <span className="font-mono text-xs text-olive uppercase tracking-widest animate-pulse font-bold block">
            Calculating deterministic report metrics...
          </span>
        </div>
      ) : !report ? (
        <div className="py-16 text-center border border-borderLine bg-bone">
          <p className="text-sm text-charcoal">Report unavailable at this time.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview & Adherence Card */}
          <Card variant="default" className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-borderLine pb-4 gap-3">
              <div>
                <span className="font-mono text-xs text-olive uppercase tracking-widest font-bold block">
                  {report.report_type.toUpperCase()} SUMMARY
                </span>
                <h2 className="text-xl font-bold uppercase tracking-tight text-graphite">
                  {report.headline}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {renderAdherenceBadge(report.adherence_label)}
                {report.adherence_score !== null && report.adherence_score !== undefined && (
                  <span className="font-mono text-xl font-bold text-graphite">
                    {report.adherence_score}%
                  </span>
                )}
              </div>
            </div>

            {/* Key Deterministic Facts */}
            <div className="space-y-3">
              <span className="font-mono text-xs text-graphite font-bold uppercase tracking-widest block">
                KEY PERFORMANCE HIGHLIGHTS
              </span>
              <div className="grid grid-cols-1 gap-2">
                {report.summary_facts.map((fact, idx) => (
                  <div
                    key={idx}
                    className="p-3 border border-borderLine bg-black/5 flex items-start gap-3 text-xs text-graphite font-sans"
                  >
                    <span className="font-mono text-olive font-bold">✓</span>
                    <span>{fact}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Workouts Card */}
            <Card variant="default" className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-borderLine pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏋️</span>
                  <h3 className="font-bold text-sm uppercase tracking-tight text-graphite">
                    Workout Performance
                  </h3>
                </div>
                {report.workouts.has_data && (
                  <Badge variant="olive">{report.workouts.workouts_completed} SESSIONS</Badge>
                )}
              </div>

              {report.workouts.has_data ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border border-borderLine bg-black/5">
                      <span className="font-mono text-[10px] text-faded uppercase tracking-widest block">
                        COMPLETED / TARGET
                      </span>
                      <span className="font-mono text-lg font-bold text-graphite">
                        {report.workouts.workouts_completed} / {report.workouts.target_workouts || '-'}
                      </span>
                    </div>

                    <div className="p-3 border border-borderLine bg-black/5">
                      <span className="font-mono text-[10px] text-faded uppercase tracking-widest block">
                        COMPLETION RATE
                      </span>
                      <span className="font-mono text-lg font-bold text-olive">
                        {report.workouts.completion_rate_pct !== null && report.workouts.completion_rate_pct !== undefined
                          ? `${report.workouts.completion_rate_pct}%`
                          : '-'}
                      </span>
                    </div>

                    <div className="p-3 border border-borderLine bg-black/5">
                      <span className="font-mono text-[10px] text-faded uppercase tracking-widest block">
                        TOTAL DURATION
                      </span>
                      <span className="font-mono text-sm font-bold text-graphite">
                        {report.workouts.total_duration_minutes !== null && report.workouts.total_duration_minutes !== undefined
                          ? `${report.workouts.total_duration_minutes} mins`
                          : '-'}
                      </span>
                    </div>

                    <div className="p-3 border border-borderLine bg-black/5">
                      <span className="font-mono text-[10px] text-faded uppercase tracking-widest block">
                        TOTAL SETS
                      </span>
                      <span className="font-mono text-sm font-bold text-graphite">
                        {report.workouts.total_sets_completed || 0} sets
                      </span>
                    </div>
                  </div>

                  {report.workouts.most_frequent_muscles.length > 0 && (
                    <div className="pt-2 border-t border-borderLine">
                      <span className="font-mono text-[10px] text-faded uppercase tracking-widest block mb-2">
                        TARGETED MUSCLE GROUPS
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {report.workouts.most_frequent_muscles.map((muscle, idx) => (
                          <Badge key={idx} variant="graphite">
                            {muscle}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center bg-black/5 border border-borderLine">
                  <p className="text-xs font-mono text-faded uppercase">
                    Not enough workout data for this period.
                  </p>
                </div>
              )}
            </Card>

            {/* Nutrition Card */}
            <Card variant="default" className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-borderLine pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥗</span>
                  <h3 className="font-bold text-sm uppercase tracking-tight text-graphite">
                    Nutrition Adherence
                  </h3>
                </div>
                {report.nutrition.has_data && (
                  <Badge variant="olive">
                    {report.nutrition.logged_days_count}/{report.nutrition.total_days_in_period} DAYS
                  </Badge>
                )}
              </div>

              {report.nutrition.has_data ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border border-borderLine bg-black/5">
                      <span className="font-mono text-[10px] text-faded uppercase tracking-widest block">
                        AVG CALORIES / DAY
                      </span>
                      <span className="font-mono text-lg font-bold text-graphite">
                        {report.nutrition.average_calories_per_logged_day || '-'}
                      </span>
                      <span className="font-mono text-[10px] text-olive block mt-0.5">
                        Target: {report.nutrition.target_calories || '-'} kcal
                      </span>
                    </div>

                    <div className="p-3 border border-borderLine bg-black/5">
                      <span className="font-mono text-[10px] text-faded uppercase tracking-widest block">
                        AVG PROTEIN / DAY
                      </span>
                      <span className="font-mono text-lg font-bold text-graphite">
                        {report.nutrition.average_protein_per_logged_day ? `${report.nutrition.average_protein_per_logged_day}g` : '-'}
                      </span>
                      <span className="font-mono text-[10px] text-olive block mt-0.5">
                        Target: {report.nutrition.target_protein_g || '-'}g
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-borderLine">
                    <div>
                      <span className="font-mono text-[10px] text-faded uppercase tracking-widest block">
                        CALORIE ADHERENCE
                      </span>
                      <span className="font-mono text-sm font-bold text-graphite">
                        {report.nutrition.calorie_adherence_pct !== null && report.nutrition.calorie_adherence_pct !== undefined
                          ? `${report.nutrition.calorie_adherence_pct}%`
                          : '-'}
                      </span>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] text-faded uppercase tracking-widest block">
                        PROTEIN ADHERENCE
                      </span>
                      <span className="font-mono text-sm font-bold text-graphite">
                        {report.nutrition.protein_adherence_pct !== null && report.nutrition.protein_adherence_pct !== undefined
                          ? `${report.nutrition.protein_adherence_pct}%`
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center bg-black/5 border border-borderLine">
                  <p className="text-xs font-mono text-faded uppercase">
                    No nutrition logs recorded for this period.
                  </p>
                </div>
              )}
            </Card>

            {/* Progress & Measurements Card */}
            <Card variant="default" className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-borderLine pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📏</span>
                  <h3 className="font-bold text-sm uppercase tracking-tight text-graphite">
                    Measurements & Body Comp
                  </h3>
                </div>
                {report.progress.has_data && (
                  <Badge variant="graphite">{report.progress.measurement_count} LOGS</Badge>
                )}
              </div>

              {report.progress.starting_weight_kg !== null || report.progress.ending_weight_kg !== null ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 border border-borderLine bg-black/5">
                      <span className="font-mono text-[10px] text-faded uppercase tracking-widest block">
                        START WEIGHT
                      </span>
                      <span className="font-mono text-base font-bold text-graphite">
                        {report.progress.starting_weight_kg !== null && report.progress.starting_weight_kg !== undefined
                          ? `${report.progress.starting_weight_kg} kg`
                          : '-'}
                      </span>
                    </div>

                    <div className="p-3 border border-borderLine bg-black/5">
                      <span className="font-mono text-[10px] text-faded uppercase tracking-widest block">
                        END WEIGHT
                      </span>
                      <span className="font-mono text-base font-bold text-graphite">
                        {report.progress.ending_weight_kg !== null && report.progress.ending_weight_kg !== undefined
                          ? `${report.progress.ending_weight_kg} kg`
                          : '-'}
                      </span>
                    </div>

                    <div className="p-3 border border-borderLine bg-black/5">
                      <span className="font-mono text-[10px] text-faded uppercase tracking-widest block">
                        NET CHANGE
                      </span>
                      <span className="font-mono text-base font-bold text-olive">
                        {report.progress.weight_change_kg !== null && report.progress.weight_change_kg !== undefined
                          ? `${report.progress.weight_change_kg > 0 ? '+' : ''}${report.progress.weight_change_kg} kg`
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center bg-black/5 border border-borderLine">
                  <p className="text-xs font-mono text-faded uppercase">
                    No measurements recorded for this period.
                  </p>
                </div>
              )}
            </Card>

            {/* Fitness Score Card */}
            <Card variant="default" className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-borderLine pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <h3 className="font-bold text-sm uppercase tracking-tight text-graphite">
                    Fitness Score Trend
                  </h3>
                </div>
                {renderTrendBadge(report.fitness_score.trend)}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 border border-borderLine bg-black/5">
                  <span className="font-mono text-[10px] text-faded uppercase tracking-widest block">
                    START SCORE
                  </span>
                  <span className="font-mono text-xl font-bold text-graphite">
                    {report.fitness_score.starting_score ?? '-'}
                  </span>
                </div>

                <div className="p-3 border border-borderLine bg-black/5">
                  <span className="font-mono text-[10px] text-faded uppercase tracking-widest block">
                    END SCORE
                  </span>
                  <span className="font-mono text-xl font-bold text-graphite">
                    {report.fitness_score.ending_score ?? '-'}
                  </span>
                </div>

                <div className="p-3 border border-borderLine bg-black/5">
                  <span className="font-mono text-[10px] text-faded uppercase tracking-widest block">
                    DELTA
                  </span>
                  <span className="font-mono text-xl font-bold text-olive">
                    {report.fitness_score.score_change !== null && report.fitness_score.score_change !== undefined
                      ? `${report.fitness_score.score_change > 0 ? '+' : ''}${report.fitness_score.score_change}`
                      : '-'}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* AI Narrative Section */}
          {report.narrative && (
            <Card variant="default" className="p-6 md:p-8 space-y-4 border-olive/30 bg-bone">
              <div className="flex items-center justify-between border-b border-borderLine pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <h3 className="font-bold text-sm uppercase tracking-tight text-graphite">
                    AI Coach Executive Summary
                  </h3>
                </div>
                <Badge variant="olive">AI ENGINE NARRATIVE</Badge>
              </div>

              <div className="text-sm font-sans text-graphite leading-relaxed whitespace-pre-line space-y-2">
                {report.narrative}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
