'use client';

import { useMemo } from 'react';
import {
  Layers,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Zap,
  TrendingUp,
  Cpu,
  Database,
  Globe,
  Server,
  Layers as CacheIcon,
  ShieldAlert,
} from 'lucide-react';

export interface TraceSpan {
  nodeId: string;
  nodeType: string;
  label: string;
  serviceLatencyMs: number;
  queueDelayMs: number;
  gcPauseMs: number;
  totalDurationMs: number;
  status: 'OK' | 'DEGRADED' | 'CRITICAL' | 'DEADLINE_EXCEEDED' | 'HEALTHY';
  qps: number;
  queueDepth: number;
  errorRate: number;
}

export interface CriticalPathTrace {
  spans: TraceSpan[];
  totalLatencyMs: number;
  bottleneckNodeId: string;
  bottleneckType: string;
  bottleneckLatencyMs: number;
  timestamp: number;
}

interface TraceWaterfallProps {
  trace?: CriticalPathTrace | any[] | null;
  p50?: number;
  p90?: number;
  p95?: number;
  p99?: number;
  p999?: number;
  isRunning: boolean;
  onStartSimulation?: () => void;
}

function getNodeTypeIcon(type: string) {
  const t = (type || '').toLowerCase();
  if (t.includes('cache') || t.includes('redis') || t.includes('memcached')) {
    return CacheIcon;
  }
  if (t.includes('db') || t.includes('database') || t.includes('postgres') || t.includes('mongo') || t.includes('sql')) {
    return Database;
  }
  if (t.includes('gateway') || t.includes('proxy') || t.includes('cdn') || t.includes('dns')) {
    return Globe;
  }
  return Server;
}

export function TraceWaterfall({
  trace,
  p50 = 0,
  p90 = 0,
  p95 = 0,
  p99 = 0,
  p999 = 0,
  isRunning,
  onStartSimulation,
}: TraceWaterfallProps) {
  // CHANGE: Robust normalization whether trace is an object with .spans or an array
  const spans: TraceSpan[] = useMemo(() => {
    const raw: any[] = Array.isArray(trace) ? trace : (trace && Array.isArray(trace.spans) ? trace.spans : []);
    return raw.map((s) => ({
      nodeId: s.nodeId || s.id || '',
      nodeType: s.nodeType || s.type || 'SERVER',
      label: s.label || s.nodeId || s.id || '',
      serviceLatencyMs: s.serviceLatencyMs ?? s.serviceLatency ?? Math.round((s.totalDurationMs || s.durationMs || 10) * 0.7),
      queueDelayMs: s.queueDelayMs ?? s.queueDelay ?? 0,
      gcPauseMs: s.gcPauseMs ?? s.gcPause ?? 0,
      totalDurationMs: s.totalDurationMs ?? s.durationMs ?? 10,
      status: s.status || (s.errorRate > 30 ? 'CRITICAL' : 'OK'),
      qps: s.qps || 0,
      queueDepth: s.queueDepth || 0,
      errorRate: s.errorRate || 0,
    }));
  }, [trace]);

  const totalLatency = useMemo(() => {
    if (trace && !Array.isArray(trace) && typeof trace.totalLatencyMs === 'number') {
      return Math.max(trace.totalLatencyMs, 0.1);
    }
    const sum = spans.reduce((acc, s) => acc + s.totalDurationMs, 0);
    return Math.max(sum, 0.1);
  }, [trace, spans]);

  const bottleneck = useMemo(() => {
    if (!spans.length) return null;
    const maxSpan = spans.reduce(
      (prev, curr) => (curr.totalDurationMs > prev.totalDurationMs ? curr : prev),
      spans[0]
    );
    const percentage = totalLatency > 0 ? Math.round((maxSpan.totalDurationMs / totalLatency) * 100) : 0;
    return {
      span: maxSpan,
      percentage,
    };
  }, [spans, totalLatency]);

  const hasDeadlineExceeded = useMemo(() => {
    return spans.some((s) => s.status === 'DEADLINE_EXCEEDED');
  }, [spans]);

  if (!isRunning && (!spans || spans.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gray-50/50 border border-yc-border rounded-xl">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-yc-accent mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-yc-text m-0">Distributed Trace Waterfall</h4>
        <p className="mt-1 text-xs text-yc-text-muted max-w-md">
          Start the simulation to capture synchronous request lifecycles along the critical path, modeling Kingman M/G/1 queue waits and tail latency amplification.
        </p>
        {onStartSimulation && (
          <button
            onClick={onStartSimulation}
            className="mt-4 px-4 py-2 bg-yc-accent text-white font-mono text-xs font-bold rounded-lg shadow-sm hover:bg-yc-accent-hover transition flex items-center gap-2"
          >
            <Zap className="w-3.5 h-3.5" />
            Start Simulation
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* CHANGE: Distributed Deadline Exceeded Banner */}
      {hasDeadlineExceeded && (
        <div className="flex items-center gap-2.5 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-mono shadow-sm">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600 animate-pulse" />
          <span>
            <strong>Distributed Deadline Exceeded (504):</strong> Request path exceeded maximum timeout budget ({totalLatency.toFixed(0)}ms). Downstream calls were aborted to prevent resource exhaustion.
          </span>
        </div>
      )}

      {/* Overview & Bottleneck Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Total Critical Path Duration */}
        <div className="bg-white border border-yc-border rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-yc-text-muted">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Critical Path Latency</span>
            <Clock className="w-3.5 h-3.5 text-yc-accent" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${hasDeadlineExceeded ? 'text-rose-600' : 'text-yc-text'}`}>
              {totalLatency.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-yc-text-muted">ms</span>
            <span className="text-[10px] font-mono font-semibold text-gray-400 ml-auto">
              {spans.length} hops
            </span>
          </div>
        </div>

        {/* Bottleneck Component */}
        <div className="bg-white border border-yc-border rounded-xl p-3.5 flex flex-col justify-between md:col-span-2">
          <div className="flex items-center justify-between text-yc-text-muted">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Identified Bottleneck</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${bottleneck && bottleneck.percentage > 50 ? 'text-red-500' : 'text-amber-500'}`} />
          </div>
          {bottleneck ? (
            <div className="mt-2 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold font-mono text-yc-text">
                  {bottleneck.span.label || bottleneck.span.nodeId}
                </span>
                <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                  {bottleneck.span.nodeType}
                </span>
                <p className="mt-0.5 text-[11px] text-yc-text-secondary m-0">
                  Consuming <strong className="text-yc-text">{bottleneck.percentage}%</strong> of total path time ({bottleneck.span.totalDurationMs.toFixed(1)}ms)
                  {bottleneck.span.queueDepth > 10 && ` · ${Math.round(bottleneck.span.queueDepth)} requests queued`}
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  bottleneck.span.status === 'DEADLINE_EXCEEDED' ? 'bg-rose-600 text-white animate-pulse' :
                  bottleneck.span.status === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                  bottleneck.span.status === 'DEGRADED' ? 'bg-amber-100 text-amber-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {bottleneck.span.status}
                </span>
              </div>
            </div>
          ) : (
            <span className="mt-2 text-xs text-yc-text-muted">No bottleneck detected.</span>
          )}
        </div>
      </div>

      {/* Tail Percentile Latency Strip */}
      <div className="bg-gray-50 border border-yc-border rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono font-bold text-yc-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-yc-accent" />
            Log-Normal Tail Latency Distribution
          </span>
          <span className="text-[9px] font-mono text-gray-400">Derived via Kingman M/G/1 Variance</span>
        </div>
        <div className="grid grid-cols-5 gap-2 text-center">
          {[
            { label: 'p50 (Median)', val: p50 },
            { label: 'p90', val: p90 },
            { label: 'p95', val: p95 },
            { label: 'p99', val: p99 },
            { label: 'p99.9 (Tail)', val: p999 },
          ].map((item) => {
            const isHigh = item.val > 250;
            const isElevated = item.val > 100;
            return (
              <div key={item.label} className="bg-white border border-yc-border/70 rounded-lg py-1.5 px-2">
                <div className="text-[8px] font-mono text-yc-text-muted uppercase">{item.label}</div>
                <div className={`text-xs font-mono font-bold mt-0.5 ${
                  isHigh ? 'text-red-500' : isElevated ? 'text-amber-500' : 'text-emerald-600'
                }`}>
                  {item.val.toFixed(1)}ms
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Span Waterfall Gantt Chart */}
      <div className="bg-white border border-yc-border rounded-xl p-4">
        <div className="flex items-center justify-between pb-3 border-b border-yc-border/60 mb-3">
          <span className="text-xs font-bold text-yc-text flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-yc-accent" />
            Critical Path Request Lifecycle Spans
          </span>
          <div className="flex items-center gap-3 text-[9px] font-mono text-yc-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              Service Exec
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              Queue Wait (Wq)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
              GC / Lock Wait
            </span>
          </div>
        </div>

        {spans.length === 0 ? (
          <div className="py-8 text-center text-xs text-yc-text-muted font-mono">
            Waiting for request path trace from active simulation...
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {spans.map((span, idx) => {
              const NodeIcon = getNodeTypeIcon(span.nodeType);
              const durationPct = Math.min(100, Math.max(6, (span.totalDurationMs / totalLatency) * 100));
              const servicePct = span.totalDurationMs > 0 ? (span.serviceLatencyMs / span.totalDurationMs) * 100 : 100;
              const queuePct = span.totalDurationMs > 0 ? (span.queueDelayMs / span.totalDurationMs) * 100 : 0;
              const gcPct = span.totalDurationMs > 0 ? (span.gcPauseMs / span.totalDurationMs) * 100 : 0;

              return (
                <div
                  key={`${span.nodeId}-${idx}`}
                  className="flex flex-col md:flex-row md:items-center gap-2 p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition"
                >
                  {/* Left Label */}
                  <div className="w-full md:w-56 flex-shrink-0 flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-400 w-4">{idx + 1}.</span>
                    <div className="p-1.5 rounded bg-gray-100 text-gray-700">
                      <NodeIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-yc-text truncate">
                        {span.label || span.nodeId}
                      </div>
                      <div className="text-[9px] font-mono text-yc-text-muted flex items-center gap-1.5">
                        <span>{span.nodeType}</span>
                        {span.queueDepth > 5 && (
                          <span className="text-amber-600 font-bold">
                            · Q:{Math.round(span.queueDepth)}
                          </span>
                        )}
                        {span.errorRate > 0 && (
                          <span className="text-red-500 font-bold">
                            · {span.errorRate.toFixed(1)}% err
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Waterfall Bar */}
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 h-5 rounded-md overflow-hidden flex relative">
                      <div
                        className="h-full flex rounded-md overflow-hidden transition-all duration-300"
                        style={{ width: `${durationPct}%` }}
                      >
                        {servicePct > 0 && (
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${servicePct}%` }}
                            title={`Service Time: ${span.serviceLatencyMs.toFixed(1)}ms`}
                          />
                        )}
                        {queuePct > 0 && (
                          <div
                            className="h-full bg-amber-500"
                            style={{ width: `${queuePct}%` }}
                            title={`Queue Wait: ${span.queueDelayMs.toFixed(1)}ms`}
                          />
                        )}
                        {gcPct > 0 && (
                          <div
                            className="h-full bg-purple-500"
                            style={{ width: `${gcPct}%` }}
                            title={`GC Pause: ${span.gcPauseMs.toFixed(1)}ms`}
                          />
                        )}
                      </div>
                    </div>

                    {/* Duration badge */}
                    <div className="w-28 text-right flex-shrink-0 font-mono">
                      <span className="text-xs font-bold text-yc-text">
                        {span.totalDurationMs.toFixed(1)}ms
                      </span>
                      {span.queueDelayMs > 1 && (
                        <span className="block text-[8px] text-amber-600">
                          +{span.queueDelayMs.toFixed(0)}ms queue
                        </span>
                      )}
                    </div>

                    {/* Status Pill */}
                    <div className="w-24 text-right flex-shrink-0">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold font-mono ${
                        span.status === 'DEADLINE_EXCEEDED' ? 'bg-rose-600 text-white animate-pulse' :
                        span.status === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                        span.status === 'DEGRADED' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {span.status === 'DEADLINE_EXCEEDED' ? 'DEADLINE (504)' : span.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
