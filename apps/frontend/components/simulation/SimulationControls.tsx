'use client';

import { Play, Square, RefreshCw } from 'lucide-react';

interface SimulationControlsProps {
  isRunning: boolean;
  scenario: string;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onScenarioChange: (scenario: string) => void;
}

export function SimulationControls({
  isRunning,
  scenario,
  onStart,
  onStop,
  onReset,
  onScenarioChange
}: SimulationControlsProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap bg-yc-bg-alt border border-yc-border rounded-xl py-3 px-5 justify-between">
      <div className="flex items-center gap-2">
        {!isRunning ? (
          <button
            onClick={onStart}
            className="px-4 py-2 bg-yc-accent text-white border-none rounded-md text-[11px] font-bold cursor-pointer flex items-center gap-1.5 hover:bg-yc-accent-hover transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>START SIMULATION</span>
          </button>
        ) : (
          <button
            onClick={onStop}
            className="px-4 py-2 bg-red-400 text-white border-none rounded-md text-[11px] font-bold cursor-pointer flex items-center gap-1.5 hover:bg-red-500 transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>STOP SIMULATION</span>
          </button>
        )}

        <button
          onClick={onReset}
          className="px-3 py-2 bg-transparent border border-yc-border text-yc-text-secondary rounded-md text-[11px] font-bold cursor-pointer flex items-center gap-1.5 hover:bg-yc-bg-card transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>RESET</span>
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[10px] text-yc-text-muted font-bold uppercase">Load Profile:</span>
        <select
          value={scenario}
          onChange={(e) => onScenarioChange(e.target.value)}
          className="font-mono bg-yc-bg-card border border-yc-border rounded-md px-2.5 py-1.5 text-[11px] text-yc-text outline-none cursor-pointer"
        >
          <option value="steady">Steady State</option>
          <option value="spike">Traffic Spike Surges</option>
          <option value="chaos">Chaos Test (CacheStampede)</option>
        </select>
      </div>
    </div>
  );
}
