export function isValidBitcoinAddress(address: string): boolean {
  const trimmed = address.trim();

  // Bech32/Bech32m (bc1...)
  if (/^bc1[a-z0-9]{39,59}$/i.test(trimmed)) return true;

  // Legacy (1...) or P2SH (3...)
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed)) return true;

  // Testnet (tb1..., m or n...)
  if (/^(tb1|m|n)[a-z0-9]/i.test(trimmed)) return true;

  return false;
}
