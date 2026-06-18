'use client';

import { Activity, Clock, Cpu, CheckCircle } from 'lucide-react';

interface SimulationKpiBarProps {
  currentMetrics: {
    inputQps?: number;
    systemHealth?: string;
    nodes?: { qps?: number; latency?: number; errorRate?: number; cpu?: number }[];
  } | null;
  trafficQps: number;
  scenario: string;
}

function formatQps(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

const SCENARIO_LABELS: Record<string, string> = {
  constant: 'Steady',
  spike: 'Spike',
  ramp: 'Ramp',
};

export function SimulationKpiBar({ currentMetrics, trafficQps, scenario }: SimulationKpiBarProps) {
  const nodes = currentMetrics?.nodes || [];
  const totalQps = nodes.reduce((s, n) => s + (n.qps || 0), 0);
  const avgLatency = nodes.length
    ? nodes.reduce((s, n) => s + (n.latency || 0), 0) / nodes.length
    : 0;
  const avgCpu = nodes.length
    ? nodes.reduce((s, n) => s + (n.cpu || 0), 0) / nodes.length
    : 0;
  const successRate = nodes.length
    ? Math.round(nodes.reduce((s, n) => s + (100 - (n.errorRate || 0)), 0) / nodes.length)
    : 100;

  const inputQps = currentMetrics?.inputQps ?? trafficQps;
  const health = currentMetrics?.systemHealth || 'GREEN';

  const healthColor =
    health === 'RED' ? 'text-red-500 bg-red-50 border-red-200' :
    health === 'YELLOW' ? 'text-amber-600 bg-amber-50 border-amber-200' :
    'text-emerald-600 bg-emerald-50 border-emerald-200';

  const kpis = [
    {
      label: 'Input QPS',
      value: formatQps(inputQps),
      sub: SCENARIO_LABELS[scenario] || scenario,
      icon: Activity,
      color: 'text-yc-accent',
    },
    {
      label: 'Avg Latency',
      value: `${Math.round(avgLatency)}ms`,
      sub: avgLatency > 200 ? 'High' : avgLatency > 100 ? 'Elevated' : 'OK',
      icon: Clock,
      color: avgLatency > 200 ? 'text-red-500' : avgLatency > 100 ? 'text-amber-500' : 'text-emerald-600',
    },
    {
      label: 'Avg CPU',
      value: `${Math.round(avgCpu)}%`,
      sub: `${formatQps(totalQps)} proc/s`,
      icon: Cpu,
      color: avgCpu > 80 ? 'text-red-500' : avgCpu > 50 ? 'text-amber-500' : 'text-emerald-600',
    },
    {
      label: 'Success',
      value: `${successRate}%`,
      sub: health,
      icon: CheckCircle,
      color: successRate > 95 ? 'text-emerald-600' : successRate > 85 ? 'text-amber-500' : 'text-red-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="flex items-center gap-2.5 bg-yc-bg-card border border-yc-border rounded-lg px-3 py-2">
          <kpi.icon className={`w-3.5 h-3.5 flex-shrink-0 ${kpi.color}`} />
          <div className="min-w-0">
            <div className="text-[8px] font-semibold text-yc-text-muted uppercase tracking-wide">{kpi.label}</div>
            <div className={`text-sm font-bold font-mono leading-tight ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[8px] text-yc-text-muted font-mono truncate">{kpi.sub}</div>
          </div>
        </div>
      ))}
      <div className={`hidden sm:flex col-span-4 items-center justify-center gap-2 py-1 px-3 rounded-lg border text-[10px] font-bold font-mono ${healthColor}`}>
        System Health: {health}
      </div>
    </div>
  );
}
