/**
 * apps/frontend/features/canvas/useCollaboration.ts
 *
 * Hook that connects the canvas store to the WebSocket collab server.
 * Joins/leaves the design room and syncs canvas changes in real-time.
 *
 * CHANGE: New file — real-time collaboration hook bridging the
 *          canvas Zustand store with Socket.io.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useCanvasStore } from './useCanvasStore';
import {
  getSocket,
  joinDesignRoom,
  leaveDesignRoom,
  broadcastCanvasUpdate,
  onCanvasSync,
  onRoomOccupants,
} from '../../lib/socket';

interface UseCollaborationOptions {
  designId?: string;
  enabled?: boolean;
}

export function useCollaboration({ designId, enabled = true }: UseCollaborationOptions) {
  const { nodes, edges } = useCanvasStore();
  const lastSyncRef = useRef<string>('');
  const isRemoteUpdate = useRef(false);

  // Join/leave the design room
  useEffect(() => {
    if (!designId || !enabled) return;

    joinDesignRoom(designId);

    return () => {
      leaveDesignRoom(designId);
    };
  }, [designId, enabled]);

  // Listen for incoming canvas sync from other users
  useEffect(() => {
    if (!designId || !enabled) return;

    const cleanup = onCanvasSync((data) => {
      isRemoteUpdate.current = true;
      const { setNodes, setEdges } = useCanvasStore.getState();
      if (data.nodes) setNodes(data.nodes as any);
      if (data.edges) setEdges(data.edges as any);
    });

    return cleanup;
  }, [designId, enabled]);

  // Broadcast local changes to other users (debounced)
  useEffect(() => {
    if (!designId || !enabled || isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    const serialized = JSON.stringify({ nodes, edges });
    if (serialized === lastSyncRef.current) return;
    lastSyncRef.current = serialized;

    const timer = setTimeout(() => {
      broadcastCanvasUpdate(designId, { nodes, edges });
    }, 500); // 500ms debounce to batch rapid changes

    return () => clearTimeout(timer);
  }, [designId, enabled, nodes, edges]);

  // Listen for room occupant changes
  useEffect(() => {
    if (!designId || !enabled) return;

    const cleanup = onRoomOccupants((occupants) => {
      console.log(`[collab] ${occupants.length} collaborator(s) in room`);
    });

    return cleanup;
  }, [designId, enabled]);

  return {
    isConnected: getSocket()?.connected ?? false,
  };
}
