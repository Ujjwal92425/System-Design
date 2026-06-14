'use client';

import { Zap, ZapOff, CheckCircle } from 'lucide-react';

interface NodeItem {
  id: string;
  type: string;
  data: {
    label?: string;
  };
}

interface ChaosPanelProps {
  nodes: NodeItem[];
  failedNodes: string[];
  onToggleFailure: (nodeId: string) => void;
}

export function ChaosPanel({ nodes, failedNodes, onToggleFailure }: ChaosPanelProps) {
  return (
    <div className="bg-yc-bg-alt border border-yc-border rounded-xl p-5 flex flex-col gap-3.5 h-full overflow-y-auto">
      <div>
        <h4 className="text-sm text-yc-text m-0 font-bold flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-yc-accent" />
          <span>Chaos Engineering Console</span>
        </h4>
        <p className="mt-0.5 text-[11px] text-yc-text-muted">
          Simulate node crashes to verify fault tolerance and failover logic.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {nodes.length === 0 ? (
          <p className="text-xs text-yc-text-muted text-center py-4">No nodes on the canvas.</p>
        ) : (
          nodes.map(n => {
            const isFailed = failedNodes.includes(n.id);
            return (
              <div
                key={n.id}
                className={`flex items-center justify-between p-2.5 px-3.5 rounded-lg border transition-all duration-200 ${
                  isFailed
                    ? 'bg-red-50 border-red-200'
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
                  onClick={() => onToggleFailure(n.id)}
                  className={`px-3 py-1.5 border-none rounded-md text-[10px] font-bold cursor-pointer flex items-center gap-1 ${
                    isFailed
                      ? 'bg-emerald-400 text-white hover:bg-emerald-500'
                      : 'bg-red-400 text-white hover:bg-red-500'
                  } transition-colors`}
                >
                  {isFailed ? (
                    <>
                      <CheckCircle className="w-2.5 h-2.5" />
                      <span>HEAL</span>
                    </>
                  ) : (
                    <>
                      <ZapOff className="w-2.5 h-2.5" />
                      <span>CRASH</span>
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
