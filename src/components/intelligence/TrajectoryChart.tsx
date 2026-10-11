import React from 'react';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { formatWeightByUnit } from '../../lib/format';

interface TrajectoryChartProps {
  baselineWeight: number;
  projectedWeight: number;
  lowerBound?: number;
  upperBound?: number;
  targetWeight?: number | null;
  referenceDate?: string;
  className?: string;
}

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({
  baselineWeight,
  projectedWeight,
  targetWeight,
  className = '',
}) => {
  const units = usePreferencesStore((s) => s.units);

  // Chart dimensions
  const width = 640;
  const height = 240;
  const padLeft = 56;
  const padRight = 56;
  const padTop = 36;
  const padBottom = 40;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Determine Y range from baseline, projected, and optional target weight
  const allValues = [baselineWeight, projectedWeight];
  if (targetWeight != null && targetWeight > 30 && targetWeight < 250) {
    allValues.push(targetWeight);
  }

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const yBuffer = Math.max(1.0, (rawMax - rawMin) * 0.35);
  const minY = Math.floor((rawMin - yBuffer) * 2) / 2;
  const maxY = Math.ceil((rawMax + yBuffer) * 2) / 2;
  const ySpan = Math.max(maxY - minY, 1);

  const getY = (val: number) => {
    return padTop + chartH - ((val - minY) / ySpan) * chartH;
  };

  const x0 = padLeft;
  const x28 = padLeft + chartW;

  const yBase = getY(baselineWeight);
  const yProj = getY(projectedWeight);
  const yTarget =
    targetWeight != null && targetWeight > 30 && targetWeight < 250
      ? getY(targetWeight)
      : null;

  const areaPath = `M ${x0} ${yBase} L ${x28} ${yProj} L ${x28} ${padTop + chartH} L ${x0} ${padTop + chartH} Z`;

  // Clean 4-step horizontal grid ticks
  const tickCount = 3;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const val = minY + (i * ySpan) / tickCount;
    return { val: Number(val.toFixed(1)), y: getY(val) };
  });

  const formattedStart = formatWeightByUnit(baselineWeight, units);
  const formattedEnd = formatWeightByUnit(projectedWeight, units);
  const formattedGoal =
    targetWeight != null ? formatWeightByUnit(targetWeight, units) : null;

  return (
    <div className={`w-full max-w-full min-w-0 flex flex-col gap-3 ${className}`}>
      <div className="w-full max-w-full min-w-0 overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-full h-auto select-none font-sans"
          role="img"
          aria-label="30-day weight outlook chart"
          data-testid="trajectory-chart-svg"
        >
          <defs>
            <linearGradient id="trajectoryAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <filter id="trajectoryGlow" x="-10%" y="-20%" width="120%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Subtle Horizontal Grid Lines */}
          {ticks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={t.y}
                x2={x28}
                y2={t.y}
                stroke="currentColor"
                className="text-border"
                strokeOpacity="0.45"
                strokeWidth="1"
              />
              <text
                x={padLeft - 10}
                y={t.y + 4}
                textAnchor="end"
                className="text-[11px] fill-text-3 font-mono"
              >
                {t.val.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Area Fill Under Projected Path */}
          <path d={areaPath} fill="url(#trajectoryAreaGrad)" />

          {/* Dashed Goal Weight Line */}
          {yTarget !== null && formattedGoal && (
            <g>
              <line
                x1={padLeft}
                y1={yTarget}
                x2={x28}
                y2={yTarget}
                stroke="#94A3B8"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <text
                x={x28 - 4}
                y={yTarget - 8}
                textAnchor="end"
                className="text-[11px] fill-text-2 font-mono font-semibold"
              >
                Goal: {formattedGoal}
              </text>
            </g>
          )}

          {/* Solid Glowing Accent Line for Projected Weight Path */}
          <line
            x1={x0}
            y1={yBase}
            x2={x28}
            y2={yProj}
            stroke="#10B981"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#trajectoryGlow)"
          />

          {/* Start Marker: Today */}
          <circle
            cx={x0}
            cy={yBase}
            r="5.5"
            fill="#10B981"
            stroke="#0B0F17"
            strokeWidth="2"
          />
          <text
            x={x0}
            y={Math.max(18, yBase - 12)}
            textAnchor="start"
            className="text-[12px] fill-text font-semibold font-mono"
          >
            Today: {formattedStart}
          </text>

          {/* End Marker: Day 28 */}
          <circle
            cx={x28}
            cy={yProj}
            r="6"
            fill="#10B981"
            stroke="#0B0F17"
            strokeWidth="2"
          />
          <text
            x={x28}
            y={Math.max(18, yProj - 12)}
            textAnchor="end"
            className="text-[12px] fill-accent font-bold font-mono"
          >
            Day 28: {formattedEnd}
          </text>

          {/* X Axis Labels */}
          <text
            x={x0}
            y={height - 10}
            textAnchor="start"
            className="text-[11px] fill-text-3 font-mono"
          >
            Today
          </text>
          <text
            x={(x0 + x28) / 2}
            y={height - 10}
            textAnchor="middle"
            className="text-[11px] fill-text-3 font-mono"
          >
            2 Weeks
          </text>
          <text
            x={x28}
            y={height - 10}
            textAnchor="end"
            className="text-[11px] fill-text-3 font-mono"
          >
            Day 28
          </text>
        </svg>
      </div>

      {/* Minimal Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-text-2 pt-2 border-t border-border/60">
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 bg-accent rounded-full inline-block" />
          <span>Projected Trend</span>
        </div>
        {formattedGoal && (
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-text-3 inline-block" />
            <span>Goal ({formattedGoal})</span>
          </div>
        )}
      </div>
    </div>
  );
};
