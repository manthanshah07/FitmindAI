import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle,
  Target,
  Zap,
} from 'lucide-react';

import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatTile } from '../ui/StatTile';
import { Badge } from '../ui/Badge';
import { SegmentedControl } from '../ui/SegmentedControl';
import {
  getWeeklyReportApi,
  getMonthlyReportApi,
  generateReportAiSummaryApi,
} from '../../lib/api/reports';
import type { FitnessReportResponse, ReportAiSummaryResponse } from '../../types/reports';
import { getErrorMessage } from '../../utils/apiError';

export const WeeklyReviewTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [dateOffset, setDateOffset] = useState<number>(0);
  const [cachedAiSummary, setCachedAiSummary] = useState<ReportAiSummaryResponse | null>(null);

  // Compute reference date string based on offset
  const getReferenceDateStr = () => {
    const d = new Date();
    if (reportType === 'weekly') {
      d.setDate(d.getDate() - dateOffset * 7);
    } else {
      d.setMonth(d.getMonth() - dateOffset);
    }
    return d.toISOString().split('T')[0];
  };

  const refDateStr = getReferenceDateStr();

  const {
    data: report,
    isLoading,
    error: queryError,
  } = useQuery<FitnessReportResponse>({
    queryKey: ['fitnessReport', reportType, refDateStr],
    queryFn: () =>
      reportType === 'weekly'
        ? getWeeklyReportApi(refDateStr, false)
        : getMonthlyReportApi(refDateStr, false),
  });

  const aiSummaryMutation = useMutation({
    mutationFn: () =>
      generateReportAiSummaryApi({
        report_type: reportType,
        date: refDateStr,
      }),
    onSuccess: (data) => {
      setCachedAiSummary(data);
      queryClient.setQueryData<FitnessReportResponse>(
        ['fitnessReport', reportType, refDateStr],
        (old) => (old ? { ...old, narrative: data.narrative, ai_generated: true } : old)
      );
    },
  });

  const narrativeText = report?.narrative || cachedAiSummary?.narrative || null;

  const renderTrendIcon = (scoreDelta?: number | null) => {
    if (scoreDelta === undefined || scoreDelta === null || scoreDelta === 0) {
      return <Minus className="w-4 h-4 text-text-3" />;
    }
    if (scoreDelta > 0) {
      return <TrendingUp className="w-4 h-4 text-success" />;
    }
    return <TrendingDown className="w-4 h-4 text-warning" />;
  };

  const formatDelta = (val?: number | null, unit = '') => {
    if (val === undefined || val === null) return '—';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val}${unit} vs prior ${reportType === 'weekly' ? 'week' : 'month'}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold text-text">Retrospective Review</h2>
          <p className="text-xs text-text-2 mt-0.5">
            Deterministic period-over-period performance across workouts, nutrition, and fitness score.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SegmentedControl<'weekly' | 'monthly'>
            value={reportType}
            onChange={(val) => {
              setReportType(val);
              setDateOffset(0);
              setCachedAiSummary(null);
            }}
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
          />

          <div className="flex items-center border border-border rounded-lg overflow-hidden bg-surface-1">
            <button
              type="button"
              aria-label="Previous period"
              onClick={() => {
                setDateOffset((prev) => prev + 1);
                setCachedAiSummary(null);
              }}
              className="p-1.5 hover:bg-surface-2 text-text-2 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono font-medium text-text">
              {dateOffset === 0 ? 'Current' : `-${dateOffset}`}
            </span>
            <button
              type="button"
              aria-label="Next period"
              disabled={dateOffset === 0}
              onClick={() => {
                setDateOffset((prev) => Math.max(0, prev - 1));
                setCachedAiSummary(null);
              }}
              className="p-1.5 hover:bg-surface-2 text-text-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {queryError && (
        <div className="p-4 rounded-lg border border-danger/40 bg-danger/10 text-danger text-xs font-medium">
          {getErrorMessage(queryError)}
        </div>
      )}

      {isLoading ? (
        <Card className="p-12 text-center">
          <p className="text-xs uppercase tracking-wider text-accent font-semibold animate-pulse">
            Loading review data...
          </p>
        </Card>
      ) : !report ? (
        <Card className="p-12 text-center text-xs text-text-2">
          No review data available for this timeframe.
        </Card>
      ) : (
        <>
          {/* Headline Banner: Period Range + Fitness Score */}
          <Card className="p-6 md:p-8 bg-gradient-to-br from-surface-1 to-surface-2/40 border-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold">
                  {report.report_type.toUpperCase()} SUMMARY
                </span>
                <h3 className="text-xl md:text-2xl font-bold text-text">{report.headline}</h3>
                <p className="text-xs text-text-2">
                  Deterministic assessment grounded strictly in your logged activities.
                </p>
              </div>

              <div className="flex items-center gap-4 border border-border/80 bg-surface-1/90 px-5 py-3 rounded-xl shadow-sm shrink-0">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-text-3">
                    Fitness Score
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-text">
                      {report.fitness_score.ending_score ?? '—'}
                    </span>
                    <span className="text-xs font-mono font-medium flex items-center gap-1 text-text-2">
                      {renderTrendIcon(report.deltas?.fitness_score_delta)}
                      {report.deltas?.fitness_score_delta !== undefined &&
                      report.deltas?.fitness_score_delta !== null
                        ? `${report.deltas.fitness_score_delta > 0 ? '+' : ''}${report.deltas.fitness_score_delta} pts`
                        : '0 pts'}
                    </span>
                  </div>
                </div>
                {report.adherence_label && (
                  <Badge
                    variant={
                      report.adherence_label === 'High'
                        ? 'olive'
                        : report.adherence_label === 'Moderate'
                        ? 'graphite'
                        : 'faded'
                    }
                    className="ml-2"
                  >
                    {report.adherence_label}
                  </Badge>
                )}
              </div>
            </div>
          </Card>

          {/* 4 Stat Tiles with Period-over-Period Deltas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile
              label="Completed Sets"
              value={`${report.workouts.sets_completed}`}
              unit={report.workouts.sets_planned ? `/ ${report.workouts.sets_planned}` : 'sets'}
              subtext={formatDelta(report.deltas?.sets_delta, ' sets')}
            />

            <StatTile
              label="Workouts"
              value={`${report.workouts.workouts_completed}`}
              unit={report.workouts.target_workouts ? `/ ${report.workouts.target_workouts}` : ''}
              subtext={formatDelta(report.deltas?.workouts_delta, ' sessions')}
            />

            <StatTile
              label="Nutrition Days"
              value={`${report.nutrition.logged_days_count}`}
              unit={`/ ${report.nutrition.total_days_in_period}d`}
              subtext={formatDelta(report.deltas?.logged_days_delta, ' days')}
            />

            <StatTile
              label="Avg Protein"
              value={
                report.nutrition.average_protein_per_logged_day
                  ? `${report.nutrition.average_protein_per_logged_day}`
                  : '—'
              }
              unit="g/day"
              subtext={formatDelta(report.deltas?.average_protein_delta, 'g')}
            />
          </div>

          {/* 3 Deterministic Assessment Lists with Icons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* What Went Well */}
            <Card className="p-5 space-y-3 border-success/30 bg-surface-1">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-text">What Went Well</h4>
              </div>
              <ul className="space-y-2 text-xs text-text-2 leading-relaxed">
                {(report.what_went_well || []).length > 0 ? (
                  report.what_went_well?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-success font-bold shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-text-3 italic">No positive milestones recorded yet.</li>
                )}
              </ul>
            </Card>

            {/* What Needs Attention */}
            <Card className="p-5 space-y-3 border-warning/30 bg-surface-1">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-text">What Needs Attention</h4>
              </div>
              <ul className="space-y-2 text-xs text-text-2 leading-relaxed">
                {(report.what_needs_attention || []).length > 0 ? (
                  report.what_needs_attention?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-warning font-bold shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-text-3 italic">All targets met without flagged shortfalls.</li>
                )}
              </ul>
            </Card>

            {/* Next Period Focus */}
            <Card className="p-5 space-y-3 border-accent/30 bg-surface-1">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Target className="w-4 h-4 text-accent shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-text">Next Period Focus</h4>
              </div>
              <ul className="space-y-2 text-xs text-text-2 leading-relaxed">
                {(report.next_period_focus || []).length > 0 ? (
                  report.next_period_focus?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-accent font-bold shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-text-3 italic">Maintain current consistent training schedule.</li>
                )}
              </ul>
            </Card>
          </div>

          {/* On-Demand AI Summary Card */}
          <Card className="p-6 md:p-8 space-y-4 border-accent/20 bg-gradient-to-b from-surface-1 to-surface-2/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-text">AI Coach Period Narrative</h3>
                <Badge variant="graphite" className="text-[10px]">
                  On-Demand
                </Badge>
              </div>

              {!narrativeText && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => aiSummaryMutation.mutate()}
                  isLoading={aiSummaryMutation.isPending}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Write Summary
                </Button>
              )}
            </div>

            {narrativeText ? (
              <div className="space-y-3">
                <p className="text-xs md:text-sm text-text-2 leading-relaxed whitespace-pre-line">
                  {narrativeText}
                </p>
                <div className="flex items-center justify-between pt-2 text-[11px] text-text-3 border-t border-border/50">
                  <span>Generated from deterministic review data. Calculations strictly performed by backend.</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => aiSummaryMutation.mutate()}
                    isLoading={aiSummaryMutation.isPending}
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-text-2">
                  Click &ldquo;Write Summary&rdquo; to generate a concise, grounded coaching narrative summarizing this period.
                </p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
