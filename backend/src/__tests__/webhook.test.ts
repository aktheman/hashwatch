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

import { sendWebhook, deleteWebhookLogsForUser } from '../services/webhook';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('sendWebhook', () => {
  it('does nothing when user has no webhook_url setting', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await sendWebhook('user-1', {
      event: 'offline',
      minerId: 'm1',
      minerName: 'Test',
      title: 'Test',
      body: 'body',
      timestamp: Date.now(),
    });

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('does nothing when webhook_url is empty', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ value: '' }] });

    await sendWebhook('user-1', {
      event: 'offline',
      minerId: 'm1',
      minerName: 'Test',
      title: 'Test',
      body: 'body',
      timestamp: Date.now(),
    });

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('does nothing when webhook_url does not start with http', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ value: 'ftp://invalid' }] });

    await sendWebhook('user-1', {
      event: 'offline',
      minerId: 'm1',
      minerName: 'Test',
      title: 'Test',
      body: 'body',
      timestamp: Date.now(),
    });

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('sends POST to webhook URL and logs success', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ value: 'https://hooks.example.com/alert' }] })
      .mockResolvedValueOnce({ rowCount: 1 });
    mockPost.mockResolvedValueOnce({ status: 200 });

    const payload = {
      event: 'offline',
      minerId: 'm1',
      minerName: 'TestMiner',
      title: 'Miner Offline',
      body: 'TestMiner (10.0.0.1) has gone offline',
      timestamp: 1234567890,
    };
    await sendWebhook('user-1', payload);

    expect(mockPost).toHaveBeenCalledWith('https://hooks.example.com/alert', payload, {
      timeout: 10_000,
      headers: { 'Content-Type': 'application/json' },
    });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO webhook_logs'), [
      'user-1',
      'offline',
      'https://hooks.example.com/alert',
      'delivered',
      200,
    ]);
  });

  it('logs failure when POST throws', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ value: 'https://hooks.example.com/alert' }] })
      .mockResolvedValueOnce({ rowCount: 1 });
    mockPost.mockRejectedValueOnce(new Error('Network error'));

    await sendWebhook('user-1', {
      event: 'online',
      minerId: 'm1',
      minerName: 'Test',
      title: 'Test',
      body: 'body',
      timestamp: Date.now(),
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO webhook_logs'),
      expect.arrayContaining(['user-1', 'online', 'https://hooks.example.com/alert', 'failed']),
    );
  });
});

describe('deleteWebhookLogsForUser', () => {
  it('deletes all logs for user', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 5 });

    await deleteWebhookLogsForUser('user-1');

    expect(mockQuery).toHaveBeenCalledWith('DELETE FROM webhook_logs WHERE userId = $1', [
      'user-1',
    ]);
  });
});
