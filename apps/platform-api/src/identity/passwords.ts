import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { Fault } from '../infrastructure/errors.js';
const N = 131072,
  r = 8,
  p = 1,
  keyLength = 32;
let active = 0;
async function derive(password: string, salt: Buffer): Promise<Buffer> {
  if (active >= 2) throw new Fault(429, 'AUTH_BUSY');
  active++;
  try {
    return await new Promise<Buffer>((resolve, reject) =>
      scrypt(password, salt, keyLength, { N, r, p, maxmem: 256 * 1024 * 1024 }, (error, key) =>
        error ? reject(new Fault(503, 'DEPENDENCY_UNAVAILABLE')) : resolve(key),
      ),
    );
  } finally {
    active--;
  }
}
export function requirePassword(password: string) {
  if (password.length < 12 || password.length > 128 || password.includes('\0'))
    throw new Fault(400, 'PASSWORD_POLICY');
}
export async function hashPassword(password: string): Promise<string> {
  requirePassword(password);
  const salt = randomBytes(24),
    key = await derive(password, salt);
  return ['scrypt', N, r, p, salt.toString('hex'), key.toString('hex')].join('$');
}
const dummy = ['scrypt', N, r, p, '0'.repeat(48), '0'.repeat(64)].join('$');
export async function verifyPassword(password: string, encoded: string | null): Promise<boolean> {
  const parts = (encoded ?? dummy).split('$');
  if (
    parts.length !== 6 ||
    parts[0] !== 'scrypt' ||
    parts[1] !== String(N) ||
    parts[2] !== String(r) ||
    parts[3] !== String(p) ||
    !/^[a-f0-9]{48}$/.test(parts[4] ?? '') ||
    !/^[a-f0-9]{64}$/.test(parts[5] ?? '')
  )
    throw new Fault(503, 'DEPENDENCY_UNAVAILABLE');
  const key = await derive(password, Buffer.from(parts[4]!, 'hex'));
  return timingSafeEqual(key, Buffer.from(parts[5]!, 'hex')) && encoded !== null;
}
