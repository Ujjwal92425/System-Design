'use client';

import { ZoomIn, ZoomOut, Maximize, RotateCcw, Map, Grid3X3, Lock, Unlock } from 'lucide-react';

interface CanvasControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onReset: () => void;
  showMiniMap: boolean;
  onToggleMiniMap: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  isLocked: boolean;
  onToggleLock: () => void;
}

export function CanvasControls({
  zoom, onZoomIn, onZoomOut, onFitView, onReset,
  showMiniMap, onToggleMiniMap, showGrid, onToggleGrid, isLocked, onToggleLock,
}: CanvasControlsProps) {
  const btnClass = "w-8 h-8 flex items-center justify-center text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors border-r border-gray-200 last:border-r-0 first:rounded-l-lg last:rounded-r-lg";
  const btnClassActive = "w-8 h-8 flex items-center justify-center text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors border-r border-gray-200 last:border-r-0";

  return (
    <div className="absolute bottom-4 right-4 z-20 flex items-center bg-white border border-gray-200 rounded-lg shadow-md">
      <button onClick={onZoomOut} className={btnClass} title="Zoom Out">
        <ZoomOut className="w-4 h-4" />
      </button>
      <div className="px-2 text-[11px] font-mono font-semibold text-gray-600 min-w-[44px] text-center border-r border-gray-200">
        {Math.round(zoom * 100)}%
      </div>
      <button onClick={onZoomIn} className={btnClass} title="Zoom In">
        <ZoomIn className="w-4 h-4" />
      </button>
      <button onClick={onFitView} className={btnClass} title="Fit View">
        <Maximize className="w-4 h-4" />
      </button>
      <button onClick={onReset} className={btnClass} title="Reset Zoom">
        <RotateCcw className="w-4 h-4" />
      </button>
      <button onClick={onToggleMiniMap} className={showMiniMap ? btnClassActive : btnClass} title="Toggle Minimap">
        <Map className="w-4 h-4" />
      </button>
      <button onClick={onToggleGrid} className={showGrid ? btnClassActive : btnClass} title="Toggle Grid">
        <Grid3X3 className="w-4 h-4" />
      </button>
      <button onClick={onToggleLock} className={isLocked ? btnClassActive : btnClass} title={isLocked ? 'Unlock Canvas' : 'Lock Canvas'}>
        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
      </button>
    </div>
  );
}
