import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import https from 'node:https';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
export {
  ManagedSecrets,
  type ManagedSecretConfig,
  type ManagedCredential,
} from './managed-secrets.js';
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value) ?? 'null';
}
export const digest = (value: unknown): string =>
  'sha256:' + createHash('sha256').update(canonical(value)).digest('hex');
function signature(
  key: string,
  method: string,
  path: string,
  body: unknown,
  timestamp: string,
  nonce: string,
): string {
  if (key.length < 32) throw new Error('INVALID_TRANSPORT_KEY');
  return createHmac('sha256', key)
    .update([method, path, timestamp, nonce, digest(body)].join('\n'))
    .digest('hex');
}
export function signedHeaders(
  key: string,
  method: string,
  path: string,
  body: unknown,
): Record<string, string> {
  const timestamp = String(Date.now()),
    nonce = randomUUID();
  return {
    'x-eas-timestamp': timestamp,
    'x-eas-nonce': nonce,
    'x-eas-signature': signature(key, method, path, body, timestamp, nonce),
  };
}
export class SignatureVerifier {
  private readonly seen = new Map<string, number>();
  verify(
    key: string,
    method: string,
    path: string,
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): void {
    const timestamp = headers['x-eas-timestamp'],
      nonce = headers['x-eas-nonce'],
      actual = headers['x-eas-signature'];
    if (
      typeof timestamp !== 'string' ||
      typeof nonce !== 'string' ||
      typeof actual !== 'string' ||
      !/^[a-f0-9]{64}$/.test(actual) ||
      !Number.isFinite(Number(timestamp)) ||
      Math.abs(Date.now() - Number(timestamp)) > 30_000 ||
      this.seen.has(nonce)
    )
      throw new Error('INVALID_WORKLOAD_IDENTITY');
    if (
      !timingSafeEqual(
        Buffer.from(actual, 'hex'),
        Buffer.from(signature(key, method, path, body, timestamp, nonce), 'hex'),
      )
    )
      throw new Error('INVALID_WORKLOAD_IDENTITY');
    const now = Date.now();
    for (const [n, t] of this.seen) if (t < now - 30_000) this.seen.delete(n);
    if (this.seen.size > 10_000) throw new Error('WORKLOAD_RATE_LIMIT');
    this.seen.set(nonce, now);
  }
}
export interface MutualTls {
  cert: Buffer;
  key: Buffer;
  ca: Buffer;
}
export async function loadTls(prefix: string): Promise<MutualTls | undefined> {
  const cert = process.env[prefix + '_CERT'],
    key = process.env[prefix + '_KEY'],
    ca = process.env[prefix + '_CA'];
  if (!cert && !key && !ca) return undefined;
  if (!cert || !key || !ca) throw new Error('INCOMPLETE_MTLS_CONFIGURATION');
  return { cert: await readFile(cert), key: await readFile(key), ca: await readFile(ca) };
}
export async function signedRequest<T>(
  url: URL,
  key: string,
  body: unknown,
  options: {
    tls?: MutualTls | undefined;
    allowLocalHttp?: boolean | undefined;
    timeoutMs?: number;
    maxResponseBytes?: number;
  } = {},
): Promise<T> {
  if (url.username || url.password || url.hash || url.search)
    throw new Error('INVALID_SERVICE_URL');
  const local =
    url.protocol === 'http:' &&
    ['127.0.0.1', '[::1]'].includes(url.hostname) &&
    options.allowLocalHttp === true;
  if (!local && (url.protocol !== 'https:' || !options.tls)) throw new Error('MTLS_REQUIRED');
  const payload = canonical(body),
    headers = signedHeaders(key, 'POST', url.pathname, body);
  return new Promise<T>((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : http).request(
      url,
      {
        method: 'POST',
        headers: {
          ...headers,
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
        },
        ...options.tls,
        rejectUnauthorized: true,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let bytes = 0;
        res.on('data', (b: Buffer) => {
          bytes += b.length;
          if (bytes > (options.maxResponseBytes ?? 2_097_152)) {
            req.destroy(new Error('RESPONSE_LIMIT'));
            return;
          }
          chunks.push(b);
        });
        res.on('end', () => {
          try {
            const result: unknown = JSON.parse(Buffer.concat(chunks).toString());
            new SignatureVerifier().verify(key, 'RESPONSE', url.pathname, result, res.headers);
            if (res.statusCode !== 200) throw new Error('CONNECTOR_UNAVAILABLE');
            resolve(result as T);
          } catch {
            reject(new Error('CONNECTOR_UNAVAILABLE'));
          }
        });
      },
    );
    req.setTimeout(options.timeoutMs ?? 35_000, () => req.destroy(new Error('CONNECTOR_TIMEOUT')));
    req.on('error', () => reject(new Error('CONNECTOR_UNAVAILABLE')));
    req.end(payload);
  });
}
