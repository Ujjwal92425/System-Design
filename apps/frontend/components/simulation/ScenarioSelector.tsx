'use client';

import { Activity, TrendingUp, Zap } from 'lucide-react';

const SCENARIOS = [
  {
    id: 'constant',
    label: 'Steady State',
    description: 'Fixed traffic at your slider value',
    icon: Activity,
  },
  {
    id: 'spike',
    label: 'Traffic Spike',
    description: '3.5× burst every 15s (ticks 3–7)',
    icon: Zap,
  },
  {
    id: 'ramp',
    label: 'Ramping Load',
    description: '+100 QPS per tick until cap',
    icon: TrendingUp,
  },
] as const;

interface ScenarioSelectorProps {
  value: string;
  onChange: (scenario: string) => void;
  disabled?: boolean;
  activeInputQps?: number;
  baseQps?: number;
}

export function ScenarioSelector({ value, onChange, disabled, activeInputQps, baseQps }: ScenarioSelectorProps) {
  const isModified = activeInputQps !== undefined && baseQps !== undefined && activeInputQps !== baseQps;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-yc-text-muted font-bold uppercase">Load Profile</span>
        {isModified && (
          <span className="font-mono text-[9px] text-yc-accent font-bold">
            Effective: {activeInputQps!.toLocaleString()} QPS
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {SCENARIOS.map((s) => {
          const Icon = s.icon;
          const selected = value === s.id;
          return (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(s.id)}
              className={`flex flex-col items-start gap-1 p-2.5 rounded-lg border text-left transition-all ${
                selected
                  ? 'border-yc-accent bg-orange-50 shadow-sm'
                  : 'border-yc-border bg-yc-bg-card hover:border-yc-accent/40'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3 h-3 ${selected ? 'text-yc-accent' : 'text-yc-text-muted'}`} />
                <span className={`text-[10px] font-bold ${selected ? 'text-yc-accent' : 'text-yc-text'}`}>
                  {s.label}
                </span>
              </div>
              <span className="text-[8px] text-yc-text-muted leading-tight">{s.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
