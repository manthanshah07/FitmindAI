import React from 'react';

interface TrajectoryChartProps {
  baselineWeight: number;
  projectedWeight: number;
  lowerBound: number;
  upperBound: number;
  targetWeight?: number | null;
  referenceDate?: string;
  className?: string;
}

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({
  baselineWeight,
  projectedWeight,
  lowerBound,
  upperBound,
  targetWeight,
  referenceDate,
  className = '',
}) => {
  // Chart dimensions
  const width = 640;
  const height = 260;
  const padLeft = 60;
  const padRight = 70;
  const padTop = 35;
  const padBottom = 40;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Determine Y range
  const allValues = [baselineWeight, projectedWeight, lowerBound, upperBound];
  if (targetWeight != null && targetWeight > 30 && targetWeight < 250) {
    allValues.push(targetWeight);
  }

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const yBuffer = Math.max(1.5, (rawMax - rawMin) * 0.25);
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
  const yLower = getY(lowerBound);
  const yUpper = getY(upperBound);
  const yTarget = targetWeight != null ? getY(targetWeight) : null;

  // Uncertainty polygon (Day 0 anchor to Day 28 interval)
  const uncertaintyPolygon = `${x0},${yBase} ${x28},${yUpper} ${x28},${yLower}`;

  // Grid tick lines
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const val = minY + (i * ySpan) / tickCount;
    return { val: Math.round(val * 10) / 10, y: getY(val) };
  });

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px] select-none font-sans"
          role="img"
          aria-label="28-day body-weight projection chart"
          data-testid="trajectory-chart-svg"
        >
          {/* Background Grid Lines */}
          {ticks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={t.y}
                x2={x28}
                y2={t.y}
                stroke="#D4D4CE"
                strokeWidth="1"
                strokeDasharray="2 3"
              />
              <text
                x={padLeft - 10}
                y={t.y + 4}
                textAnchor="end"
                className="text-[11px] fill-[#737373] font-mono"
              >
                {t.val.toFixed(1)} kg
              </text>
            </g>
          ))}

          {/* Goal Line (If target specified) */}
          {yTarget !== null && targetWeight != null && (
            <g>
              <line
                x1={padLeft}
                y1={yTarget}
                x2={x28}
                y2={yTarget}
                stroke="#A5A58D"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x={x28 + 6}
                y={yTarget + 4}
                className="text-[10px] fill-[#6B705C] font-mono font-bold"
              >
                Goal: {targetWeight} kg
              </text>
            </g>
          )}

          {/* Shaded 90% Benchmark Uncertainty Polygon */}
          <polygon
            points={uncertaintyPolygon}
            fill="#6B705C"
            fillOpacity="0.12"
          />

          {/* Upper / Lower Interval Boundary Guides at Day 28 */}
          <line
            x1={x28}
            y1={yUpper}
            x2={x28}
            y2={yLower}
            stroke="#6B705C"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1={x28 - 4}
            y1={yUpper}
            x2={x28 + 4}
            y2={yUpper}
            stroke="#6B705C"
            strokeWidth="1.5"
          />
          <line
            x1={x28 - 4}
            y1={yLower}
            x2={x28 + 4}
            y2={yLower}
            stroke="#6B705C"
            strokeWidth="1.5"
          />

          {/* Projected Trajectory Line */}
          <line
            x1={x0}
            y1={yBase}
            x2={x28}
            y2={yProj}
            stroke="#161616"
            strokeWidth="2.5"
            strokeDasharray="6 4"
          />

          {/* Day 0 Anchor Point */}
          <circle cx={x0} cy={yBase} r="5" fill="#161616" />
          <circle cx={x0} cy={yBase} r="8" fill="none" stroke="#161616" strokeWidth="1" strokeOpacity="0.3" />
          <text
            x={x0}
            y={yBase - 12}
            textAnchor="start"
            className="text-[12px] fill-[#161616] font-bold font-mono"
          >
            {baselineWeight.toFixed(1)} kg
          </text>

          {/* Day 28 Projected Endpoint */}
          <circle cx={x28} cy={yProj} r="6" fill="#6B705C" />
          <circle cx={x28} cy={yProj} r="9" fill="none" stroke="#6B705C" strokeWidth="1.5" strokeOpacity="0.4" />
          <text
            x={x28 + 10}
            y={yProj - 6}
            textAnchor="start"
            className="text-[12px] fill-[#6B705C] font-bold font-mono"
          >
            {projectedWeight.toFixed(1)} kg
          </text>
          <text
            x={x28 + 10}
            y={yProj + 10}
            textAnchor="start"
            className="text-[10px] fill-[#737373] font-mono"
          >
            [{lowerBound.toFixed(1)} – {upperBound.toFixed(1)}]
          </text>

          {/* X Axis Base Line */}
          <line
            x1={padLeft}
            y1={padTop + chartH}
            x2={x28}
            y2={padTop + chartH}
            stroke="#161616"
            strokeWidth="1.5"
          />

          {/* X Axis Labels */}
          <text
            x={x0}
            y={height - 12}
            textAnchor="start"
            className="text-[11px] fill-[#161616] font-mono font-bold"
          >
            Today {referenceDate ? `(${referenceDate})` : ''}
          </text>
          <text
            x={x28}
            y={height - 12}
            textAnchor="end"
            className="text-[11px] fill-[#161616] font-mono font-bold"
          >
            +28 Days Horizon
          </text>
        </svg>
      </div>

      {/* Chart Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-charcoal pt-2 border-t border-borderLine gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-graphite" />
            <span>Expected Path</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-3 h-3 bg-olive/15 border border-olive/30 inline-block" />
            <span>Expected Range</span>
          </div>
          {targetWeight != null && (
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="w-4 h-0.5 border-t border-dashed border-accent" />
              <span>Goal Target ({targetWeight} kg)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
