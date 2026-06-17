'use client';

import { Activity, ShieldAlert, ShieldCheck, ShieldAlert as DegradedIcon, MemoryStick, Timer, AlertTriangle } from 'lucide-react';

interface SystemHealthBadgeProps {
  health: 'GREEN' | 'YELLOW' | 'RED' | null;
  avgLatency?: number;
  avgMemory?: number;
  avgErrorRate?: number;
}

export function SystemHealthBadge({ health, avgLatency, avgMemory, avgErrorRate }: SystemHealthBadgeProps) {
  if (!health) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yc-bg-card border border-yc-border rounded-md text-yc-text-muted">
        <Activity className="w-3.5 h-3.5" />
        <span className="font-mono text-[10px] font-bold tracking-wider">OFFLINE</span>
      </div>
    );
  }

  const CONFIG = {
    GREEN: {
      text: 'SYSTEM STABLE',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: ShieldCheck
    },
    YELLOW: {
      text: 'DEGRADED',
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: DegradedIcon
    },
    RED: {
      text: 'CRITICAL FAILURE',
      color: 'text-red-400',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: ShieldAlert
    }
  };

  const current = CONFIG[health];
  const Icon = current.icon;

  return (
    <div className="flex items-center gap-2">
      <div className={`inline-flex items-center gap-2 px-3.5 py-2 ${current.bg} ${current.border} border rounded-lg ${current.color} transition-all duration-300`}>
        <Icon className="w-3.5 h-3.5" />
        <span className={`font-mono text-[11px] font-bold tracking-wider ${current.color}`}>
          {current.text}
        </span>
      </div>
      {avgLatency !== undefined && (
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-yc-bg-card border border-yc-border rounded-md text-yc-text-muted">
          <Timer className="w-3 h-3" />
          <span className="font-mono text-[9px] font-bold">{Math.round(avgLatency)}ms</span>
        </div>
      )}
      {avgMemory !== undefined && (
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-yc-bg-card border border-yc-border rounded-md text-yc-text-muted">
          <MemoryStick className="w-3 h-3" />
          <span className="font-mono text-[9px] font-bold">{avgMemory.toFixed(0)}%</span>
        </div>
      )}
      {avgErrorRate !== undefined && avgErrorRate > 0 && (
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-md text-red-500">
          <AlertTriangle className="w-3 h-3" />
          <span className="font-mono text-[9px] font-bold">{Math.round(avgErrorRate)}% err</span>
        </div>
      )}
    </div>
  );
}
