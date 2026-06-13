/**
 * apps/frontend/features/canvas/useVersionHistory.ts
 *
 * Hook for managing design version history.
 * Fetches the version list for a design, allows restoring
 * a previous version, and creating snapshots.
 *
 * CHANGE: Implemented from stub — full version list/restore/save
 *          with loading and error states.
 */

'use client';

import { useCallback, useState } from 'react';
import { useCanvasStore, type CanvasNode, type CanvasEdge } from './useCanvasStore';

interface VersionEntry {
  id: string;
  version: number;
  message?: string;
  createdAt: string;
}

interface VersionHistoryState {
  versions: VersionEntry[];
  isLoading: boolean;
  error: string | null;
  currentVersion: number | null;
}

/**
 * Hook for version history operations.
 * Relies on the backend REST API at /api/designs/:id/*.
 */
export function useVersionHistory(designId?: string) {
  const [state, setState] = useState<VersionHistoryState>({
    versions: [],
    isLoading: false,
    error: null,
    currentVersion: null,
  });

  const { nodes, edges, init } = useCanvasStore();

  /**
   * Fetch the version list from the backend.
   */
  const fetchVersions = useCallback(async () => {
    if (!designId) return;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const res = await fetch(`/api/designs/${designId}`);
      if (!res.ok) throw new Error('Failed to load versions');
      const body = await res.json();
      setState((s) => ({
        ...s,
        isLoading: false,
        // Versions are embedded in the design response or fetched separately
        versions: body.data?.versions || [],
        currentVersion: body.data?.canvas?.version || null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, [designId]);

  /**
   * Save the current canvas state as a new version.
   */
  const saveVersion = useCallback(
    async (message?: string) => {
      if (!designId) return;
      setState((s) => ({ ...s, isLoading: true, error: null }));

      try {
        const res = await fetch(`/api/designs/${designId}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodes,
            edges,
            message: message || undefined,
          }),
        });
        if (!res.ok) throw new Error('Failed to save version');
        await fetchVersions();
      } catch (err) {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to save',
        }));
      }
    },
    [designId, nodes, edges, fetchVersions],
  );

  /**
   * Restore a specific version by fetching it and updating the canvas store.
   */
  const restoreVersion = useCallback(
    async (version: number) => {
      if (!designId) return;
      setState((s) => ({ ...s, isLoading: true, error: null }));

      try {
        const res = await fetch(`/api/designs/${designId}/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version }),
        });
        if (!res.ok) throw new Error('Failed to restore version');

        // Re-fetch the full design to get the restored canvas data
        const designRes = await fetch(`/api/designs/${designId}`);
        const body = await designRes.json();
        const canvas = body.data?.canvas;

        if (canvas?.nodes && canvas?.edges) {
          init(canvas.nodes, canvas.edges);
        }

        setState((s) => ({
          ...s,
          isLoading: false,
          currentVersion: version,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to restore',
        }));
      }
    },
    [designId, init],
  );

  return {
    ...state,
    fetchVersions,
    saveVersion,
    restoreVersion,
  };
}
