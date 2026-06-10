'use client';

import { useEffect, useRef } from 'react';
import { useCanvasStore } from './useCanvasStore';
import { api } from '../../lib/api';

export function useAutoSave(designId: string) {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const dirty = useCanvasStore((state) => state.dirty);
  const markSaved = useCanvasStore((state) => state.markSaved);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep latest state in ref for beacon and unmount
  const stateRef = useRef({ nodes, edges, dirty });
  useEffect(() => {
    stateRef.current = { nodes, edges, dirty };
  }, [nodes, edges, dirty]);

  // Debounced auto-save function
  useEffect(() => {
    if (!dirty) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      try {
        const { nodes, edges } = stateRef.current;
        await api.post(`/designs/${designId}/save`, {
          nodes,
          edges,
          message: 'Auto-save snapshot',
        });
        markSaved();
      } catch (err) {
        console.error('Failed to auto-save canvas:', err);
      }
    }, 30000); // 30 seconds debounce

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [dirty, designId, markSaved]);

  // Save on tab close / reload / navigate away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const { nodes, edges, dirty } = stateRef.current;
      if (!dirty) return;

      // Request browser to show a confirmation dialog
      e.preventDefault();
      e.returnValue = 'You have unsaved system architecture changes.';

      // Attempt background save using beacon
      const payload = JSON.stringify({ nodes, edges, message: 'Unload auto-save snapshot' });
      navigator.sendBeacon(
        `/api/designs/${designId}/save`,
        new Blob([payload], { type: 'application/json' })
      );
    };

    const handleUnmountSave = () => {
      const { nodes, edges, dirty } = stateRef.current;
      if (!dirty) return;
      
      // SPA navigation unmount save
      api.post(`/designs/${designId}/save`, {
        nodes,
        edges,
        message: 'Workspace closed save',
      }).then(() => {
        markSaved();
      }).catch(err => {
        console.error('Failed to save workspace on unmount:', err);
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleUnmountSave();
    };
  }, [designId, markSaved]);
}
