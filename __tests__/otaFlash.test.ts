import axios from 'axios';
import { flashMinerOTA, batchFlashOTA } from '../src/services/otaFlash';
import { Miner } from '../src/types';

jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const mockPost = axios.post as jest.Mock;

const FIRMWARE_URL = 'https://github.com/akumain/AXEOS/releases/download/1.0.0/ax.bin';

function makeMiner(overrides: Partial<Miner> = {}): Miner {
  return {
    id: 'm1',
    name: 'Miner 1',
    ip: '10.0.0.1',
    port: 80,
    isOnline: true,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('flashMinerOTA', () => {
  it('calls the correct URL and sends the firmwareUrl', async () => {
    mockPost.mockResolvedValue({ status: 200 });

    const result = await flashMinerOTA(makeMiner(), FIRMWARE_URL);

    expect(mockPost).toHaveBeenCalledWith(
      'http://10.0.0.1:80/api/flash',
      { url: FIRMWARE_URL },
      expect.objectContaining({ timeout: 120000 }),
    );
    expect(result).toEqual({ minerId: 'm1', success: true });
  });

  it('returns success: true on status 200', async () => {
    mockPost.mockResolvedValue({ status: 200 });

    const result = await flashMinerOTA(makeMiner(), FIRMWARE_URL);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns success: false when status is not 200', async () => {
    mockPost.mockResolvedValue({ status: 201 });

    const result = await flashMinerOTA(makeMiner(), FIRMWARE_URL);

    expect(result).toEqual({ minerId: 'm1', success: false });
  });

  it('returns success: false with the error message when the request fails', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'));

    const result = await flashMinerOTA(makeMiner(), FIRMWARE_URL);

    expect(result).toEqual({ minerId: 'm1', success: false, error: 'Network Error' });
  });

  it('uses "Unknown error" for non-Error rejections', async () => {
    mockPost.mockRejectedValue('oops');

    const result = await flashMinerOTA(makeMiner(), FIRMWARE_URL);

    expect(result).toEqual({ minerId: 'm1', success: false, error: 'Unknown error' });
  });

  it('forwards the abort signal to axios', async () => {
    mockPost.mockResolvedValue({ status: 200 });
    const controller = new AbortController();

    await flashMinerOTA(makeMiner(), FIRMWARE_URL, controller.signal);

    expect(mockPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});

describe('batchFlashOTA', () => {
  it('flashes every miner and reports progress per miner plus completion', async () => {
    mockPost.mockResolvedValue({ status: 200 });
    const miners = [
      makeMiner(),
      makeMiner({ id: 'm2', name: 'Miner 2', ip: '10.0.0.2' }),
      makeMiner({ id: 'm3', name: 'Miner 3', ip: '10.0.0.3' }),
    ];
    const onProgress = jest.fn();

    const results = await batchFlashOTA(miners, FIRMWARE_URL, onProgress);

    expect(mockPost).toHaveBeenCalledTimes(3);
    expect(results).toEqual([
      { minerId: 'm1', success: true },
      { minerId: 'm2', success: true },
      { minerId: 'm3', success: true },
    ]);
    expect(onProgress).toHaveBeenCalledTimes(4);
    expect(onProgress).toHaveBeenNthCalledWith(1, 0, 3, 'Miner 1');
    expect(onProgress).toHaveBeenNthCalledWith(2, 1, 3, 'Miner 2');
    expect(onProgress).toHaveBeenNthCalledWith(3, 2, 3, 'Miner 3');
    expect(onProgress).toHaveBeenNthCalledWith(4, 3, 3, 'Complete');
  });

  it('falls back to the miner IP when it has no name', async () => {
    mockPost.mockResolvedValue({ status: 200 });
    const onProgress = jest.fn();

    await batchFlashOTA([makeMiner({ name: '' })], FIRMWARE_URL, onProgress);

    expect(onProgress).toHaveBeenCalledWith(0, 1, '10.0.0.1');
  });

  it('stops flashing when the abort signal fires mid-batch', async () => {
    const controller = new AbortController();
    mockPost.mockImplementation(() => {
      controller.abort();
      return Promise.resolve({ status: 200 });
    });
    const miners = [makeMiner(), makeMiner({ id: 'm2', name: 'Miner 2', ip: '10.0.0.2' })];
    const onProgress = jest.fn();

    const results = await batchFlashOTA(miners, FIRMWARE_URL, onProgress, controller.signal);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(results).toEqual([{ minerId: 'm1', success: true }]);
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2, 'Complete');
  });

  it('does not flash any miner when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const onProgress = jest.fn();

    const results = await batchFlashOTA(
      [makeMiner(), makeMiner({ id: 'm2', ip: '10.0.0.2' })],
      FIRMWARE_URL,
      onProgress,
      controller.signal,
    );

    expect(mockPost).not.toHaveBeenCalled();
    expect(results).toEqual([]);
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(2, 2, 'Complete');
  });

  it('collects per-miner failures without throwing', async () => {
    mockPost.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({ status: 200 });
    const onProgress = jest.fn();

    const results = await batchFlashOTA(
      [makeMiner(), makeMiner({ id: 'm2', name: 'Miner 2', ip: '10.0.0.2' })],
      FIRMWARE_URL,
      onProgress,
    );

    expect(results).toEqual([
      { minerId: 'm1', success: false, error: 'timeout' },
      { minerId: 'm2', success: true },
    ]);
    expect(onProgress).toHaveBeenCalledTimes(3);
  });
});
