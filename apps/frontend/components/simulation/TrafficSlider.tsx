'use client';

import { Activity, ArrowRight } from 'lucide-react';

interface TrafficSliderProps {
  value: number;
  effectiveQps?: number;
  isRunning?: boolean;
  onChange: (qps: number) => void;
}

export function TrafficSlider({ value, effectiveQps, isRunning, onChange }: TrafficSliderProps) {
  const showEffective = isRunning && effectiveQps !== undefined && effectiveQps !== value;

  return (
    <div className="flex flex-col gap-2.5 bg-yc-bg-card border border-yc-border rounded-xl p-4">
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-yc-text-muted" />
          <span className="font-mono text-[10px] text-yc-text-secondary font-bold uppercase">Base Traffic</span>
        </div>
        <div className="text-right">
          <span className="font-mono text-lg text-yc-accent font-bold leading-none">
            {value.toLocaleString()}
          </span>
          <span className="font-mono text-[9px] text-yc-text-muted ml-1">REQ/S</span>
          {showEffective && (
            <div className="flex items-center justify-end gap-1 mt-1 text-[9px] font-mono text-amber-600">
              <ArrowRight className="w-2.5 h-2.5" />
              <span className="font-bold">{effectiveQps!.toLocaleString()}</span>
              <span className="text-yc-text-muted">effective</span>
            </div>
          )}
        </div>
      </div>

      <input
        type="range"
        min="100"
        max="10000"
        step="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 1000)}
        className="w-full accent-yc-accent h-1.5 rounded-full cursor-pointer outline-none"
        style={{ background: '#E5E2D9' }}
      />

      <div className="flex justify-between font-mono text-[9px] text-yc-text-muted">
        <span>100</span>
        <span>5,000</span>
        <span>10,000</span>
      </div>

      <p className="m-0 text-[9px] text-yc-text-muted leading-relaxed">
        {isRunning
          ? 'Slider updates live traffic. Spike/Ramp profiles modify the effective QPS shown above.'
          : 'Set base QPS before starting. Scenario profiles apply on top of this value.'}
      </p>
    </div>
  );
}
