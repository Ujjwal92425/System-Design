'use client';

import { useMemo, useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import {
   Activity, Cpu, Clock, AlertTriangle, CheckCircle, ArrowUpDown,
   BarChart3, Gauge, Server, Zap, MemoryStick, Wifi,
} from 'lucide-react';

interface MetricsSnapshot {
  tick: number;
  timestamp: number;
  inputQps?: number;
  systemHealth: string;
  nodes: {
    id: string;
    label: string;
    qps: number;
    latency: number;
    errorRate: number;
    queueDepth?: number;
    cpu?: number;
    memory?: number;
    cacheHitRate?: number;
    activeConnections?: number;
    replicas?: number;
    readReplicasUsed?: number;
  }[];
}

interface ObservabilityDashboardProps {
  history: MetricsSnapshot[];
  currentMetrics: MetricsSnapshot | null;
  isRunning: boolean;
}

function formatMetric(val: number, unit: string): string {
  if (unit === 'qps') {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
    return String(Math.round(val));
  }
  if (unit === 'pct') return `${Math.round(val)}%`;
  if (unit === 'ms') return `${Math.round(val)}ms`;
  return String(Math.round(val));
}

const CHART_COLORS = {
  orange: '#FF6600',
  orangeLight: 'rgba(255,102,0,0.1)',
  orangeMid: 'rgba(255,102,0,0.3)',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  purple: '#a855f7',
  teal: '#14b8a6',
  yellow: '#eab308',
  gray: '#6b7280',
};

const HEALTH_COLORS: Record<string, string> = {
  GREEN: '#22c55e',
  YELLOW: '#eab308',
  RED: '#ef4444',
};

export function ObservabilityDashboard({ history, currentMetrics, isRunning }: ObservabilityDashboardProps) {
  const [timeRange, setTimeRange] = useState<'30s' | '60s' | 'all'>('30s');

  const filteredHistory = useMemo(() => {
    if (timeRange === 'all') return history;
    const maxTicks = timeRange === '60s' ? 60 : 30;
    return history.slice(-maxTicks);
  }, [history, timeRange]);

  const chartData = useMemo(() => {
    return filteredHistory.map((snap) => {
      const avgLatency = snap.nodes.length
        ? snap.nodes.reduce((s, n) => s + (n.latency || 0), 0) / snap.nodes.length
        : 0;
      const avgError = snap.nodes.length
        ? snap.nodes.reduce((s, n) => s + (n.errorRate || 0), 0) / snap.nodes.length
        : 0;
      const avgCpu = snap.nodes.length
        ? snap.nodes.reduce((s, n) => s + (n.cpu || 0), 0) / snap.nodes.length
        : 0;
      const maxQueue = Math.max(...snap.nodes.map((n) => n.queueDepth || 0), 0);
      const totalQps = snap.nodes.reduce((s, n) => s + (n.qps || 0), 0);
      const avgMemory = snap.nodes.length
        ? snap.nodes.reduce((s, n) => s + (n.memory || 0), 0) / snap.nodes.length
        : 0;
      const avgCacheHit = snap.nodes.length
        ? snap.nodes.reduce((s, n) => s + (n.cacheHitRate || 0), 0) / snap.nodes.length
        : 0;
      const maxConnections = Math.max(...snap.nodes.map((n) => n.activeConnections || 0), 0);
      const totalReplicas = snap.nodes.reduce((s, n) => s + (n.replicas || 1), 0);
      return {
        tick: snap.tick,
        qps: totalQps,
        inputQps: snap.inputQps || 0,
        latency: Math.round(avgLatency * 10) / 10,
        errorRate: Math.round(avgError * 10) / 10,
        cpu: Math.round(avgCpu * 10) / 10,
        memory: Math.round(avgMemory * 10) / 10,
        cacheHitRate: Math.round(avgCacheHit * 10) / 10,
        queueDepth: maxQueue,
        activeConnections: maxConnections,
        totalReplicas,
        health: snap.systemHealth,
        throughput: snap.nodes.length,
      };
    });
  }, [filteredHistory]);

  const latestSnap = chartData[chartData.length - 1];
  const perNodeData = currentMetrics?.nodes || [];
  const totalQps = perNodeData.reduce((s, n) => s + (n.qps || 0), 0);
  const totalErrors = perNodeData.reduce((s, n) => s + (n.errorRate || 0), 0);
  const avgLatency = perNodeData.length
    ? perNodeData.reduce((s, n) => s + (n.latency || 0), 0) / perNodeData.length
    : 0;
  const avgCpu = perNodeData.length
    ? perNodeData.reduce((s, n) => s + (n.cpu || 0), 0) / perNodeData.length
    : 0;
  const successRate = perNodeData.length
    ? Math.round(perNodeData.reduce((s, n) => s + (100 - (n.errorRate || 0)), 0) / perNodeData.length)
    : 100;

  const nodePieData = perNodeData.slice(0, 8).map((n) => ({
    name: n.label,
    value: Math.round(n.qps || 0),
  }));

  const NODE_PIE_COLORS = ['#FF6600', '#3b82f6', '#22c55e', '#a855f7', '#14b8a6', '#eab308', '#ef4444', '#6b7280'];

  return (
    <div className="w-full space-y-4">
      {/* Time range selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold text-gray-700 font-mono">OBSERVABILITY DASHBOARD</span>
          {isRunning && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 text-green-600 text-[8px] font-extrabold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {(['30s', '60s', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border transition-colors ${
                timeRange === r
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
              }`}
            >
              {r === 'all' ? 'ALL' : r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Throughput', value: formatMetric(totalQps, 'qps'), unit: 'QPS', icon: Activity, color: CHART_COLORS.orange, trend: latestSnap?.qps ?? 0 },
          { label: 'Avg Latency', value: formatMetric(avgLatency, 'ms'), unit: 'ms', icon: Clock, color: avgLatency > 200 ? CHART_COLORS.red : avgLatency > 100 ? CHART_COLORS.yellow : CHART_COLORS.green, trend: avgLatency },
          { label: 'Avg CPU', value: formatMetric(avgCpu, 'pct'), unit: '%', icon: Cpu, color: avgCpu > 80 ? CHART_COLORS.red : avgCpu > 50 ? CHART_COLORS.yellow : CHART_COLORS.green, trend: avgCpu },
          { label: 'Success Rate', value: `${successRate}%`, unit: '', icon: CheckCircle, color: successRate > 99 ? CHART_COLORS.green : successRate > 90 ? CHART_COLORS.yellow : CHART_COLORS.red, trend: successRate },
          { label: 'Health Status', value: currentMetrics?.systemHealth || 'IDLE', unit: '', icon: Activity, color: HEALTH_COLORS[currentMetrics?.systemHealth || 'GREEN'] || CHART_COLORS.gray, trend: 0 },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
            </div>
            <div className="text-xl font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
            {kpi.unit && <div className="text-[10px] text-gray-400 font-mono mt-0.5">{kpi.unit}</div>}
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-4">
        {/* QPS Throughput */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-[11px] font-bold text-gray-700">Request Throughput</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="qpsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.orange} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.orange} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="tick" tick={{ fontSize: 9, fontFamily: 'monospace' }} stroke="#999" />
                <YAxis tick={{ fontSize: 9, fontFamily: 'monospace' }} stroke="#999" tickFormatter={(v) => formatMetric(v, 'qps')} />
                <Tooltip
                  contentStyle={{ fontSize: 11, fontFamily: 'monospace', borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(value: any, name: any) => [formatMetric(Number(value), 'qps'), name === 'inputQps' ? 'Input' : 'Processed']}
                />
                <Area type="monotone" dataKey="inputQps" stroke="#94a3b8" strokeWidth={1} fill="none" strokeDasharray="4 4" name="inputQps" />
                <Area type="monotone" dataKey="qps" stroke={CHART_COLORS.orange} strokeWidth={2} fill="url(#qpsGradient)" name="qps" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] font-bold text-gray-700">System Latency (avg ms)</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="tick" tick={{ fontSize: 9, fontFamily: 'monospace' }} stroke="#999" />
                <YAxis tick={{ fontSize: 9, fontFamily: 'monospace' }} stroke="#999" tickFormatter={(v) => `${v}ms`} />
                <Tooltip
                  contentStyle={{ fontSize: 11, fontFamily: 'monospace', borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(value: any) => [`${value}ms`, 'Latency']}
                />
                <Line type="monotone" dataKey="latency" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-3 gap-4">
        {/* CPU Load */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-[11px] font-bold text-gray-700">CPU Load</span>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.purple} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="tick" tick={{ fontSize: 8, fontFamily: 'monospace' }} stroke="#999" />
                <YAxis tick={{ fontSize: 8, fontFamily: 'monospace' }} stroke="#999" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'monospace', borderRadius: 8, border: '1px solid #e5e7eb' }} formatter={(value: any) => [`${value}%`, 'CPU']} />
                <Area type="monotone" dataKey="cpu" stroke={CHART_COLORS.purple} strokeWidth={2} fill="url(#cpuGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <MemoryStick className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-[11px] font-bold text-gray-700">Memory Usage</span>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.orange} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.orange} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="tick" tick={{ fontSize: 8, fontFamily: 'monospace' }} stroke="#999" />
                <YAxis tick={{ fontSize: 8, fontFamily: 'monospace' }} stroke="#999" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'monospace', borderRadius: 8, border: '1px solid #e5e7eb' }} formatter={(value: any) => [`${value}%`, 'Memory']} />
                <Area type="monotone" dataKey="memory" stroke={CHART_COLORS.orange} strokeWidth={2} fill="url(#memGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Error Rate */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[11px] font-bold text-gray-700">Error Rate</span>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="tick" tick={{ fontSize: 8, fontFamily: 'monospace' }} stroke="#999" />
                <YAxis tick={{ fontSize: 8, fontFamily: 'monospace' }} stroke="#999" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'monospace', borderRadius: 8, border: '1px solid #e5e7eb' }} formatter={(value: any) => [`${value}%`, 'Error Rate']} />
                <Bar dataKey="errorRate" fill={CHART_COLORS.red} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-3 gap-4">
        {/* Cache Hit Rate */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-[11px] font-bold text-gray-700">Cache Hit Rate</span>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cacheGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.yellow} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.yellow} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="tick" tick={{ fontSize: 8, fontFamily: 'monospace' }} stroke="#999" />
                <YAxis tick={{ fontSize: 8, fontFamily: 'monospace' }} stroke="#999" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'monospace', borderRadius: 8, border: '1px solid #e5e7eb' }} formatter={(value: any) => [`${value}%`, 'Cache Hit']} />
                <Area type="monotone" dataKey="cacheHitRate" stroke={CHART_COLORS.yellow} strokeWidth={2} fill="url(#cacheGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Queue Depth */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-3.5 h-3.5 text-teal-500" />
            <span className="text-[11px] font-bold text-gray-700">Queue Depth (max)</span>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="queueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.teal} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.teal} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="tick" tick={{ fontSize: 8, fontFamily: 'monospace' }} stroke="#999" />
                <YAxis tick={{ fontSize: 8, fontFamily: 'monospace' }} stroke="#999" />
                <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'monospace', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="queueDepth" stroke={CHART_COLORS.teal} strokeWidth={2} fill="url(#queueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Connections */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wifi className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] font-bold text-gray-700">Active Connections (max)</span>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="connGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="tick" tick={{ fontSize: 8, fontFamily: 'monospace' }} stroke="#999" />
                <YAxis tick={{ fontSize: 8, fontFamily: 'monospace' }} stroke="#999" />
                <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'monospace', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="activeConnections" stroke={CHART_COLORS.blue} strokeWidth={2} fill="url(#connGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Node Traffic Distribution */}
      {nodePieData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-[11px] font-bold text-gray-700">Traffic Distribution by Node</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="h-40 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={nodePieData}
                    cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {nodePieData.map((_, idx) => (
                      <Cell key={idx} fill={NODE_PIE_COLORS[idx % NODE_PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 11, fontFamily: 'monospace', borderRadius: 8, border: '1px solid #e5e7eb' }}
                    formatter={(value: any) => [formatMetric(Number(value), 'qps'), 'QPS']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5">
              {nodePieData.map((node, idx) => (
                <div key={node.name} className="flex items-center gap-2 text-[10px]">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_PIE_COLORS[idx % NODE_PIE_COLORS.length] }} />
                  <span className="text-gray-600 font-mono">{node.name}</span>
                  <span className="text-gray-400 font-mono ml-auto">{formatMetric(node.value, 'qps')} QPS</span>
                </div>
              ))}
              {perNodeData.length > 8 && (
                <div className="text-[9px] text-gray-400 mt-1">+{perNodeData.length - 8} more nodes</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alert history */}
      {chartData.filter((d) => d.health !== 'GREEN').length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-bold text-gray-700">Health Transitions</span>
          </div>
          <div className="space-y-1.5">
            {chartData.filter((d) => d.health !== 'GREEN').slice(-10).map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-gray-400">tick {d.tick}</span>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HEALTH_COLORS[d.health] }} />
                <span style={{ color: HEALTH_COLORS[d.health] }}>{d.health}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isRunning && chartData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Gauge className="w-10 h-10 mb-3 text-gray-200" />
          <p className="text-sm font-mono">No telemetry data available</p>
          <p className="text-xs text-gray-300 mt-1">Start a simulation to see real-time metrics</p>
        </div>
      )}
    </div>
  );
}
