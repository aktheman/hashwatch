import request from 'supertest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

const mockQuery = jest.fn();
jest.mock('../db', () => ({ query: mockQuery }));
jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: Request & { userId?: string }, _res: Response, next: NextFunction) => {
    req.userId = 'u1';
    next();
  },
}));

const mockGetMembership = jest.fn();
jest.mock('../routes/teams', () => ({
  getMembership: (...args: unknown[]) => mockGetMembership(...args),
}));

const mockTestTeamWebhook = jest.fn();
jest.mock('../services/teamWebhooks', () => ({
  TEAM_WEBHOOK_EVENT_TYPES: [
    'team_invite',
    'team_join',
    'team_leave',
    'miner_shared',
    'miner_unshared',
    'miner_offline',
    'miner_online',
    'miner_hot',
    'hashrate_drop',
    'pool_lost',
    'share_rejection',
    'test',
  ],
  testTeamWebhook: (...args: unknown[]) => mockTestTeamWebhook(...args),
}));

import { teamWebhooksRouter } from '../routes/teamWebhooks';

const app = express();
app.use(express.json());
app.use('/api/teams', teamWebhooksRouter);

const webhookRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'wh-1',
  teamid: 'team-1',
  name: 'Discord',
  url: 'https://hooks.example.com/team',
  secret: 'secret123',
  eventTypes: [],
  active: true,
  createdat: new Date(),
  updatedat: new Date(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMembership.mockResolvedValue({ teamId: 'team-1', userId: 'u1', role: 'owner' });
});

describe('GET /api/teams/:teamId/webhooks', () => {
  it('lists webhooks for a member', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [webhookRow()] });

    const res = await request(app).get('/api/teams/team-1/webhooks');

    expect(res.status).toBe(200);
    expect(res.body.webhooks).toHaveLength(1);
    expect(res.body.webhooks[0]).toEqual(
      expect.objectContaining({ id: 'wh-1', teamId: 'team-1', name: 'Discord' }),
    );
    expect(res.body.webhooks[0].secret).toBeUndefined();
  });

  it('returns 404 when the requester is not a member', async () => {
    mockGetMembership.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/teams/team-1/webhooks');

    expect(res.status).toBe(404);
  });

  it('rejects a viewer (webhook URLs are sensitive)', async () => {
    mockGetMembership.mockResolvedValueOnce({ teamId: 'team-1', userId: 'u1', role: 'viewer' });

    const res = await request(app).get('/api/teams/team-1/webhooks');

    expect(res.status).toBe(403);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe('POST /api/teams/:teamId/webhooks', () => {
  it('creates a webhook as an admin', async () => {
    const hexSecret = 'a'.repeat(64);
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
    mockQuery.mockResolvedValueOnce({
      rows: [
        webhookRow({
          name: 'Slack',
          url: 'https://hooks.example.com/slack',
          eventTypes: ['team_join'],
          secret: hexSecret,
        }),
      ],
    });

    const res = await request(app)
      .post('/api/teams/team-1/webhooks')
      .send({ name: 'Slack', url: 'https://hooks.example.com/slack', eventTypes: ['team_join'] });

    expect(res.status).toBe(201);
    expect(res.body.webhook).toEqual(expect.objectContaining({ name: 'Slack', teamId: 'team-1' }));
    expect(res.body.webhook.secret).toBe(hexSecret);
    const insertCall = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO team_webhooks'),
    );
    expect(insertCall).toBeDefined();
    expect(insertCall[1]).toEqual([
      'team-1',
      'Slack',
      'https://hooks.example.com/slack',
      expect.stringMatching(/^[0-9a-f]{64}$/),
      ['team_join'],
      true,
    ]);
  });

  it('rejects a viewer', async () => {
    mockGetMembership.mockResolvedValueOnce({ teamId: 'team-1', userId: 'u1', role: 'viewer' });

    const res = await request(app)
      .post('/api/teams/team-1/webhooks')
      .send({ url: 'https://hooks.example.com/x' });

    expect(res.status).toBe(403);
  });

  it('rejects a non-http URL', async () => {
    const res = await request(app)
      .post('/api/teams/team-1/webhooks')
      .send({ url: 'ftp://invalid' });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO team_webhooks'),
      expect.anything(),
    );
  });

  it('rejects an unknown event type', async () => {
    const res = await request(app)
      .post('/api/teams/team-1/webhooks')
      .send({ url: 'https://hooks.example.com/x', eventTypes: ['not_an_event'] });

    expect(res.status).toBe(400);
  });

  it('rejects when the webhook limit is reached', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 20 }] });

    const res = await request(app)
      .post('/api/teams/team-1/webhooks')
      .send({ url: 'https://hooks.example.com/x' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('limit');
  });
});

describe('PATCH /api/teams/:teamId/webhooks/:webhookId', () => {
  it('updates a webhook', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [webhookRow()] });
    mockQuery.mockResolvedValueOnce({ rows: [webhookRow({ name: 'Renamed' })] });

    const res = await request(app)
      .patch('/api/teams/team-1/webhooks/wh-1')
      .send({ name: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.webhook).toEqual(expect.objectContaining({ name: 'Renamed' }));
  });

  it('returns 404 when the webhook does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch('/api/teams/team-1/webhooks/wh-1')
      .send({ name: 'Renamed' });

    expect(res.status).toBe(404);
  });

  it('returns 400 when there are no fields to update', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [webhookRow()] });

    const res = await request(app).patch('/api/teams/team-1/webhooks/wh-1').send({});

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/teams/:teamId/webhooks/:webhookId', () => {
  it('deletes a webhook', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).delete('/api/teams/team-1/webhooks/wh-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
  });

  it('returns 404 when the webhook does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app).delete('/api/teams/team-1/webhooks/wh-1');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/teams/:teamId/webhooks/:webhookId/test', () => {
  it('tests a webhook', async () => {
    mockTestTeamWebhook.mockResolvedValueOnce({ ok: true, status: 200 });

    const res = await request(app).post('/api/teams/team-1/webhooks/wh-1/test');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, status: 200 });
    expect(mockTestTeamWebhook).toHaveBeenCalledWith('team-1', 'wh-1');
  });

  it('returns 404 when the webhook is missing', async () => {
    mockTestTeamWebhook.mockResolvedValueOnce({ ok: false, status: 0 });

    const res = await request(app).post('/api/teams/team-1/webhooks/wh-1/test');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/teams/:teamId/webhooks/:webhookId/rotate', () => {
  it('rotates the secret', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'wh-1', secret: 'old' }] });

    const res = await request(app).post('/api/teams/team-1/webhooks/wh-1/rotate');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('wh-1');
    expect(res.body.secret).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns 404 when the webhook does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/teams/team-1/webhooks/wh-1/rotate');

    expect(res.status).toBe(404);
  });
});

describe('GET /api/teams/:teamId/webhooks/logs', () => {
  it('returns paginated logs', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] });
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          event: 'team_join',
          url: 'https://hooks.example.com',
          status: 'delivered',
          responseCode: 200,
          sentAt: 123,
          attempts: 1,
          nextRetryAt: null,
        },
      ],
    });

    const res = await request(app).get('/api/teams/team-1/webhooks/logs?limit=10&offset=0');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      logs: [
        {
          id: 1,
          event: 'team_join',
          url: 'https://hooks.example.com',
          status: 'delivered',
          responseCode: 200,
          sentAt: 123,
          attempts: 1,
          nextRetryAt: null,
        },
      ],
      total: 1,
      limit: 10,
      offset: 0,
    });
  });

  it('returns 404 when the requester is not a member', async () => {
    mockGetMembership.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/teams/team-1/webhooks/logs');

    expect(res.status).toBe(404);
  });

  it('rejects a viewer (logs expose webhook URLs)', async () => {
    mockGetMembership.mockResolvedValueOnce({ teamId: 'team-1', userId: 'u1', role: 'viewer' });

    const res = await request(app).get('/api/teams/team-1/webhooks/logs');

    expect(res.status).toBe(403);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
