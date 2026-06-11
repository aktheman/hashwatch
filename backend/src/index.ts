import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { authRouter } from './routes/auth';
import { minersRouter } from './routes/miners';
import { statsRouter } from './routes/stats';
import { proxyRouter } from './routes/proxy';
import { pushRouter } from './routes/push';

const raw = process.env.JWT_SECRET;
if (!raw) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: string = raw;

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/miners', minersRouter);
app.use('/api/stats', statsRouter);
app.use('/api/proxy', proxyRouter);
app.use('/api/push', pushRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

interface AuthWebSocket extends WebSocket {
  userId?: string;
}

wss.on('connection', (ws: AuthWebSocket) => {
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
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

function broadcast(userId: string, payload: object) {
  wss.clients.forEach((client) => {
    const c = client as AuthWebSocket;
    if (c.readyState === 1 && c.userId === userId) {
      c.send(JSON.stringify(payload));
    }
  });
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`HashWatch API running on :${PORT}`);
});

export { broadcast };
