import request from 'supertest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

const mockQuery = jest.fn();
jest.mock('../db', () => ({ query: mockQuery }));
jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: Request & { userId?: string }, _res: Response, next: NextFunction) => {
    req.userId = 'test-user-id';
    next();
  },
}));

import { quietHoursRouter } from '../routes/quietHours';
import { clearQuietHoursCache } from '../utils/quietHours';

const app = express();
app.use(express.json());
app.use('/api/settings/quiet-hours', quietHoursRouter);

beforeEach(() => {
  jest.clearAllMocks();
  clearQuietHoursCache();
});

describe('GET /api/settings/quiet-hours', () => {
  it('returns stored quiet hours settings', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { key: 'quiet_hours_enabled', value: 'true' },
        { key: 'quiet_hours_start', value: '22:00' },
        { key: 'quiet_hours_end', value: '07:00' },
        { key: 'quiet_hours_utc_offset', value: '120' },
        { key: 'quiet_hours_allow_critical', value: 'true' },
      ],
    });

    const res = await request(app).get('/api/settings/quiet-hours');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      enabled: true,
      start: '22:00',
      end: '07:00',
      utcOffsetMinutes: 120,
      allowCritical: true,
    });
  });

  it('returns defaults when nothing is stored', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/settings/quiet-hours');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      enabled: false,
      start: '22:00',
      end: '07:00',
      utcOffsetMinutes: 0,
      allowCritical: true,
    });
  });
});

describe('PUT /api/settings/quiet-hours', () => {
  it('saves valid settings', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1 });

    const res = await request(app).put('/api/settings/quiet-hours').send({
      enabled: true,
      start: '21:00',
      end: '06:30',
      utcOffsetMinutes: -60,
      allowCritical: false,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      enabled: true,
      start: '21:00',
      end: '06:30',
      utcOffsetMinutes: -60,
      allowCritical: false,
    });
    expect(mockQuery).toHaveBeenCalledTimes(5);
  });

  it('rejects an invalid time format', async () => {
    const res = await request(app).put('/api/settings/quiet-hours').send({
      enabled: true,
      start: '25:00',
      end: '07:00',
      utcOffsetMinutes: 0,
      allowCritical: true,
    });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range offset', async () => {
    const res = await request(app).put('/api/settings/quiet-hours').send({
      enabled: true,
      start: '22:00',
      end: '07:00',
      utcOffsetMinutes: 999,
      allowCritical: true,
    });

    expect(res.status).toBe(400);
  });

  it('rejects missing fields', async () => {
    const res = await request(app).put('/api/settings/quiet-hours').send({ enabled: true });

    expect(res.status).toBe(400);
  });
});
