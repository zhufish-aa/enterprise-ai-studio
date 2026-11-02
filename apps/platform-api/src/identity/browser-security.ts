import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { Fault } from '../infrastructure/errors.js';
export interface PasswordAuthConfig {
  enabled: boolean;
  allowedOrigins: string[];
  secureCookies: boolean;
}
export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
export const cookieName = (config: PasswordAuthConfig) =>
  config.secureCookies ? '__Secure-eas_session' : 'eas_session';
export function browserCookie(
  req: FastifyRequest,
  config: PasswordAuthConfig | undefined,
): string | null {
  if (!config?.enabled) return null;
  const pairs = (req.headers.cookie ?? '').split(';').map((v) => v.trim().split('='));
  const found = pairs.filter((v) => v[0] === cookieName(config));
  if (found.length === 0) return null;
  if (found.length !== 1 || !/^eas_browser_[A-Za-z0-9_-]{43}$/.test(found[0]?.[1] ?? ''))
    throw new Fault(401, 'UNAUTHENTICATED');
  return found[0]![1]!;
}
export function requireOrigin(req: FastifyRequest, config: PasswordAuthConfig) {
  const origin = req.headers.origin;
  if (typeof origin !== 'string' || !config.allowedOrigins.includes(origin))
    throw new Fault(403, 'CSRF_REJECTED');
}
export const csrfToken = (secret: string, id: string) =>
  createHmac('sha256', secret)
    .update('browser-csrf:' + id)
    .digest('hex');
export function requireCsrf(
  req: FastifyRequest,
  config: PasswordAuthConfig,
  secret: string,
  id: string,
) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  requireOrigin(req, config);
  const value = req.headers['x-csrf-token'];
  if (
    typeof value !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value) ||
    !timingSafeEqual(Buffer.from(value, 'hex'), Buffer.from(csrfToken(secret, id), 'hex'))
  )
    throw new Fault(403, 'CSRF_REJECTED');
}
export function sessionCookie(value: string, config: PasswordAuthConfig, clear = false) {
  return (
    cookieName(config) +
    '=' +
    value +
    '; Path=/v1; HttpOnly; SameSite=Strict; Max-Age=' +
    (clear ? '0' : '28800') +
    (config.secureCookies ? '; Secure' : '')
  );
}
