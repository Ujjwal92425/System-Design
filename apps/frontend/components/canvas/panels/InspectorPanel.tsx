'use client';

import { useCallback, useMemo } from 'react';
import { NodeType } from '@sd-os/shared';
import { useCanvasStore, type CanvasNode } from '../../../features/canvas/useCanvasStore';
import { cn } from '@sd-os/ui';
import {
  Shield, Scale, Server, Database, Hexagon, Zap, ArrowLeftRight,
  Globe, Archive, BookOpen, Box, KeyRound, Bell, Search, Monitor, Settings2,
  Gauge, Hash, HardDrive, Cpu, Clock, GitCompare, Sigma, Workflow,
  Ban, Rabbit, Network
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  [NodeType.API_GATEWAY]: <Shield className="h-4 w-4 text-purple-600" />,
  [NodeType.LOAD_BALANCER]: <Scale className="h-4 w-4 text-blue-600" />,
  [NodeType.WEB_SERVER]: <Server className="h-4 w-4 text-sky-600" />,
  [NodeType.DATABASE_SQL]: <Database className="h-4 w-4 text-emerald-600" />,
  [NodeType.DATABASE_NOSQL]: <Hexagon className="h-4 w-4 text-emerald-600" />,
  [NodeType.CACHE]: <Zap className="h-4 w-4 text-rose-600" />,
  [NodeType.QUEUE]: <ArrowLeftRight className="h-4 w-4 text-amber-600" />,
  [NodeType.CDN]: <Globe className="h-4 w-4 text-indigo-600" />,
  [NodeType.OBJECT_STORAGE]: <Archive className="h-4 w-4 text-cyan-600" />,
  [NodeType.DNS]: <BookOpen className="h-4 w-4 text-violet-600" />,
  [NodeType.MICROSERVICE]: <Box className="h-4 w-4 text-slate-600" />,
  [NodeType.AUTH_SERVICE]: <KeyRound className="h-4 w-4 text-orange-600" />,
  [NodeType.NOTIFICATION_SERVICE]: <Bell className="h-4 w-4 text-pink-600" />,
  [NodeType.SEARCH_ENGINE]: <Search className="h-4 w-4 text-yellow-600" />,
  [NodeType.CLIENT]: <Monitor className="h-4 w-4 text-gray-600" />,
};

type FieldDef = {
  label: string;
  key: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'range';
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
};

const FIELD_CONFIGS: Record<string, FieldDef[]> = {
  [NodeType.LOAD_BALANCER]: [
    { label: 'Label', key: 'label', type: 'text' },
    { label: 'Capacity (QPS)', key: 'capacity', type: 'number' },
    { label: 'Latency (ms)', key: 'latency', type: 'number' },
    {
      label: 'Routing Algorithm', key: 'routingAlgorithm', type: 'select',
      options: [
        { label: 'Round Robin', value: 'round_robin' },
        { label: 'Least Connections', value: 'least_connections' },
        { label: 'IP Hash', value: 'ip_hash' },
      ]
    },
  ],
  [NodeType.CDN]: [
    { label: 'Label', key: 'label', type: 'text' },
    { label: 'Hit Latency (ms)', key: 'latency', type: 'number' },
    {
      label: 'Hit Ratio Override', key: 'hitRatioOverride', type: 'range',
      min: 0, max: 100, step: 5, suffix: '%'
    },
  ],
  [NodeType.CACHE]: [
    { label: 'Label', key: 'label', type: 'text' },
    { label: 'Hit Rate (%)', key: 'hitRate', type: 'number' },
    { label: 'Hit Latency (ms)', key: 'hitLatencyMs', type: 'number' },
    {
      label: 'Eviction Policy', key: 'evictionPolicy', type: 'select',
      options: [
        { label: 'LRU (Least Recently Used)', value: 'lru' },
        { label: 'LFU (Least Frequently Used)', value: 'lfu' },
        { label: 'FIFO', value: 'fifo' },
      ]
    },
    { label: 'TTL (seconds)', key: 'ttlSeconds', type: 'number' },
  ],
  [NodeType.DATABASE_SQL]: [
    { label: 'Label', key: 'label', type: 'text' },
    { label: 'Max Connections', key: 'capacity', type: 'number' },
    { label: 'Query Latency (ms)', key: 'latency', type: 'number' },
    { label: 'Connection Pool Size', key: 'connectionPoolSize', type: 'number' },
    { label: 'Read Replicas', key: 'readReplicaCount', type: 'number' },
    { label: 'Replication Lag (ms)', key: 'replicationLagMs', type: 'number' },
    { label: 'Read Replica', key: 'replicationEnabled', type: 'boolean' },
  ],
  [NodeType.DATABASE_NOSQL]: [
    { label: 'Label', key: 'label', type: 'text' },
    { label: 'Max Connections', key: 'capacity', type: 'number' },
    { label: 'Query Latency (ms)', key: 'latency', type: 'number' },
    { label: 'Connection Pool Size', key: 'connectionPoolSize', type: 'number' },
    { label: 'Read Replicas', key: 'readReplicaCount', type: 'number' },
    { label: 'Replication Lag (ms)', key: 'replicationLagMs', type: 'number' },
  ],
  [NodeType.QUEUE]: [
    { label: 'Label', key: 'label', type: 'text' },
    { label: 'Processing Rate (msg/s)', key: 'processingRate', type: 'number' },
  ],
  [NodeType.WEB_SERVER]: [
    { label: 'Label', key: 'label', type: 'text' },
    { label: 'Capacity (QPS)', key: 'capacity', type: 'number' },
    { label: 'Thread Pool Size', key: 'threadPoolSize', type: 'number' },
    { label: 'Request Timeout (ms)', key: 'requestTimeoutMs', type: 'number' },
  ],
  RATE_LIMITER: [
    { label: 'Label', key: 'label', type: 'text' },
    {
      label: 'Rate Limit (QPS)', key: 'rateLimitQps', type: 'number'
    },
    {
      label: 'Algorithm', key: 'rateLimiterType', type: 'select',
      options: [
        { label: 'Token Bucket', value: 'token_bucket' },
        { label: 'Fixed Window', value: 'fixed_window' },
      ]
    },
  ],
};

const DEFAULT_FIELDS: FieldDef[] = [
  { label: 'Label', key: 'label', type: 'text' },
];

function FieldInput({ field, value, onChange }: { field: FieldDef; value: any; onChange: (key: string, val: any) => void }) {
  if (field.type === 'text') {
    return (
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(field.key, e.target.value)}
        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
      />
    );
  }
  if (field.type === 'number') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(field.key, Number(e.target.value))}
          className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
        />
        {field.suffix && <span className="text-[10px] text-slate-400 font-mono">{field.suffix}</span>}
      </div>
    );
  }
  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(field.key, e.target.checked)}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-200"
        />
        <span className="text-xs text-slate-600">Enabled</span>
      </label>
    );
  }
  if (field.type === 'select' && field.options) {
    return (
      <select
        value={value ?? field.options[0]?.value ?? ''}
        onChange={(e) => onChange(field.key, e.target.value)}
        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200 bg-white"
      >
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }
  if (field.type === 'range') {
    const numVal = value ?? field.min ?? 0;
    return (
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={field.min ?? 0}
          max={field.max ?? 100}
          step={field.step ?? 1}
          value={numVal}
          onChange={(e) => onChange(field.key, Number(e.target.value))}
          className="flex-1 h-1.5 accent-blue-600"
        />
        <span className="text-[10px] font-mono text-slate-500 min-w-[4ch] text-right">
          {numVal}{field.suffix ?? ''}
        </span>
      </div>
    );
  }
  return null;
}

export function InspectorPanel() {
  const { nodes, setNodes } = useCanvasStore();
  const selectedNode = useMemo(() => nodes.find((n) => n.selected), [nodes]);

  const updateField = useCallback(
    (key: string, value: string | number | boolean) => {
      if (!selectedNode) return;
      setNodes(
        nodes.map((n) =>
          n.id === selectedNode.id
            ? { ...n, data: { ...n.data, [key]: value } }
            : n,
        ),
      );
    },
    [selectedNode, nodes, setNodes],
  );

  if (!selectedNode) {
    return (
      <div className="flex w-64 flex-col border-l border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Settings2 className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-400">Properties</h2>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-slate-400">
          Select a node on the canvas to inspect its properties
        </div>
      </div>
    );
  }

  const fields = FIELD_CONFIGS[selectedNode.type] || FIELD_CONFIGS[selectedNode.data?.nodeType] || DEFAULT_FIELDS;

  return (
    <div className="flex w-64 flex-col border-l border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        {ICON_MAP[selectedNode.type] || <Settings2 className="h-4 w-4 text-slate-400" />}
        <h2 className="text-sm font-semibold text-slate-800">
          {selectedNode.data?.label || selectedNode.type.replace(/_/g, ' ')}
        </h2>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">
                {field.label}
              </label>
              <FieldInput
                field={field}
                value={selectedNode.data?.[field.key]}
                onChange={updateField}
              />
            </div>
          ))}
        </div>

        {/* Simulation metrics overlay when running */}
        {selectedNode.data?.qps !== undefined && (
          <div className="mt-6 border-t border-slate-100 pt-3">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Simulation Live
            </h3>
            <dl className="space-y-1 text-[11px] text-slate-500">
              {selectedNode.data.qps !== undefined && (
                <div className="flex justify-between">
                  <dt>Current QPS</dt>
                  <dd className="font-mono text-slate-700">{Number(selectedNode.data.qps).toLocaleString()}</dd>
                </div>
              )}
              {selectedNode.data.errorRate !== undefined && (
                <div className="flex justify-between">
                  <dt>Error Rate</dt>
                  <dd className={cn("font-mono", (selectedNode.data.errorRate as number) > 30 ? "text-red-600" : "text-slate-700")}>
                    {selectedNode.data.errorRate}%
                  </dd>
                </div>
              )}
              {selectedNode.data.cpu !== undefined && (
                <div className="flex justify-between">
                  <dt>CPU Util</dt>
                  <dd className="font-mono text-slate-700">{selectedNode.data.cpu}%</dd>
                </div>
              )}
              {selectedNode.data.queueDepth !== undefined && selectedNode.data.queueDepth > 0 && (
                <div className="flex justify-between">
                  <dt>Queue Depth</dt>
                  <dd className="font-mono text-amber-600">{selectedNode.data.queueDepth}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Node metadata */}
        <div className="mt-6 border-t border-slate-100 pt-3">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Info
          </h3>
          <dl className="space-y-1 text-[11px] text-slate-500">
            <div className="flex justify-between">
              <dt>Type</dt>
              <dd className="font-mono text-slate-700">{selectedNode.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt>ID</dt>
              <dd className="font-mono text-slate-700 max-w-[120px] truncate">{selectedNode.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Position</dt>
              <dd className="font-mono text-slate-700">
                ({Math.round(selectedNode.position.x)}, {Math.round(selectedNode.position.y)})
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
