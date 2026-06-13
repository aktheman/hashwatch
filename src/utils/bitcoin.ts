// Minimal SHA-256 for BTC address checksum verification
function sha256(data: Uint8Array): Uint8Array {
  // SHA-256 round constants
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  // Initial hash values
  let H0 = 0x6a09e667,
    H1 = 0xbb67ae85,
    H2 = 0x3c6ef372,
    H3 = 0xa54ff53a;
  let H4 = 0x510e527f,
    H5 = 0x9b05688c,
    H6 = 0x1f83d9ab,
    H7 = 0x5be0cd19;

  // Pre-processing: append 0x80, pad to 56 mod 64 bytes, then 64-bit length in bits
  const bitLen = data.length * 8;
  const padLen = (data.length + 9 + 63) & ~63;
  const padded = new Uint8Array(padLen);
  padded.set(data);
  padded[data.length] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
  dv.setUint32(padLen - 4, bitLen >>> 0, false);

  const W = new Uint32Array(64);

  for (let offset = 0; offset < padLen; offset += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = dv.getUint32(offset + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = ror(W[t - 15], 7) ^ ror(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = ror(W[t - 2], 17) ^ ror(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }

    let a = H0,
      b = H1,
      c = H2,
      d = H3,
      e = H4,
      f = H5,
      g = H6,
      h = H7;

    for (let t = 0; t < 64; t++) {
      const S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
      const S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H0 = (H0 + a) | 0;
    H1 = (H1 + b) | 0;
    H2 = (H2 + c) | 0;
    H3 = (H3 + d) | 0;
    H4 = (H4 + e) | 0;
    H5 = (H5 + f) | 0;
    H6 = (H6 + g) | 0;
    H7 = (H7 + h) | 0;
  }

  const out = new Uint8Array(32);
  const outDv = new DataView(out.buffer);
  outDv.setUint32(0, H0, false);
  outDv.setUint32(4, H1, false);
  outDv.setUint32(8, H2, false);
  outDv.setUint32(12, H3, false);
  outDv.setUint32(16, H4, false);
  outDv.setUint32(20, H5, false);
  outDv.setUint32(24, H6, false);
  outDv.setUint32(28, H7, false);
  return out;
}

function ror(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Decode(s: string): Uint8Array | null {
  // Convert base58 to big-endian bytes
  const result: number[] = [0];
  for (const ch of s) {
    const val = BASE58_ALPHABET.indexOf(ch);
    if (val < 0) return null;
    let carry = val;
    for (let j = 0; j < result.length; j++) {
      carry += result[j] * 58;
      result[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      result.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Leading 1s become leading zeros
  const leadingZeros = s.match(/^1*/)?.[0]?.length ?? 0;
  const bytes = new Uint8Array(leadingZeros + result.length);
  for (let i = 0; i < leadingZeros; i++) bytes[i] = 0;
  for (let i = 0; i < result.length; i++) bytes[leadingZeros + i] = result[result.length - 1 - i];
  return bytes;
}

function doubleSHA256Checksum(full: Uint8Array): boolean {
  // full = version(1) + hash160(20) + checksum(4)
  const data = full.slice(0, full.length - 4);
  const hash1 = sha256(data);
  const hash2 = sha256(hash1);
  const checksum = full.slice(full.length - 4);
  return (
    hash2[0] === checksum[0] &&
    hash2[1] === checksum[1] &&
    hash2[2] === checksum[2] &&
    hash2[3] === checksum[3]
  );
}

export function isValidBitcoinAddress(address: string): boolean {
  const trimmed = address.trim();

  // Bech32/Bech32m (bc1...)
  if (/^bc1[a-z0-9]{39,59}$/i.test(trimmed)) return true;

  // Legacy (1...) or P2SH (3...) with double SHA-256 checksum
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed)) {
    const decoded = base58Decode(trimmed);
    if (!decoded || decoded.length < 4) return false;
    return doubleSHA256Checksum(decoded);
  }

  // Testnet (tb1... or m/n followed by base58)
  if (/^(tb1[a-z0-9]{39,59}|[mn][a-km-zA-HJ-NP-Z1-9]{25,34})$/i.test(trimmed)) return true;

  return false;
}
