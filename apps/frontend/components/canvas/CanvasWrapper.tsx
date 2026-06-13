/**
 * apps/frontend/components/canvas/CanvasWrapper.tsx
 *
 * Page-level wrapper around the Canvas that includes the toolbar,
 * inspector panel, and keyboard shortcuts.
 *
 * CHANGE: Implemented from stub — full canvas editor layout.
 */

'use client';

import { useCallback, useEffect } from 'react';
import { Canvas } from './Canvas';
import { Toolbar } from './panels/Toolbar';
import { InspectorPanel } from './panels/InspectorPanel';
import { useCanvasStore } from '../../features/canvas/useCanvasStore';
import { useAutoSave } from '../../features/canvas/useAutoSave';

interface CanvasWrapperProps {
  designId?: string;
}

export function CanvasWrapper({ designId }: CanvasWrapperProps) {
  const { undo, redo, deleteSelected, duplicateSelected } = useCanvasStore();

  // Initialize auto-save when a design is loaded
  useAutoSave(designId);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isInput = (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA';
      if (isInput) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!isInput) deleteSelected();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
      }
    },
    [undo, redo, deleteSelected, duplicateSelected],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-full w-full">
      {/* Toolbar — left side */}
      <Toolbar />

      {/* Canvas — center */}
      <div className="flex-1">
        <Canvas />
      </div>

      {/* Inspector panel — right side */}
      <InspectorPanel />
    </div>
  );
}
