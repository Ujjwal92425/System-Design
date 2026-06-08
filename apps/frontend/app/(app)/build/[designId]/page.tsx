'use client';

import React, { useEffect } from 'react';
import { useCanvasStore } from '@/features/canvas/useCanvasStore';
import { NodeType } from '@sd-os/shared';

export default function CanvasWorkspace({ params }: { params: { designId: string } }) {
  const { nodes, edges, addNode, loadDesign } = useCanvasStore();

  useEffect(() => {
    // Mock load
    loadDesign([
      { id: '1', type: NodeType.LOAD_BALANCER, position: { x: 100, y: 150 }, data: { label: 'Load Balancer' } },
      { id: '2', type: NodeType.WEB_SERVER, position: { x: 300, y: 150 }, data: { label: 'API Gateway' } }
    ], []);
  }, [loadDesign]);

  return (
    <div className="flex-1 flex overflow-hidden min-h-[500px]">
      {/* Tool Library left panel */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-950 p-6 space-y-6">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Component Library</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.values(NodeType).slice(0, 8).map((type) => (
            <button
              key={type}
              onClick={() => addNode(type, 200, 200)}
              className="p-3 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-[10px] font-semibold text-center rounded-lg transition capitalize text-zinc-300"
            >
              {type.toLowerCase().replace('_', ' ')}
            </button>
          ))}
        </div>
      </aside>

      {/* Main drawing area */}
      <div className="flex-1 bg-zinc-950 relative flex items-center justify-center border-r border-zinc-900">
        <div className="absolute top-6 left-6 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-400">
          Design Workspace ID: {params.designId}
        </div>
        
        {/* Render simple visual elements representing nodes */}
        <div className="space-y-6 w-full max-w-lg">
          <div className="text-center text-xs font-semibold text-zinc-500 uppercase">Previewing Nodes</div>
          <div className="flex items-center justify-center gap-12">
            {nodes.map((n) => (
              <div key={n.id} className="w-24 h-24 border border-zinc-800 bg-zinc-900 rounded-xl flex flex-col items-center justify-center gap-2 shadow-xl">
                <span className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                  OS
                </span>
                <span className="text-[10px] text-zinc-400 text-center font-semibold">{n.data.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inspector Right Panel */}
      <aside className="w-80 bg-zinc-950 p-6 space-y-6">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Inspector</h3>
        <p className="text-xs text-zinc-500">Select an element in the canvas to examine its operational parameters, capacity thresholds, or latency benchmarks.</p>
      </aside>
    </div>
  );
}
