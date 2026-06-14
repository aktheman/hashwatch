import { Router } from 'express';
import axios from 'axios';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { isAllowedProxyUrl } from '../utils/urlValidation';

export const proxyRouter = Router();
proxyRouter.use(authMiddleware);

const BLOCKED_HEADERS = new Set([
  'host',
  'authorization',
  'cookie',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'connection',
]);

function sanitizeHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  const clean: Record<string, string> = { Connection: 'close' };
  if (!headers) return clean;
  for (const [key, value] of Object.entries(headers)) {
    if (!BLOCKED_HEADERS.has(key.toLowerCase())) {
      clean[key] = value;
    }
  }
  return clean;
}

proxyRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { url, method = 'GET', headers, data } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    if (!isAllowedProxyUrl(url)) {
      return res
        .status(403)
        .json({ error: 'forbidden', message: 'Only private miner URLs are allowed' });
    }

    const response = await axios({
      url,
      method: method.toUpperCase(),
      headers: sanitizeHeaders(headers),
      data,
      timeout: 8000,
      responseType: 'json',
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      return res.status(502).json({
        error: 'upstream_error',
        upstreamStatus: response.status,
        message: `Miner returned status ${response.status}`,
      });
    }

    res.json(response.data);
  } catch (e: any) {
    if (e.code === 'ECONNREFUSED' || e.code === 'EHOSTUNREACH') {
      return res
        .status(502)
        .json({ error: 'unreachable', message: 'Miner is offline (connection refused)' });
    }
    if (
      e.code === 'ETIMEDOUT' ||
      e.code === 'ENETUNREACH' ||
      e.code === 'ENETDOWN' ||
      e.code === 'EINVAL'
    ) {
      return res.status(502).json({ error: 'unreachable', message: 'Miner unreachable (timeout)' });
    }
    if (e.code === 'ERR_BAD_RESPONSE') {
      return res
        .status(502)
        .json({ error: 'bad_response', message: 'Invalid response from miner' });
    }
    console.error('Proxy error:', e);
    res.status(500).json({ error: 'proxy_error', message: 'Internal proxy error' });
  }
});

proxyRouter.post('/restart', async (req: AuthRequest, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }
    if (!isAllowedProxyUrl(url)) {
      return res
        .status(403)
        .json({ error: 'forbidden', message: 'Only private miner URLs are allowed' });
    }
    await axios({ url, method: 'POST', timeout: 5000, validateStatus: () => true });
    res.json({ success: true });
  } catch (e: any) {
    console.error('Restart proxy error:', e);
    res.status(502).json({ error: 'restart_failed', message: 'Could not reach miner' });
  }
});
