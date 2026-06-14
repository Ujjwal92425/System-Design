/**
 * apps/frontend/components/canvas/panels/InspectorPanel.tsx
 *
 * Right-side property panel for the selected node or edge.
 * Shows configurable fields like label, capacity, latency, etc.
 * Changes update the canvas store in real-time.
 *
 * CHANGE: Implemented from stub — full property inspector with
 *          type-specific configuration fields for each node type.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { NodeType } from '@sd-os/shared';
import { useCanvasStore, type CanvasNode } from '../../../features/canvas/useCanvasStore';
import { cn } from '@sd-os/ui';
import {
  Shield, Scale, Server, Database, Hexagon, Zap, ArrowLeftRight,
  Globe, Archive, BookOpen, Box, KeyRound, Bell, Search, Monitor, Settings2,
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

const FIELD_CONFIGS: Record<string, { label: string; key: string; type: 'text' | 'number' | 'boolean' }[]> = {
  [NodeType.LOAD_BALANCER]: [
    { label: 'Label', key: 'label', type: 'text' },
    { label: 'Capacity (QPS)', key: 'capacity', type: 'number' },
    { label: 'Latency (ms)', key: 'latency', type: 'number' },
  ],
  [NodeType.CACHE]: [
    { label: 'Label', key: 'label', type: 'text' },
    { label: 'Hit Rate (%)', key: 'hitRate', type: 'number' },
    { label: 'Hit Latency (ms)', key: 'hitLatencyMs', type: 'number' },
  ],
  [NodeType.DATABASE_SQL]: [
    { label: 'Label', key: 'label', type: 'text' },
    { label: 'Max Connections', key: 'capacity', type: 'number' },
    { label: 'Query Latency (ms)', key: 'latency', type: 'number' },
    { label: 'Read Replica', key: 'replicationEnabled', type: 'boolean' },
  ],
  [NodeType.QUEUE]: [
    { label: 'Label', key: 'label', type: 'text' },
    { label: 'Processing Rate (msg/s)', key: 'processingRate', type: 'number' },
  ],
  [NodeType.WEB_SERVER]: [
    { label: 'Label', key: 'label', type: 'text' },
    { label: 'Capacity (QPS)', key: 'capacity', type: 'number' },
  ],
};

const DEFAULT_FIELDS = [
  { label: 'Label', key: 'label', type: 'text' as const },
];

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

  const fields = FIELD_CONFIGS[selectedNode.type] || DEFAULT_FIELDS;

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
              {field.type === 'text' && (
                <input
                  type="text"
                  value={selectedNode.data?.[field.key] || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                />
              )}
              {field.type === 'number' && (
                <input
                  type="number"
                  value={selectedNode.data?.[field.key] ?? ''}
                  onChange={(e) => updateField(field.key, Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                />
              )}
              {field.type === 'boolean' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!selectedNode.data?.[field.key]}
                    onChange={(e) => updateField(field.key, e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                  />
                  <span className="text-xs text-slate-600">Enabled</span>
                </label>
              )}
            </div>
          ))}
        </div>

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
