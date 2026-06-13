/**
 * apps/backend/src/ws/socketServer.ts
 *
 * WebSocket server for real-time collaboration on architecture diagrams.
 *
 * Architecture:
 *   - Each design document is a "room" — users join via `design:<id>`.
 *   - Node/edge changes are broadcast to all other room occupants.
 *   - Cursor positions are shared as lightweight presence updates.
 *   - No conflict resolution (OT/CRDT) — last-write-wins for MVP.
 *
 * CHANGE: New file — complete Socket.io collab server with room
 *          management, presence, and canvas sync.
 */

import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';

let io: Server | null = null;

interface CollabUser {
  userId: string;
  name?: string;
  cursor?: { x: number; y: number };
}

/**
 * Initialize the Socket.io server attached to the HTTP server.
 */
export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // ── Authentication middleware ──────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verifyToken(token as string);
      (socket as any).user = { userId: payload.sub, name: payload.name };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────
  io.on('connection', (socket) => {
    const user = (socket as any).user as CollabUser;
    logger.info({ userId: user.userId, socketId: socket.id }, 'Collab client connected');

    // Join a design room
    socket.on('join:design', (designId: string) => {
      const room = `design:${designId}`;
      socket.join(room);
      logger.info({ userId: user.userId, designId }, 'User joined collab room');

      // Notify others
      socket.to(room).emit('user:joined', { userId: user.userId, name: user.name });

      // Send current occupant list
      const roomSockets = io?.sockets.adapter.rooms.get(room);
      const occupants: CollabUser[] = [];
      if (roomSockets) {
        for (const sid of roomSockets) {
          const s = io?.sockets.sockets.get(sid);
          if (s) {
            occupants.push({ userId: (s as any).user.userId, name: (s as any).user.name });
          }
        }
      }
      socket.emit('room:occupants', occupants);
    });

    // Leave a design room
    socket.on('leave:design', (designId: string) => {
      const room = `design:${designId}`;
      socket.leave(room);
      socket.to(room).emit('user:left', { userId: user.userId });
      logger.info({ userId: user.userId, designId }, 'User left collab room');
    });

    // Node/edge changes (broadcast to others in the room)
    socket.on('canvas:update', (data: { designId: string; nodes?: any[]; edges?: any[] }) => {
      socket.to(`design:${data.designId}`).emit('canvas:sync', {
        userId: user.userId,
        nodes: data.nodes,
        edges: data.edges,
      });
    });

    // Cursor position
    socket.on('cursor:move', (data: { designId: string; position: { x: number; y: number } }) => {
      socket.to(`design:${data.designId}`).emit('cursor:update', {
        userId: user.userId,
        position: data.position,
      });
    });

    // Selection sync
    socket.on('selection:change', (data: { designId: string; selectedNodeIds: string[] }) => {
      socket.to(`design:${data.designId}`).emit('selection:sync', {
        userId: user.userId,
        selectedNodeIds: data.selectedNodeIds,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      logger.info({ userId: user.userId, socketId: socket.id }, 'Collab client disconnected');
      // Notify all rooms the user was in
      for (const room of socket.rooms) {
        if (room.startsWith('design:')) {
          socket.to(room).emit('user:left', { userId: user.userId });
        }
      }
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}

/**
 * Get the Socket.io server instance (for use in route handlers if needed).
 */
export function getIO(): Server | null {
  return io;
}
