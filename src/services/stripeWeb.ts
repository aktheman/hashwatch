import { apiClient } from '../api/client';

export async function createCheckoutSession(
  priceId: string,
  trialPeriodDays?: number,
): Promise<string> {
  const body: Record<string, unknown> = { priceId };
  if (trialPeriodDays && trialPeriodDays > 0) {
    body.trialPeriodDays = trialPeriodDays;
  }
  const res = await apiClient.post<{ url: string }>('/api/stripe/create-checkout-session', body);
  return res.data.url;
}

export function redirectToCheckout(url: string): void {
  window.location.href = url;
}
