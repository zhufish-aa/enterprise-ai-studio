/** Immutable build output. Executable bytes are only consumed by the isolated site worker. */
export interface SiteBuildArtifact {
  format: 'site-fullstack-v1';
  html: string;
  backend: string;
  backendDigest: string;
  migrations: { path: string; content: string; digest: string }[];
  dataSource: string;
}
export interface SiteScope {
  organizationId: string;
  appId: string;
}
export interface SiteDataSourceInput {
  key: string;
  name: string;
  mode: 'managed' | 'external';
  revision: number;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  tls?: boolean;
}
export interface SiteDataSource {
  key: string;
  name: string;
  mode: 'managed' | 'external';
  engine: 'postgresql';
  environment: 'test';
  host: string;
  port: number;
  database: string;
  username: string;
  secretConfigured: boolean;
  tls: boolean;
  revision: number;
}
export interface SiteHttpInput {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  headers: Record<string, string>;
  body: unknown;
}
export interface SiteHttpResult {
  status: number;
  headers: Record<string, string | string[]>;
  body: unknown;
}
export interface SiteRuntimeStatus {
  versionId: string;
  buildId: string;
  backendDigest: string;
  status: 'ready' | 'stopped' | 'failed';
  logs: string[];
  updatedAt: string;
}
export type SiteWorkerResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };
