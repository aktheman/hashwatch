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

import { alertRulesRouter } from '../routes/alertRules';

const app = express();
app.use(express.json());
app.use('/api/alert-rules', alertRulesRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/alert-rules/:minerId', () => {
  it('returns default rules when no DB row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'm1' }] }).mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/alert-rules/m1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      enabled: true,
      tempthreshold: 70,
      hashratedroppercent: 50,
      offlinereminderminutes: 5,
      uptimethresholdhours: 24,
    });
  });

  it('returns saved rules from DB with column name mapping', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'm1' }] }).mockResolvedValueOnce({
      rows: [
        {
          enabled: true,
          tempthreshold: 75,
          hashratedroppercent: 60,
          offlinereminderminutes: 10,
          uptimethresholdhours: 48,
        },
      ],
    });

    const res = await request(app).get('/api/alert-rules/m1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      enabled: true,
      tempThreshold: 75,
      hashrateDropPercent: 60,
      offlineReminderMinutes: 10,
      uptimeThresholdHours: 48,
    });
  });

  it('returns 404 when miner not owned', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/alert-rules/m1');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('miner not found');
  });
});

describe('PUT /api/alert-rules/:minerId', () => {
  it('upserts alert rules', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'm1' }] });

    const res = await request(app).put('/api/alert-rules/m1').send({
      tempThreshold: 80,
      hashrateDropPercent: 70,
      offlineReminderMinutes: 15,
      uptimeThresholdHours: 12,
      enabled: false,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockQuery).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO miner_alert_rules'),
      ['test-user-id', 'm1', 80, 70, 15, 12, false],
    );
  });

  it('uses defaults for missing fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'm1' }] });

    const res = await request(app).put('/api/alert-rules/m1').send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockQuery).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO miner_alert_rules'),
      ['test-user-id', 'm1', 70, 50, 5, 24, true],
    );
  });

  it('returns 404 when miner not owned', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put('/api/alert-rules/m1').send({ tempThreshold: 80 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('miner not found');
  });
});
