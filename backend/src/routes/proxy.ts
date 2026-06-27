import { Router } from 'express';
import axios from 'axios';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { isAllowedProxyUrl } from '../utils/urlValidation';
import { captureException } from '../services/sentry';

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
  } catch (e: unknown) {
    const sentryContext: Record<string, unknown> = { url: req.body.url, method: req.body.method };

    if (e && typeof e === 'object' && 'code' in e) {
      const code = (e as { code?: string }).code;
      if (code === 'ECONNREFUSED' || code === 'EHOSTUNREACH') {
        captureException(e as unknown, sentryContext);
        return res
          .status(502)
          .json({ error: 'unreachable', message: 'Miner is offline (connection refused)' });
      }
      if (
        code === 'ETIMEDOUT' ||
        code === 'ENETUNREACH' ||
        code === 'ENETDOWN' ||
        code === 'EINVAL'
      ) {
        captureException(e as unknown, sentryContext);
        return res
          .status(502)
          .json({ error: 'unreachable', message: 'Miner unreachable (timeout)' });
      }
      if (code === 'ERR_BAD_RESPONSE') {
        captureException(e as unknown, sentryContext);
        return res
          .status(502)
          .json({ error: 'bad_response', message: 'Invalid response from miner' });
      }
    }

    captureException(e as unknown, sentryContext);
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
  } catch (e: unknown) {
    captureException(e as unknown, { route: 'proxy.restart' });
    res.status(502).json({ error: 'restart_failed', message: 'Could not reach miner' });
  }
});
