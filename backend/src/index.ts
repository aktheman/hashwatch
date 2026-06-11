import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { authRouter } from './routes/auth';
import { minersRouter } from './routes/miners';
import { statsRouter } from './routes/stats';
import { proxyRouter } from './routes/proxy';
import { pushRouter } from './routes/push';
import { createWebSocketServer } from './ws';

const app = express();
const server = createServer(app);
createWebSocketServer(server, '/ws');

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

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`HashWatch API running on :${PORT}`);
});
