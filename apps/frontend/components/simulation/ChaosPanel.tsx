'use client';

import { useState } from 'react';
import { Zap, ZapOff, CheckCircle, Gauge, Network, Database, Skull } from 'lucide-react';

interface NodeItem {
  id: string;
  type: string;
  data: {
    label?: string;
  };
}

const CHAOS_MODES = [
  { value: 'none', label: 'None', icon: CheckCircle, color: 'text-gray-400' },
  { value: 'KILL', label: 'Kill', icon: Skull, color: 'text-red-500' },
  { value: 'THROTTLE', label: 'Throttle', icon: Gauge, color: 'text-amber-500' },
  { value: 'PARTITION', label: 'Partition', icon: Network, color: 'text-purple-500' },
  { value: 'CACHE_EVICTION', label: 'Cache Evict', icon: Database, color: 'text-rose-500' },
];

interface ChaosPanelProps {
  nodes: NodeItem[];
  nodeChaosModes: Record<string, string>;
  onSetNodeChaos: (nodeId: string, mode: string) => void;
}

export function ChaosPanel({ nodes, nodeChaosModes, onSetNodeChaos }: ChaosPanelProps) {
  const [selectedMode, setSelectedMode] = useState<string>('KILL');

  return (
    <div className="bg-yc-bg-alt border border-yc-border rounded-xl p-5 flex flex-col gap-3.5 h-full overflow-y-auto">
      <div>
        <h4 className="text-sm text-yc-text m-0 font-bold flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-yc-accent" />
          <span>Chaos Engineering Console</span>
        </h4>
        <p className="mt-0.5 text-[11px] text-yc-text-muted">
          Inject faults into nodes to test system resilience.
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-yc-bg-card border border-yc-border rounded-lg">
        {CHAOS_MODES.filter((m) => m.value !== 'none').map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.value}
              onClick={() => setSelectedMode(mode.value)}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[9px] font-bold transition-all ${
                selectedMode === mode.value
                  ? 'bg-white shadow-sm border border-yc-border text-gray-800'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3 h-3" />
              {mode.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        {nodes.length === 0 ? (
          <p className="text-xs text-yc-text-muted text-center py-4">No nodes on the canvas.</p>
        ) : (
          nodes.map(n => {
            const currentMode = nodeChaosModes[n.id] || 'none';
            const isFaulted = currentMode !== 'none';
            const modeConfig = CHAOS_MODES.find((m) => m.value === currentMode);
            const ModeIcon = modeConfig?.icon || CheckCircle;

            return (
              <div
                key={n.id}
                className={`flex items-center justify-between p-2.5 px-3.5 rounded-lg border transition-all duration-200 ${
                  isFaulted
                    ? currentMode === 'KILL' ? 'bg-red-50 border-red-200'
                      : currentMode === 'THROTTLE' ? 'bg-amber-50 border-amber-200'
                      : currentMode === 'PARTITION' ? 'bg-purple-50 border-purple-200'
                      : 'bg-rose-50 border-rose-200'
                    : 'bg-yc-bg-card border-yc-border'
                }`}
              >
                <div>
                  <span className="text-xs text-yc-text font-semibold">
                    {n.data.label || n.type}
                  </span>
                  <p className="mt-0.5 font-mono text-[8px] text-yc-text-muted">
                    {n.id} &middot; {n.type.split('_').join(' ')}
                  </p>
                </div>

                <button
                  onClick={() => onSetNodeChaos(n.id, isFaulted ? 'none' : selectedMode)}
                  className={`px-3 py-1.5 border-none rounded-md text-[10px] font-bold cursor-pointer flex items-center gap-1 transition-colors ${
                    isFaulted
                      ? 'bg-emerald-400 text-white hover:bg-emerald-500'
                      : 'bg-orange-400 text-white hover:bg-orange-500'
                  }`}
                >
                  {isFaulted ? (
                    <>
                      <CheckCircle className="w-2.5 h-2.5" />
                      <span>HEAL</span>
                    </>
                  ) : (
                    <>
                      <ModeIcon className="w-2.5 h-2.5" />
                      <span>{modeConfig?.label || 'CRASH'}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
