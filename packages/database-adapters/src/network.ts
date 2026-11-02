import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import ipaddr from 'ipaddr.js';
import type { CatalogPlan } from '@eas/api-contract';
export class AdapterError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'AdapterError';
  }
}
type Endpoint = CatalogPlan['connection']['endpoint'];
export async function resolveApprovedAddress(
  endpoint: Endpoint,
  allowFixture = false,
  resolver = lookup,
): Promise<string> {
  if (
    !endpoint.allowedCidrs.length ||
    !endpoint.host ||
    endpoint.host.length > 253 ||
    endpoint.host.includes('/') ||
    endpoint.host.includes('@') ||
    endpoint.host.includes('%')
  )
    throw new AdapterError('NETWORK_ADDRESS_FORBIDDEN');
  const cidrs = endpoint.allowedCidrs.map((c) => {
    try {
      return ipaddr.parseCIDR(c);
    } catch {
      throw new AdapterError('NETWORK_ADDRESS_FORBIDDEN');
    }
  });
  const results = isIP(endpoint.host)
    ? [{ address: endpoint.host, family: isIP(endpoint.host) }]
    : await resolver(endpoint.host, { all: true, verbatim: true }).catch(() => {
        throw new AdapterError('NETWORK_ADDRESS_FORBIDDEN');
      });
  if (!results.length) throw new AdapterError('NETWORK_ADDRESS_FORBIDDEN');
  for (const result of results) {
    let address;
    try {
      address = ipaddr.parse(result.address);
    } catch {
      throw new AdapterError('NETWORK_ADDRESS_FORBIDDEN');
    }
    if (address.kind() === 'ipv6' && (address as ipaddr.IPv6).isIPv4MappedAddress())
      throw new AdapterError('NETWORK_ADDRESS_FORBIDDEN');
    const range = address.range();
    const fixture =
      allowFixture &&
      endpoint.localFixture &&
      endpoint.tlsMode === 'disable-fixture' &&
      endpoint.environment === 'test' &&
      range === 'loopback';
    if (!fixture && !['unicast', 'private', 'uniqueLocal'].includes(range))
      throw new AdapterError('NETWORK_ADDRESS_FORBIDDEN');
    if (
      !cidrs.some(
        ([network, bits]) => network.kind() === address.kind() && address.match(network, bits),
      )
    )
      throw new AdapterError('NETWORK_ADDRESS_FORBIDDEN');
  }
  const first = results[0];
  if (!first) throw new AdapterError('NETWORK_ADDRESS_FORBIDDEN');
  if (
    endpoint.tlsMode === 'disable-fixture' &&
    !(
      allowFixture &&
      endpoint.localFixture &&
      endpoint.environment === 'test' &&
      ipaddr.parse(first.address).range() === 'loopback'
    )
  )
    throw new AdapterError('NETWORK_ADDRESS_FORBIDDEN');
  return first.address;
}
export interface Credential {
  username: string;
  password: string;
  revision: string;
}
export interface SecretProvider {
  credential(reference: string, environment: string): Promise<Credential>;
  certificate(reference: string): Promise<string>;
}
/** Local secret file is enabled only for explicit development/test fixtures. */
export class FileSecretProvider implements SecretProvider {
  constructor(
    private readonly path: string,
    private readonly enabled: boolean,
  ) {}
  async credential(reference: string, environment: string): Promise<Credential> {
    if (!this.enabled || environment !== 'test' || !reference.startsWith('local:'))
      throw new AdapterError('CREDENTIAL_UNAVAILABLE');
    try {
      const data: unknown = JSON.parse(await readFile(this.path, 'utf8'));
      const entry = (data as Record<string, Credential>)[reference];
      if (
        !entry ||
        typeof entry.username !== 'string' ||
        typeof entry.password !== 'string' ||
        typeof entry.revision !== 'string'
      )
        throw new Error();
      return entry;
    } catch {
      throw new AdapterError('CREDENTIAL_UNAVAILABLE');
    }
  }
  async certificate(reference: string): Promise<string> {
    if (!this.enabled) throw new AdapterError('CREDENTIAL_UNAVAILABLE');
    const root = await realpath(resolve(this.path, '..'));
    const target = await realpath(resolve(root, reference));
    if (!target.startsWith(root + sep)) throw new AdapterError('CREDENTIAL_UNAVAILABLE');
    return readFile(target, 'utf8');
  }
}
export class VaultSecretProvider implements SecretProvider {
  constructor(
    private readonly origin: URL,
    private readonly tokenFile: string,
    private readonly mounts: Record<string, string>,
  ) {
    if (origin.protocol !== 'https:' || origin.username || origin.password)
      throw new Error('INVALID_VAULT_URL');
  }
  private async get(reference: string, environment: string): Promise<Record<string, unknown>> {
    const prefix = this.mounts[environment];
    if (
      !prefix ||
      !reference.startsWith(prefix + '/') ||
      reference.includes('..') ||
      !/^[-a-zA-Z0-9_/]+$/.test(reference)
    )
      throw new AdapterError('CREDENTIAL_UNAVAILABLE');
    try {
      const token = (await readFile(this.tokenFile, 'utf8')).trim();
      const response = await fetch(new URL('/v1/' + reference, this.origin), {
        headers: { 'X-Vault-Token': token },
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error();
      const raw = await response.text();
      if (raw.length > 65536) throw new Error();
      const value = JSON.parse(raw) as {
        data: { data: Record<string, unknown>; metadata?: { version: number } };
      };
      return { ...value.data.data, revision: String(value.data.metadata?.version ?? 1) };
    } catch {
      throw new AdapterError('CREDENTIAL_UNAVAILABLE');
    }
  }
  async credential(reference: string, environment: string): Promise<Credential> {
    const d = await this.get(reference, environment);
    if (typeof d['username'] !== 'string' || typeof d['password'] !== 'string')
      throw new AdapterError('CREDENTIAL_UNAVAILABLE');
    return { username: d['username'], password: d['password'], revision: String(d['revision']) };
  }
  async certificate(reference: string): Promise<string> {
    const d = await this.get(reference, 'certificates');
    if (typeof d['pem'] !== 'string') throw new AdapterError('CREDENTIAL_UNAVAILABLE');
    return d['pem'];
  }
}
