import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { authRouter } from './routes/auth';
import { minersRouter } from './routes/miners';
import { statsRouter } from './routes/stats';
import { proxyRouter } from './routes/proxy';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/miners', minersRouter);
app.use('/api/stats', statsRouter);
app.use('/api/proxy', proxyRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'subscribe' && msg.minerId) {
        ws.send(JSON.stringify({ type: 'subscribed', minerId: msg.minerId }));
      }
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'invalid message' }));
    }
  });
});

function broadcast(minerId: string, payload: object) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ minerId, ...payload }));
    }
  });
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`HashWatch API running on :${PORT}`);
});

export { broadcast };
