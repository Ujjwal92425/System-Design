/**
 * apps/frontend/lib/socket.ts
 *
 * Socket.io client singleton for real-time collaboration.
 * Connects to the backend WebSocket server with JWT auth.
 *
 * CHANGE: New file — full Socket.io client with room management,
 *          canvas sync, and cursor presence.
 */

'use client';

import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;
let connectionAttempts = 0;
const MAX_RETRIES = 3;

/**
 * Get or create the Socket.io client instance.
 * The token should be a valid JWT access token.
 */
export function getSocket(token?: string): Socket | null {
  if (socket?.connected) return socket;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const authToken = token || (typeof window !== 'undefined' && localStorage.getItem('accessToken'));

  if (!authToken) {
    console.warn('[socket] No auth token available — collab disabled');
    return null;
  }

  if (!socket) {
    socket = io(apiUrl, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RETRIES,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[socket] Connected:', socket?.id);
      connectionAttempts = 0;
    });

    socket.on('connect_error', (err) => {
      connectionAttempts++;
      console.error('[socket] Connection error:', err.message);
      if (connectionAttempts >= MAX_RETRIES) {
        console.warn('[socket] Max retries reached — disabling collaboration');
        socket?.disconnect();
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] Disconnected:', reason);
    });
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

/**
 * Join a design collaboration room.
 */
export function joinDesignRoom(designId: string): void {
  const s = getSocket();
  if (s) {
    s.emit('join:design', designId);
  }
}

/**
 * Leave a design collaboration room.
 */
export function leaveDesignRoom(designId: string): void {
  const s = getSocket();
  if (s) {
    s.emit('leave:design', designId);
  }
}

/**
 * Broadcast canvas node/edge changes to other collaborators.
 */
export function broadcastCanvasUpdate(
  designId: string,
  data: { nodes?: any[]; edges?: any[] },
): void {
  const s = getSocket();
  if (s) {
    s.emit('canvas:update', { designId, ...data });
  }
}

/**
 * Update cursor position for presence.
 */
export function updateCursor(
  designId: string,
  position: { x: number; y: number },
): void {
  const s = getSocket();
  if (s) {
    s.emit('cursor:move', { designId, position });
  }
}

/**
 * Listen for canvas sync events from other users.
 */
export function onCanvasSync(
  cb: (data: { userId: string; nodes?: any[]; edges?: any[] }) => void,
): () => void {
  const s = getSocket();
  if (!s) return () => {};
  s.on('canvas:sync', cb);
  return () => {
    s.off('canvas:sync', cb);
  };
}

/**
 * Listen for cursor updates from other users.
 */
export function onCursorUpdate(
  cb: (data: { userId: string; position: { x: number; y: number } }) => void,
): () => void {
  const s = getSocket();
  if (!s) return () => {};
  s.on('cursor:update', cb);
  return () => {
    s.off('cursor:update', cb);
  };
}

/**
 * Listen for room occupant changes.
 */
export function onRoomOccupants(
  cb: (occupants: { userId: string; name?: string }[]) => void,
): () => void {
  const s = getSocket();
  if (!s) return () => {};
  s.on('room:occupants', cb);
  return () => {
    s.off('room:occupants', cb);
  };
}

/**
 * Disconnect and clean up the socket.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
