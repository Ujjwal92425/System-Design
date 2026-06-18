'use client';

import { Play, Square, RefreshCw } from 'lucide-react';

interface SimulationControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export function SimulationControls({
  isRunning,
  onStart,
  onStop,
  onReset,
}: SimulationControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {!isRunning ? (
        <button
          onClick={onStart}
          className="flex-1 px-4 py-2.5 bg-yc-accent text-white border-none rounded-lg text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-yc-accent-hover transition-colors"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>START</span>
        </button>
      ) : (
        <button
          onClick={onStop}
          className="flex-1 px-4 py-2.5 bg-red-500 text-white border-none rounded-lg text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-red-600 transition-colors"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>STOP</span>
        </button>
      )}
      <button
        onClick={onReset}
        className="px-3 py-2.5 bg-transparent border border-yc-border text-yc-text-secondary rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1.5 hover:bg-yc-bg-card transition-colors"
        title="Reset metrics and chaos"
      >
        <RefreshCw className="w-3 h-3" />
      </button>
    </div>
  );
}
