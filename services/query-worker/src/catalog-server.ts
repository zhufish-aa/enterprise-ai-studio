import http from 'node:http';
import https from 'node:https';
import type { AddressInfo } from 'node:net';
import {
  SignatureVerifier,
  signedHeaders,
  signedRequest,
  type MutualTls,
} from '@eas/connector-transport';
import { AdapterRegistry, GatewayExecutor, type SecretProvider } from '@eas/database-adapters';
import type {
  CatalogPlan,
  CatalogEnvironment,
  GatewayPlan,
  ReleaseInspection,
  ReleaseInspectionResult,
  components,
} from '@eas/api-contract';
export interface ConnectorOptions {
  environment: CatalogEnvironment;
  key: string;
  apiUrl: URL;
  secrets: SecretProvider;
  allowLocalHttp?: boolean;
  tls?: MutualTls | undefined;
  clientTls?: MutualTls | undefined;
  allowFixture?: boolean;
}
export async function createConnector(options: ConnectorOptions) {
  if (options.key.length < 32) throw new Error('INVALID_TRANSPORT_KEY');
  if (
    options.environment === 'production' &&
    (!options.tls ||
      !options.clientTls ||
      options.apiUrl.protocol !== 'https:' ||
      options.allowFixture)
  )
    throw new Error('PRODUCTION_MTLS_REQUIRED');
  if (options.allowLocalHttp && options.environment !== 'test')
    throw new Error('ENVIRONMENT_FORBIDDEN');
  const verifier = new SignatureVerifier(),
    registry = new AdapterRegistry(options.secrets, options.allowFixture === true),
    gateway = new GatewayExecutor(options.secrets, options.allowFixture === true),
    active = new Set<string>(),
    queries = new Map<string, { organizationId: string; controller: AbortController }>();
  const handler = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const path = req.url ?? '';
    let body: unknown = null;
    const send = (status: number, payload: unknown) => {
      res.writeHead(status, {
        'content-type': 'application/json',
        ...signedHeaders(options.key, 'RESPONSE', path, payload),
      });
      res.end(JSON.stringify(payload));
    };
    try {
      if (
        req.method !== 'POST' ||
        !['/execute', '/ping', '/gateway/execute', '/gateway/cancel', '/release/inspect'].includes(
          path,
        )
      )
        return send(404, { error: 'NOT_FOUND' });
      if (
        options.environment === 'production' &&
        !(req.socket as import('node:tls').TLSSocket).authorized
      )
        return send(403, { error: 'FORBIDDEN' });
      const chunks: Buffer[] = [];
      let bytes = 0;
      for await (const chunk of req) {
        const buffer = Buffer.from(chunk as Uint8Array);
        bytes += buffer.length;
        if (bytes > 4096) throw new Error();
        chunks.push(buffer);
      }
      body = JSON.parse(Buffer.concat(chunks).toString());
      verifier.verify(options.key, 'POST', path, body, req.headers);
      if (path === '/ping') return send(200, { status: 'ok', environment: options.environment });
      if (path === '/release/inspect') {
        if (
          options.environment !== 'production' ||
          !body ||
          typeof body !== 'object' ||
          Object.keys(body).sort().join(',') !== 'deploymentId,leaseToken,organizationId'
        )
          throw new Error();
        const b = body as { organizationId: string; deploymentId: string; leaseToken: string };
        if (
          [b.organizationId, b.deploymentId, b.leaseToken].some(
            (value) => typeof value !== 'string' || !/^[a-f0-9-]{36}$/i.test(value),
          )
        )
          throw new Error();
        const inspection = await signedRequest<ReleaseInspection>(
          new URL(
            `/v1/internal/releases/${b.organizationId}/${b.deploymentId}/inspection`,
            options.apiUrl,
          ),
          options.key,
          { leaseToken: b.leaseToken },
          { tls: options.clientTls, allowLocalHttp: options.allowLocalHttp, timeoutMs: 10000 },
        );
        if (inspection.deploymentId !== b.deploymentId || inspection.leaseToken !== b.leaseToken)
          throw new Error();
        const results: ReleaseInspectionResult['results'] = [];
        for (const plan of inspection.plans) {
          if (
            plan.environment !== 'production' ||
            plan.organizationId !== b.organizationId ||
            plan.operation !== 'metadata'
          )
            throw new Error();
          const result = await registry.execute(plan);
          if (!result.ok || !result.data || !('relations' in result.data)) throw new Error();
          results.push({
            datasetVersionId: plan.jobId,
            relations: result.data.relations as components['schemas']['RelationMetadata'][],
          });
        }
        return send(200, { deploymentId: b.deploymentId, leaseToken: b.leaseToken, results });
      }
      if (
        !body ||
        typeof body !== 'object' ||
        Object.keys(body).sort().join(',') !== 'jobId,organizationId'
      )
        throw new Error();
      const { organizationId, jobId } = body as { organizationId: unknown; jobId: unknown };
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (
        typeof organizationId !== 'string' ||
        typeof jobId !== 'string' ||
        !uuid.test(organizationId) ||
        !uuid.test(jobId)
      )
        throw new Error();
      if (path === '/gateway/cancel') {
        const entry = queries.get(jobId);
        if (entry?.organizationId === organizationId) entry.controller.abort();
        return send(200, { cancelled: true });
      }
      if (active.size >= 4 || active.has(jobId))
        return path === '/gateway/execute'
          ? send(200, { queued: true })
          : send(409, { error: 'STATE_CONFLICT' });
      active.add(jobId);
      try {
        if (path === '/gateway/execute') {
          const plan = await signedRequest<GatewayPlan | null>(
            new URL(`/v1/internal/query-gateway/${organizationId}/${jobId}/lease`, options.apiUrl),
            options.key,
            { environment: options.environment },
            { tls: options.clientTls, allowLocalHttp: options.allowLocalHttp, timeoutMs: 5000 },
          );
          if (plan === null) return send(200, { queued: true });
          if (
            plan.jobId !== jobId ||
            plan.organizationId !== organizationId ||
            plan.environment !== options.environment ||
            plan.operation !== 'query'
          )
            return send(403, { error: 'ENVIRONMENT_FORBIDDEN' });
          const controller = new AbortController();
          queries.set(jobId, { organizationId, controller });
          try {
            return send(200, await gateway.execute(plan, controller.signal));
          } finally {
            queries.delete(jobId);
          }
        }
        const plan = await signedRequest<CatalogPlan>(
          new URL(`/v1/internal/catalog/${organizationId}/${jobId}/lease`, options.apiUrl),
          options.key,
          { environment: options.environment },
          { tls: options.clientTls, allowLocalHttp: options.allowLocalHttp, timeoutMs: 5000 },
        );
        if (plan.operation === 'preview') return send(410, { error: 'QUERY_GATEWAY_REQUIRED' });
        if (
          plan.jobId !== jobId ||
          plan.organizationId !== organizationId ||
          plan.environment !== options.environment
        )
          return send(403, { error: 'ENVIRONMENT_FORBIDDEN' });
        send(200, await registry.execute(plan));
      } finally {
        active.delete(jobId);
      }
    } catch {
      send(403, { error: 'CONNECTOR_REQUEST_REJECTED' });
    }
  };
  const server = options.tls
    ? https.createServer(
        { ...options.tls, requestCert: true, rejectUnauthorized: true },
        (req, res) => {
          void handler(req, res);
        },
      )
    : http.createServer((req, res) => {
        void handler(req, res);
      });
  server.requestTimeout = 40_000;
  server.headersTimeout = 10_000;
  return {
    async listen(port = 0, host = '127.0.0.1') {
      if (!options.tls && host !== '127.0.0.1') throw new Error('MTLS_REQUIRED');
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => resolve());
      });
      return (server.address() as AddressInfo).port;
    },
    async close() {
      for (const q of queries.values()) q.controller.abort();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await Promise.all([registry.close(), gateway.close()]);
    },
  };
}
