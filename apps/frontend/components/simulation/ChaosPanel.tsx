'use client';

import { useState } from 'react';
import { Zap, CheckCircle, Gauge, Network, Database, Skull, Flame, RefreshCw, ShieldAlert } from 'lucide-react';

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

  // CHANGE: Hyperscale Game Day Chaos Presets
  const triggerThunderingHerd = () => {
    let affected = 0;
    nodes.forEach((n) => {
      const t = (n.type || '').toLowerCase();
      const label = (n.data?.label || '').toLowerCase();
      if (t.includes('cache') || t.includes('redis') || label.includes('cache') || label.includes('redis')) {
        onSetNodeChaos(n.id, 'CACHE_EVICTION');
        affected++;
      }
    });
    if (affected === 0 && nodes.length > 0) {
      onSetNodeChaos(nodes[0].id, 'CACHE_EVICTION');
    }
  };

  const triggerRetryStorm = () => {
    let affected = 0;
    nodes.forEach((n) => {
      const t = (n.type || '').toLowerCase();
      const label = (n.data?.label || '').toLowerCase();
      if (t.includes('db') || t.includes('database') || t.includes('sql') || label.includes('db')) {
        onSetNodeChaos(n.id, 'THROTTLE');
        affected++;
      }
    });
    if (affected === 0 && nodes.length > 0) {
      onSetNodeChaos(nodes[nodes.length - 1].id, 'THROTTLE');
    }
  };

  const triggerZonePartition = () => {
    nodes.forEach((n, idx) => {
      if (idx % 2 === 1) {
        onSetNodeChaos(n.id, 'PARTITION');
      }
    });
  };

  const healAll = () => {
    nodes.forEach((n) => onSetNodeChaos(n.id, 'none'));
  };

  const activeFaultsCount = Object.values(nodeChaosModes).filter((m) => m && m !== 'none').length;

  return (
    <div className="bg-white border border-yc-border rounded-xl p-5 flex flex-col gap-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm text-yc-text m-0 font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-yc-accent" />
            <span>Chaos Engineering & Fault Injection</span>
          </h4>
          <p className="mt-0.5 text-[11px] text-yc-text-muted">
            Inject realistic hyperscale faults to test queue backpressure, metastable recovery, and SLAs.
          </p>
        </div>
        {activeFaultsCount > 0 && (
          <button
            onClick={healAll}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold font-mono hover:bg-emerald-100 transition"
          >
            <RefreshCw className="w-3 h-3" />
            Heal All ({activeFaultsCount})
          </button>
        )}
      </div>

      {/* CHANGE: Hyperscale Chaos Presets Bar */}
      <div className="bg-orange-50/50 border border-orange-200/70 rounded-lg p-3">
        <span className="text-[9px] font-mono font-bold text-orange-950 uppercase tracking-wider block mb-2">
          Hyperscale Chaos Presets (SRE Game Day)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={triggerThunderingHerd}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white border border-orange-200 hover:border-orange-400 rounded-md text-[10px] font-bold text-gray-800 hover:text-orange-600 transition shadow-sm"
          >
            <Flame className="w-3 h-3 text-rose-500" />
            <span>Thundering Herd</span>
          </button>
          <button
            onClick={triggerRetryStorm}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white border border-orange-200 hover:border-orange-400 rounded-md text-[10px] font-bold text-gray-800 hover:text-orange-600 transition shadow-sm"
          >
            <Gauge className="w-3 h-3 text-amber-500" />
            <span>Retry Storm Surge</span>
          </button>
          <button
            onClick={triggerZonePartition}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white border border-orange-200 hover:border-orange-400 rounded-md text-[10px] font-bold text-gray-800 hover:text-orange-600 transition shadow-sm"
          >
            <ShieldAlert className="w-3 h-3 text-purple-500" />
            <span>Zone Split Partition</span>
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-gray-50 border border-yc-border rounded-lg">
        {CHAOS_MODES.filter((m) => m.value !== 'none').map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.value}
              onClick={() => setSelectedMode(mode.value)}
              data-track="simulation:chaos_select_mode"
              data-track-mode={mode.value}
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

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
        {nodes.length === 0 ? (
          <p className="text-xs text-yc-text-muted text-center py-4">No nodes on the canvas.</p>
        ) : (
          nodes.map((n) => {
            const currentMode = nodeChaosModes[n.id] || 'none';
            const isFaulted = currentMode !== 'none';
            const modeConfig = CHAOS_MODES.find((m) => m.value === currentMode);
            const ModeIcon = modeConfig?.icon || CheckCircle;

            return (
              <div
                key={n.id}
                className={`flex items-center justify-between p-2.5 px-3.5 rounded-lg border transition-all duration-200 ${
                  isFaulted
                    ? currentMode === 'KILL'
                      ? 'bg-red-50 border-red-200'
                      : currentMode === 'THROTTLE'
                      ? 'bg-amber-50 border-amber-200'
                      : currentMode === 'PARTITION'
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-rose-50 border-rose-200'
                    : 'bg-white border border-yc-border'
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
                  data-track={isFaulted ? 'simulation:chaos_heal' : 'simulation:chaos_inject'}
                  data-track-node={n.id}
                  data-track-mode={isFaulted ? 'none' : selectedMode}
                  className={`px-3 py-1.5 border-none rounded-md text-[10px] font-bold cursor-pointer flex items-center gap-1 transition-colors ${
                    isFaulted
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
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
