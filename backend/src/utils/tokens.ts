import { randomBytes, randomUUID } from 'crypto';

export function generateId(): string {
  return randomUUID();
}

export function generateToken(byteLength = 24): string {
  return randomBytes(byteLength).toString('hex');
}
