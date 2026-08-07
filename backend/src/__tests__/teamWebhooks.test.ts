const mockQuery = jest.fn();
jest.mock('../db', () => ({ query: mockQuery }));
jest.mock('../services/sentry', () => ({ captureException: jest.fn() }));
jest.mock('../utils/ssrf', () => ({ isAllowedUrl: jest.fn().mockResolvedValue(true) }));

const mockPost = jest.fn();
jest.mock('axios', () => ({
  post: (...args: unknown[]) => mockPost(...args),
  AxiosError: class extends Error {
    response?: { status: number };
    constructor(msg: string, status: number) {
      super(msg);
      this.response = { status };
    }
  },
}));

import {
  sendTeamWebhooks,
  testTeamWebhook,
  retryFailedTeamWebhooks,
  startTeamWebhookRetrySweeper,
  stopTeamWebhookRetrySweeper,
} from '../services/teamWebhooks';

const webhookRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'wh-1',
  teamid: 'team-1',
  url: 'https://hooks.example.com/team',
  secret: 'secret123',
  eventTypes: [],
  active: true,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [] });
});

describe('sendTeamWebhooks', () => {
  it('delivers to matching webhooks with signature headers', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [webhookRow()] });
    mockPost.mockResolvedValueOnce({ status: 200 });

    const payload = {
      event: 'team_join',
      title: 'New Team Member',
      body: 'bob@test.com joined Alpha',
      timestamp: 123,
    };
    await sendTeamWebhooks('team-1', 'team_join', payload);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith(
      'https://hooks.example.com/team',
      JSON.stringify(payload),
      {
        timeout: 10_000,
        headers: {
          'Content-Type': 'application/json',
          'X-HashWatch-Signature': expect.stringMatching(/^t=\d+,v1=[0-9a-f]{64}$/),
          'X-HashWatch-Event': 'team_join',
          'X-HashWatch-Timestamp': expect.any(String),
          'X-HashWatch-Version': '1',
        },
      },
    );
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO webhook_logs'), [
      'team-1',
      'wh-1',
      'team_join',
      'https://hooks.example.com/team',
      'delivered',
      200,
      JSON.stringify(payload),
    ]);
  });

  it('skips webhooks that do not match the event type', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [webhookRow({ eventTypes: ['miner_offline'] })],
    });

    await sendTeamWebhooks('team-1', 'team_join', {
      event: 'team_join',
      title: 'New Team Member',
      body: 'bob joined',
      timestamp: 123,
    });

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('delivers to a webhook with an empty eventTypes list', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [webhookRow({ eventTypes: [] })],
    });
    mockPost.mockResolvedValueOnce({ status: 200 });

    await sendTeamWebhooks('team-1', 'miner_hot', {
      event: 'miner_hot',
      title: 'High Temperature',
      body: 'Miner is hot',
      timestamp: 123,
    });

    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('logs a failed delivery', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [webhookRow()] });
    mockPost.mockRejectedValueOnce(new Error('Network error'));

    await sendTeamWebhooks('team-1', 'team_join', {
      event: 'team_join',
      title: 'New Team Member',
      body: 'bob joined',
      timestamp: 123,
    });

    const insertCall = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO webhook_logs'),
    );
    expect(insertCall).toBeDefined();
    expect(insertCall[1]).toEqual(
      expect.arrayContaining([
        'team-1',
        'wh-1',
        'team_join',
        'https://hooks.example.com/team',
        'failed',
      ]),
    );
  });

  it('does nothing when there are no matching webhooks', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await sendTeamWebhooks('team-1', 'team_join', {
      event: 'team_join',
      title: 'New Team Member',
      body: 'bob joined',
      timestamp: 123,
    });

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('swallows query failures', async () => {
    mockQuery.mockRejectedValueOnce(new Error('db down'));

    await expect(
      sendTeamWebhooks('team-1', 'team_join', {
        event: 'team_join',
        title: 'New Team Member',
        body: 'bob joined',
        timestamp: 123,
      }),
    ).resolves.toBeUndefined();
  });
});

describe('testTeamWebhook', () => {
  it('sends a test payload and returns ok', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [webhookRow()] });
    mockPost.mockResolvedValueOnce({ status: 200 });

    const result = await testTeamWebhook('team-1', 'wh-1');

    expect(result).toEqual({ ok: true, status: 200 });
    expect(mockPost).toHaveBeenCalledWith(
      'https://hooks.example.com/team',
      expect.stringContaining('"event":"test"'),
      expect.any(Object),
    );
  });

  it('returns not-found result when the webhook does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await testTeamWebhook('team-1', 'missing');

    expect(result).toEqual({ ok: false, status: 0 });
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('retryFailedTeamWebhooks', () => {
  it('retries due webhooks and marks them delivered', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          logid: 10,
          url: 'https://hooks.example.com/team',
          event: 'team_join',
          payload: '{"event":"team_join"}',
          secret: 'secret123',
          attempts: 1,
        },
      ],
    });
    mockPost.mockResolvedValueOnce({ status: 200 });

    await retryFailedTeamWebhooks();

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'delivered'"),
      [10, 200],
    );
  });

  it('updates attempts and nextRetryAt on continued failure', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          logid: 11,
          url: 'https://hooks.example.com/team',
          event: 'team_join',
          payload: '{"event":"team_join"}',
          secret: 'secret123',
          attempts: 2,
        },
      ],
    });
    mockPost.mockRejectedValueOnce(new Error('down'));

    await retryFailedTeamWebhooks();

    const updateCall = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes("SET status = 'failed'"),
    );
    expect(updateCall).toBeDefined();
    const [, params] = updateCall as [string, unknown[]];
    expect(params[0]).toBe(11);
    expect(params[2]).toBe(3);
    expect(params[3]).not.toBeNull();
  });

  it('does nothing when there are no due webhooks', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await retryFailedTeamWebhooks();

    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('retry sweeper', () => {
  afterEach(() => {
    stopTeamWebhookRetrySweeper();
  });

  it('starts and stops without leaking intervals', () => {
    expect(() => {
      startTeamWebhookRetrySweeper();
      startTeamWebhookRetrySweeper();
    }).not.toThrow();
    expect(() => stopTeamWebhookRetrySweeper()).not.toThrow();
  });
});
