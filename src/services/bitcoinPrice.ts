import { useState, useEffect } from 'react';

const PRICE_TTL_MS = 60_000;
const FALLBACK_PRICE = 100_000;
const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';

let _price = FALLBACK_PRICE;
let _lastUpdated = 0;
let _fetchPromise: Promise<number> | null = null;

async function fetchPrice(): Promise<number> {
  if (_fetchPromise) return _fetchPromise;
  _fetchPromise = (async () => {
    try {
      const res = await fetch(COINGECKO_URL);
      if (!res.ok) return _price;
      const data = await res.json();
      const usd = data?.bitcoin?.usd;
      if (typeof usd === 'number' && usd > 0) {
        _price = usd;
        _lastUpdated = Date.now();
      }
      return _price;
    } catch {
      return _price;
    }
  })();
  const price = await _fetchPromise;
  _fetchPromise = null;
  return price;
}

export async function getBitcoinPrice(): Promise<number> {
  if (Date.now() - _lastUpdated < PRICE_TTL_MS && _lastUpdated > 0) {
    return _price;
  }
  return fetchPrice();
}

export function useBitcoinPrice(): {
  price: number;
  loading: boolean;
  lastUpdated: number;
} {
  const [price, setPrice] = useState(_price);
  const [loading, setLoading] = useState(_lastUpdated === 0);
  const [lastUpdated, setLastUpdated] = useState(_lastUpdated);

  useEffect(() => {
    let active = true;

    async function refresh() {
      setLoading(true);
      const p = await getBitcoinPrice();
      if (active) {
        setPrice(p);
        setLastUpdated(_lastUpdated);
        setLoading(false);
      }
    }

    refresh();
    const id = setInterval(refresh, PRICE_TTL_MS);
    if (typeof id === 'object' && id !== null && 'unref' in id) {
      (id as { unref: () => void }).unref();
    }

    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return { price, loading, lastUpdated };
}

export function formatSatoshiBTC(amount: number): string {
  const btc = amount / 100_000_000;
  if (btc >= 1) return `${btc.toFixed(4)} BTC`;
  if (btc >= 0.001) return `${(btc * 1000).toFixed(2)} mBTC`;
  if (btc >= 0.000001) return `${(btc * 1_000_000).toFixed(0)} μBTC`;
  return `${amount.toLocaleString('en-US')} sat`;
}

export function convertBTCToUSD(btcAmount: number, price?: number): string {
  const p = price ?? _price;
  const usd = btcAmount * p;
  if (usd >= 1)
    return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (usd >= 0.01) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(4)}`;
}

export function __resetBitcoinPrice(): void {
  _price = FALLBACK_PRICE;
  _lastUpdated = 0;
  _fetchPromise = null;
}
