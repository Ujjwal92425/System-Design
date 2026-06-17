'use client';

import { useCallback, useState } from 'react';
import { designsService } from '@/services/designs';
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

export function useVersionHistory(designId?: string) {
  const [state, setState] = useState<VersionHistoryState>({
    versions: [],
    isLoading: false,
    error: null,
    currentVersion: null,
  });

  const { nodes, edges, init } = useCanvasStore();

  const fetchVersions = useCallback(async () => {
    if (!designId) return;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const data = await designsService.get(designId);
      setState((s) => ({
        ...s,
        isLoading: false,
        versions: data.versions || [],
        currentVersion: data.canvas?.version || null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, [designId]);

  const saveVersion = useCallback(
    async (message?: string) => {
      if (!designId) return;
      setState((s) => ({ ...s, isLoading: true, error: null }));

      try {
        await designsService.save(designId, {
          nodes,
          edges,
          message: message || undefined,
        });
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

  const restoreVersion = useCallback(
    async (version: number) => {
      if (!designId) return;
      setState((s) => ({ ...s, isLoading: true, error: null }));

      try {
        await designsService.restore(designId, version);

        const data = await designsService.get(designId);
        const canvas = data.canvas;

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
