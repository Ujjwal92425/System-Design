'use client';

import { Activity } from 'lucide-react';

interface TrafficSliderProps {
  value: number;
  onChange: (qps: number) => void;
  disabled?: boolean;
}

export function TrafficSlider({ value, onChange, disabled }: TrafficSliderProps) {
  return (
    <div className={`flex flex-col gap-2.5 bg-yc-bg-alt border border-yc-border rounded-xl p-4 px-5 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-yc-text-muted" />
          <span className="font-mono text-[10px] text-yc-text-secondary font-bold uppercase">Input Traffic QPS</span>
        </div>
        <span className="font-mono text-sm text-yc-accent font-bold">
          {value.toLocaleString()} <span className="text-[9px] text-yc-text-muted">REQ/S</span>
        </span>
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
        <span>100 QPS</span>
        <span>5,000 QPS</span>
        <span>10,000 QPS</span>
      </div>
    </div>
  );
}
