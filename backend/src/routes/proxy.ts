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
    });

    res.json(response.data);
  } catch (e: any) {
    if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' || e.code === 'ENETUNREACH') {
      return res.status(502).json({ error: 'unreachable', message: `Cannot reach ${e.config?.url || 'target'}` });
    }
    res.status(500).json({ error: 'proxy_error', message: e.message });
  }
});
