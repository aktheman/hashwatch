import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

export const errorsRouter = Router();

interface ClientError {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp?: number;
  platform?: string;
}

interface ClientEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
  platform?: string;
}

interface ErrorPayload {
  errors?: ClientError[];
  events?: ClientEvent[];
  appVersion?: string;
}

const store: ErrorPayload[] = [];
const MAX_STORE_SIZE = 1000;
const MAX_ERRORS_PER_REQUEST = 100;
const MAX_EVENTS_PER_REQUEST = 100;

const errorLimiter = rateLimit({ windowMs: 60_000, max: 10 });

errorsRouter.use(errorLimiter);

errorsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { errors, events, appVersion } = req.body as ErrorPayload;

    if (!Array.isArray(errors) && !Array.isArray(events)) {
      return res.status(400).json({ error: 'errors or events array is required' });
    }

    if (Array.isArray(errors) && errors.length > MAX_ERRORS_PER_REQUEST) {
      return res.status(400).json({ error: `max ${MAX_ERRORS_PER_REQUEST} errors per request` });
    }

    if (Array.isArray(events) && events.length > MAX_EVENTS_PER_REQUEST) {
      return res.status(400).json({ error: `max ${MAX_EVENTS_PER_REQUEST} events per request` });
    }

    const received = (errors?.length || 0) + (events?.length || 0);

    if (received > 0) {
      if (store.length >= MAX_STORE_SIZE) {
        store.splice(0, store.length - MAX_STORE_SIZE + 1);
      }
      store.push({ errors, events, appVersion });
    }

    res.json({ received });
  } catch {
    res.status(500).json({ error: 'internal server error' });
  }
});
