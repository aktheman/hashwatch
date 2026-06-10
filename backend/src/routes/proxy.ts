import { Router } from 'express';
import axios from 'axios';

export const proxyRouter = Router();

proxyRouter.post('/', async (req, res) => {
  try {
    const { url, method = 'GET', headers, data } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const response = await axios({
      url,
      method: method.toUpperCase(),
      headers: {
        'Connection': 'close',
        ...(headers || {}),
      },
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
      return res.status(502).json({ error: 'unreachable', message: 'Miner is offline (connection refused)' });
    }
    if (e.code === 'ETIMEDOUT' || e.code === 'ENETUNREACH' || e.code === 'ENETDOWN' || e.code === 'EINVAL') {
      return res.status(502).json({ error: 'unreachable', message: 'Miner unreachable (timeout)' });
    }
    if (e.code === 'ERR_BAD_RESPONSE') {
      return res.status(502).json({ error: 'bad_response', message: 'Invalid response from miner' });
    }
    res.status(500).json({ error: 'proxy_error', message: e.message });
  }
});
