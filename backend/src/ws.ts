import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { query } from './db';

const raw = process.env.JWT_SECRET;
if (!raw) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: string = raw;

const HEARTBEAT_INTERVAL = 30000;
const AUTH_TIMEOUT = 30000;

interface AuthWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
  authTimer?: ReturnType<typeof setTimeout>;
}

let wss: WebSocketServer;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export function createWebSocketServer(server: ReturnType<typeof createServer>, path: string) {
  wss = new WebSocketServer({ server, path });

  wss.on('connection', (ws: AuthWebSocket) => {
    ws.isAlive = true;

    ws.authTimer = setTimeout(() => {
      if (!ws.userId) {
        ws.send(JSON.stringify({ type: 'auth_error', message: 'authentication timeout' }));
        ws.close();
      }
    }, AUTH_TIMEOUT);

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
            if (ws.authTimer) clearTimeout(ws.authTimer);
            ws.send(JSON.stringify({ type: 'auth_ok' }));
          } catch {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'invalid token' }));
          }
          return;
        }
        if (!ws.userId) {
          ws.send(JSON.stringify({ type: 'error', message: 'not authenticated' }));
          return;
        }
        if (msg.type === 'subscribe' && msg.minerId) {
          query('SELECT id FROM miners WHERE id = $1 AND userId = $2', [msg.minerId, ws.userId])
            .then((result) => {
              if (result.rows.length > 0) {
                ws.send(JSON.stringify({ type: 'subscribed', minerId: msg.minerId }));
              } else {
                ws.send(JSON.stringify({ type: 'error', message: 'miner not found' }));
              }
            })
            .catch(() => {
              ws.send(JSON.stringify({ type: 'error', message: 'subscription failed' }));
            });
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'invalid message' }));
      }
    });

    ws.on('close', () => {
      if (ws.authTimer) clearTimeout(ws.authTimer);
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
