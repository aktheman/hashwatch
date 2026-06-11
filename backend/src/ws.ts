import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';

const raw = process.env.JWT_SECRET;
if (!raw) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: string = raw;

const HEARTBEAT_INTERVAL = 30000;

interface AuthWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

let wss: WebSocketServer;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export function createWebSocketServer(server: ReturnType<typeof createServer>, path: string) {
  wss = new WebSocketServer({ server, path });

  wss.on('connection', (ws: AuthWebSocket) => {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'pong') {
          ws.isAlive = true;
          return;
        }
        if (msg.type === 'auth' && msg.token) {
          try {
            const payload = jwt.verify(msg.token, JWT_SECRET) as { userId: string };
            ws.userId = payload.userId;
            ws.send(JSON.stringify({ type: 'auth_ok' }));
          } catch {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'invalid token' }));
          }
          return;
        }
        if (ws.userId && msg.type === 'subscribe' && msg.minerId) {
          ws.send(JSON.stringify({ type: 'subscribed', minerId: msg.minerId }));
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'invalid message' }));
      }
    });
  });

  heartbeatTimer = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as AuthWebSocket;
      if (!client.isAlive) {
        client.terminate();
        return;
      }
      client.isAlive = false;
      client.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on('close', () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  });

  return wss;
}

export function broadcast(userId: string, payload: object) {
  if (!wss) return;
  wss.clients.forEach((client) => {
    const c = client as AuthWebSocket;
    if (c.readyState === 1 && c.userId === userId) {
      c.send(JSON.stringify(payload));
    }
  });
}
