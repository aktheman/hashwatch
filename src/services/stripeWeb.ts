import { apiClient } from '../api/client';

export async function createCheckoutSession(priceId: string): Promise<string> {
  const res = await apiClient.post<{ url: string }>('/api/stripe/create-checkout-session', {
    priceId,
  });
  return res.data.url;
}

export function redirectToCheckout(url: string): void {
  window.location.href = url;
}
