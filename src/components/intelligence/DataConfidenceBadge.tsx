import React, { useState } from 'react';
import type { DataConfidence } from '../../types/intelligence';

interface DataConfidenceBadgeProps {
  confidence: DataConfidence;
}

export const DataConfidenceBadge: React.FC<DataConfidenceBadgeProps> = ({ confidence }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getVariantStyles = () => {
    switch (confidence.level) {
      case 'HIGH':
        return 'bg-olive/10 text-olive border-olive';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/40';
      case 'LOW':
      default:
        return 'bg-black/5 text-faded border-borderLine';
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowTooltip((prev) => !prev)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider font-bold border transition-colors cursor-pointer ${getVariantStyles()}`}
        aria-label={`Data Confidence: ${confidence.level}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        <span>{confidence.level} Confidence</span>
        <span className="text-[10px] opacity-70">ⓘ</span>
      </button>

      {showTooltip && (
        <div
          role="tooltip"
          className="absolute right-0 top-full mt-2 w-72 p-3 bg-white border border-borderLine shadow-lg text-xs z-30 flex flex-col gap-2 animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-borderLine pb-1.5">
            <span className="font-bold text-graphite">Data Confidence Evaluation</span>
            <span className="font-mono text-[10px] text-faded uppercase">{confidence.level}</span>
          </div>

          <div className="flex justify-between text-[11px] text-charcoal font-mono">
            <span>Nutrition logged:</span>
            <strong className="text-graphite">{confidence.nutrition_days_logged} / 28 days</strong>
          </div>
          <div className="flex justify-between text-[11px] text-charcoal font-mono">
            <span>Body-weight check-ins:</span>
            <strong className="text-graphite">{confidence.measurement_count} in 28d</strong>
          </div>

          {confidence.reasons.length > 0 && (
            <ul className="text-[11px] text-faded flex flex-col gap-1 list-disc list-inside pt-1 border-t border-borderLine">
              {confidence.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
