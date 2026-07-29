jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn().mockResolvedValue({ status: 200 }) },
}));
const mockAxiosPost = (jest.requireMock('axios') as any).default.post;

const mockGetSetting = jest.fn().mockReturnValue(null);
const mockSetSetting = jest.fn().mockResolvedValue(undefined);
jest.mock('../src/db/database', () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
  setSetting: (...args: unknown[]) => mockSetSetting(...args),
}));

import {
  formatSlackMessage,
  formatDiscordMessage,
  sendTeamWebhook,
  getTeamWebhooks,
  saveTeamWebhook,
  deleteTeamWebhook,
  testTeamWebhook,
  __resetTeamWebhooks,
  WebhookPayload,
  TeamWebhook,
} from '../src/services/teamWebhooks';

const samplePayload: WebhookPayload = {
  event: 'miner_offline',
  minerName: 'TestMiner',
  minerIp: '192.168.1.10',
  message: 'Miner went offline',
  severity: 'warning',
  timestamp: 1700000000000,
};

const sampleWebhook: TeamWebhook = {
  id: 'tw_test1',
  name: 'Slack Channel',
  url: 'https://hooks.slack.com/test',
  type: 'slack',
  enabled: true,
  events: ['miner_offline'],
};

beforeEach(() => {
  jest.clearAllMocks();
  __resetTeamWebhooks();
  mockAxiosPost.mockResolvedValue({ status: 200 });
  mockGetSetting.mockReturnValue(null);
  mockSetSetting.mockResolvedValue(undefined);
});

describe('formatSlackMessage', () => {
  it('returns valid Slack Block Kit format', () => {
    const msg = formatSlackMessage(samplePayload) as Record<string, unknown>;
    expect(msg.blocks).toBeDefined();
    expect(Array.isArray(msg.blocks)).toBe(true);
    expect(msg.blocks.length).toBeGreaterThanOrEqual(3);

    const header = msg.blocks[0] as Record<string, unknown>;
    expect(header.type).toBe('header');
    expect((header.text as Record<string, unknown>).text).toContain('HashWatch Alert');
  });

  it('includes miner name and IP fields', () => {
    const msg = formatSlackMessage(samplePayload) as Record<string, unknown>;
    const section = msg.blocks[2] as Record<string, unknown>;
    expect(section.type).toBe('section');
    expect(section.fields).toBeDefined();
    const fields = section.fields as Array<Record<string, unknown>>;
    const fieldTexts = fields.map((f) => f.text as string);
    expect(fieldTexts.some((t) => t.includes('TestMiner'))).toBe(true);
    expect(fieldTexts.some((t) => t.includes('192.168.1.10'))).toBe(true);
  });
});

describe('formatDiscordMessage', () => {
  it('returns valid Discord embed format', () => {
    const msg = formatDiscordMessage(samplePayload) as Record<string, unknown>;
    expect(msg.embeds).toBeDefined();
    expect(Array.isArray(msg.embeds)).toBe(true);

    const embed = (msg.embeds as Array<Record<string, unknown>>)[0];
    expect(embed.title).toContain('HashWatch Alert');
    expect(embed.description).toBe('Miner went offline');
    expect(typeof embed.color).toBe('number');
    expect(embed.fields).toBeDefined();
    expect(embed.footer).toBeDefined();
    expect(embed.timestamp).toBeDefined();
  });
});

describe('sendTeamWebhook', () => {
  it('returns true on success', async () => {
    const result = await sendTeamWebhook(sampleWebhook, samplePayload);
    expect(result).toBe(true);
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
  });

  it('returns false on failure', async () => {
    mockAxiosPost.mockRejectedValue(new Error('network error'));
    const result = await sendTeamWebhook(sampleWebhook, samplePayload);
    expect(result).toBe(false);
  });

  it('returns false when webhook is disabled', async () => {
    const disabled = { ...sampleWebhook, enabled: false };
    const result = await sendTeamWebhook(disabled, samplePayload);
    expect(result).toBe(false);
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it('returns false when URL is empty', async () => {
    const noUrl = { ...sampleWebhook, url: '' };
    const result = await sendTeamWebhook(noUrl, samplePayload);
    expect(result).toBe(false);
  });
});

describe('getTeamWebhooks', () => {
  it('returns webhooks from DB', async () => {
    mockGetSetting.mockReturnValue(JSON.stringify([sampleWebhook]));
    const webhooks = await getTeamWebhooks();
    expect(webhooks).toHaveLength(1);
    expect(webhooks[0].id).toBe('tw_test1');
  });

  it('returns empty array when nothing stored', async () => {
    mockGetSetting.mockReturnValue(null);
    const webhooks = await getTeamWebhooks();
    expect(webhooks).toEqual([]);
  });
});

describe('saveTeamWebhook', () => {
  it('persists new webhook', async () => {
    const input = {
      name: 'Discord',
      url: 'https://discord.com/api',
      type: 'discord' as const,
      enabled: true,
      events: [],
    };
    const saved = await saveTeamWebhook(input);
    expect(saved.id).toBeDefined();
    expect(saved.name).toBe('Discord');
    expect(mockSetSetting).toHaveBeenCalled();
  });
});

describe('deleteTeamWebhook', () => {
  it('removes webhook by id', async () => {
    mockGetSetting.mockReturnValue(JSON.stringify([sampleWebhook]));
    await deleteTeamWebhook('tw_test1');
    expect(mockSetSetting).toHaveBeenCalled();
    const saved = JSON.parse(mockSetSetting.mock.calls[0][1]) as TeamWebhook[];
    expect(saved).toHaveLength(0);
  });
});

describe('testTeamWebhook', () => {
  it('sends test message and returns true on success', async () => {
    const result = await testTeamWebhook(sampleWebhook);
    expect(result).toBe(true);
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    const body = mockAxiosPost.mock.calls[0][1] as Record<string, unknown>;
    expect(body).toBeDefined();
  });

  it('returns false on failure', async () => {
    mockAxiosPost.mockRejectedValue(new Error('timeout'));
    const result = await testTeamWebhook(sampleWebhook);
    expect(result).toBe(false);
  });
});
