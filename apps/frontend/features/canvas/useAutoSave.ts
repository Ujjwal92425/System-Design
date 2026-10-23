'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useCanvasStore } from './useCanvasStore';
import { api } from '../../lib/api';

export function useAutoSave(designId: string) {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const dirty = useCanvasStore((state) => state.dirty);
  const markSaved = useCanvasStore((state) => state.markSaved);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const revisionRef = useRef(0);

  // Keep latest state in ref for beacon and unmount
  const stateRef = useRef({ nodes, edges, dirty });
  useEffect(() => {
    stateRef.current = { nodes, edges, dirty };
    revisionRef.current += 1;
  }, [nodes, edges, dirty]);

  // Only one save request may run at a time. A save finishing after a newer
  // edit must not mark that newer edit as persisted.
  const saveSnapshot = useCallback(async (message: string) => {
    if (savingRef.current) {
      queuedSaveRef.current = true;
      return;
    }

    const snapshot = stateRef.current;
    if (!snapshot.dirty) return;

    const revision = revisionRef.current;
    savingRef.current = true;
    try {
      await api.post(`/designs/${designId}/save`, {
        nodes: snapshot.nodes,
        edges: snapshot.edges,
        message,
      });
      if (revision === revisionRef.current) {
        markSaved();
      }
    } catch (err) {
      console.error('Failed to auto-save canvas:', err);
    } finally {
      savingRef.current = false;
      if (queuedSaveRef.current) {
        queuedSaveRef.current = false;
        void saveSnapshot('Auto-save snapshot');
      }
    }
  }, [designId, markSaved]);

  // Debounced auto-save function
  useEffect(() => {
    if (!dirty) return;

    if (savingRef.current) {
      queuedSaveRef.current = true;
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void saveSnapshot('Auto-save snapshot');
    }, 30000); // 30 seconds debounce

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [dirty, saveSnapshot]);

  // Save on tab close / reload / navigate away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const { dirty } = stateRef.current;
      if (!dirty) return;

      // Request browser to show a confirmation dialog
      e.preventDefault();
      e.returnValue = 'You have unsaved system architecture changes.';

      // Beacon cannot carry the Bearer access token used by this API, so it
      // would silently fail. The confirmation prevents accidental loss while
      // the queued save above handles normal SPA navigation.
    };

    const handleUnmountSave = () => {
      void saveSnapshot('Workspace closed save');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleUnmountSave();
    };
  }, [saveSnapshot]);
}
