import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { simulationService } from '../modules/simulation/simulation.service';
import { TickSnapshot } from '@sd-os/simulation-engine';
import { db } from '@sd-os/db';

let io: Server | null = null;

interface CollabUser {
  userId: string;
  name?: string;
  cursor?: { x: number; y: number };
}

interface CollabSocket extends Socket {
  collabUser: CollabUser;
  subscribedRunId: string | null;
}

interface OTEvent {
  seq: number;
  type: 'add_node' | 'move_node' | 'delete_node' | 'add_edge' | 'delete_edge' | 'update_node_data' | 'batch';
  nodeId?: string;
  edgeId?: string;
  payload?: any;
  userId: string;
}

const OT_BUFFER_SIZE = 100;
const otBuffers = new Map<string, OTEvent[]>();

function applyOT(local: OTEvent[], incoming: OTEvent): OTEvent[] {
  const result: OTEvent[] = [...local];
  const insertAt = local.findIndex((e) => e.seq > incoming.seq);
  if (insertAt === -1) {
    result.push(incoming);
  } else {
    result.splice(insertAt, 0, incoming);
  }
  while (result.length > OT_BUFFER_SIZE) result.shift();
  return result;
}

function getCollabUser(socket: Socket): CollabUser {
  return (socket as CollabSocket).collabUser;
}

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

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = verifyToken(token as string);
      (socket as CollabSocket).collabUser = { userId: payload.sub, name: payload.name };
      (socket as CollabSocket).subscribedRunId = null;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as CollabSocket;
    const user = socket.collabUser;
    logger.info({ userId: user.userId, socketId: socket.id }, 'Collab client connected');

    socket.on('join:design', async (designId: string, ack?: (ok: boolean) => void) => {
      const room = `design:${designId}`;

      // Verify user owns or has access to this design
      try {
        const design = await db.design.findFirst({
          where: { id: designId, userId: user.userId, deletedAt: null },
          select: { id: true },
        });
        if (!design) {
          logger.warn({ userId: user.userId, designId }, 'User attempted to join unowned design room');
          socket.emit('join:error', { message: 'Access denied — you do not own this design' });
          if (ack) ack(false);
          return;
        }
      } catch (err) {
        logger.error({ err, userId: user.userId, designId }, 'Error verifying design ownership');
        socket.emit('join:error', { message: 'Failed to verify design access' });
        if (ack) ack(false);
        return;
      }

      socket.join(room);
      logger.info({ userId: user.userId, designId }, 'User joined collab room');
      socket.to(room).emit('user:joined', { userId: user.userId, name: user.name });

      const roomSockets = io?.sockets.adapter.rooms.get(room);
      const occupants: CollabUser[] = [];
      if (roomSockets) {
        for (const sid of roomSockets) {
          const s = io?.sockets.sockets.get(sid);
          if (s) {
            occupants.push(getCollabUser(s));
          }
        }
      }
      socket.emit('room:occupants', occupants);

      if (!otBuffers.has(designId)) {
        otBuffers.set(designId, []);
      }
      socket.emit('ot:buffer', otBuffers.get(designId));
      if (ack) ack(true);
    });

    socket.on('leave:design', (designId: string) => {
      const room = `design:${designId}`;
      socket.leave(room);
      socket.to(room).emit('user:left', { userId: user.userId });
      logger.info({ userId: user.userId, designId }, 'User left collab room');

      const roomSockets = io?.sockets.adapter.rooms.get(room);
      if (!roomSockets || roomSockets.size === 0) {
        otBuffers.delete(designId);
      }
    });

    socket.on('canvas:update', (data: { designId: string; nodes?: any[]; edges?: any[] }) => {
      socket.to(`design:${data.designId}`).emit('canvas:sync', {
        userId: user.userId,
        nodes: data.nodes,
        edges: data.edges,
      });
    });

    socket.on('ot:event', (data: { designId: string; event: OTEvent }) => {
      const buffer = otBuffers.get(data.designId) || [];
      const updated = applyOT(buffer, { ...data.event, userId: user.userId });
      otBuffers.set(data.designId, updated);
      socket.to(`design:${data.designId}`).emit('ot:apply', {
        userId: user.userId,
        event: data.event,
      });
    });

    socket.on('cursor:move', (data: { designId: string; position: { x: number; y: number } }) => {
      socket.to(`design:${data.designId}`).emit('cursor:update', {
        userId: user.userId,
        position: data.position,
      });
    });

    socket.on('selection:change', (data: { designId: string; selectedNodeIds: string[] }) => {
      socket.to(`design:${data.designId}`).emit('selection:sync', {
        userId: user.userId,
        selectedNodeIds: data.selectedNodeIds,
      });
    });

    socket.on('simulation:subscribe', (data: { runId: string; designId: string }) => {
      socket.subscribedRunId = data.runId;
      const active = simulationService.getActiveRun(data.runId, user.userId);
      if (active) {
        const room = `simulation:${data.runId}`;
        socket.join(room);
        logger.info({ userId: user.userId, runId: data.runId }, 'User subscribed to simulation ticks');

        active.onTick = (tick: TickSnapshot) => {
          io?.to(room).emit('simulation:tick', {
            runId: data.runId,
            tick,
          });
        };

        socket.emit('simulation:subscribed', { runId: data.runId });
      } else {
        socket.emit('simulation:error', { message: 'Active simulation run not found' });
      }
    });

    socket.on('simulation:unsubscribe', (data: { runId: string }) => {
      if (socket.subscribedRunId === data.runId) {
        socket.leave(`simulation:${data.runId}`);
        socket.subscribedRunId = null;
        logger.info({ userId: user.userId, runId: data.runId }, 'User unsubscribed from simulation ticks');
      }
    });

    socket.on('disconnect', () => {
      logger.info({ userId: user.userId, socketId: socket.id }, 'Collab client disconnected');
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

export function getIO(): Server | null {
  return io;
}
