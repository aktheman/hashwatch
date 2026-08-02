jest.mock('../src/api/client', () => ({
  __esModule: true,
  apiClient: { post: jest.fn() },
}));

import { apiClient } from '../src/api/client';
import { createCheckoutSession, redirectToCheckout } from '../src/services/stripeWeb';

const mockPost = apiClient.post as jest.Mock;

const originalLocation = window.location;

beforeEach(() => {
  jest.clearAllMocks();
  mockPost.mockResolvedValue({ data: { url: '' } });
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: '' },
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
});

describe('createCheckoutSession', () => {
  it('posts to the checkout endpoint with the priceId and returns the URL', async () => {
    mockPost.mockResolvedValue({ data: { url: 'https://checkout.example/session-1' } });

    const url = await createCheckoutSession('price_123');

    expect(mockPost).toHaveBeenCalledWith('/api/stripe/create-checkout-session', {
      priceId: 'price_123',
    });
    expect(url).toBe('https://checkout.example/session-1');
  });

  it('includes trialPeriodDays in the body when it is greater than zero', async () => {
    mockPost.mockResolvedValue({ data: { url: 'https://checkout.example/session-1' } });

    await createCheckoutSession('price_123', 7);

    expect(mockPost).toHaveBeenCalledWith('/api/stripe/create-checkout-session', {
      priceId: 'price_123',
      trialPeriodDays: 7,
    });
  });

  it('does not include trialPeriodDays when it is zero', async () => {
    mockPost.mockResolvedValue({ data: { url: 'https://checkout.example/session-1' } });

    await createCheckoutSession('price_123', 0);

    expect(mockPost).toHaveBeenCalledWith('/api/stripe/create-checkout-session', {
      priceId: 'price_123',
    });
  });

  it('does not include trialPeriodDays when it is undefined', async () => {
    mockPost.mockResolvedValue({ data: { url: 'https://checkout.example/session-1' } });

    await createCheckoutSession('price_123');

    expect(mockPost).toHaveBeenCalledWith('/api/stripe/create-checkout-session', {
      priceId: 'price_123',
    });
  });
});

describe('redirectToCheckout', () => {
  it('sets window.location.href to the given URL', () => {
    redirectToCheckout('https://checkout.example/session-1');

    expect(window.location.href).toBe('https://checkout.example/session-1');
  });

  it('does not throw', () => {
    expect(() => redirectToCheckout('https://checkout.example/session-1')).not.toThrow();
  });
});
