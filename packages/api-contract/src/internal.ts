import type { components } from './generated.js';
type S = components['schemas'];
export type Engine = 'postgresql' | 'mysql' | 'sqlserver';
export type CatalogEnvironment = 'test' | 'production';
/** Private connector wire contract. Never exposed by user/tool endpoints. */
export interface CatalogPlan {
  jobId: string;
  organizationId: string;
  attempt: number;
  expiresAt: string;
  environment: CatalogEnvironment;
  operation: 'health' | 'metadata' | 'preview';
  policyEpoch: number;
  connection: {
    id: string;
    engine: Engine;
    databaseName: string;
    secretRef: string;
    credentialRevision: number;
    connectTimeoutMs: number;
    requestTimeoutMs: number;
    poolMax: number;
    endpoint: S['NetworkEndpoint'] & { caRef: string | null };
  };
  relations: S['RelationRef'][];
  preview: null | {
    relation: S['RelationRef'];
    fields: S['DatasetField'][];
    metrics: S['MetricDefinition'][];
    dimensions: string[];
    metricKeys: string[];
    filters: S['Filter'][];
    limit: number;
  };
}
export interface ConnectorResult {
  jobId: string;
  attempt: number;
  ok: boolean;
  data:
    | { healthy: boolean; checkedAt: string }
    | { relations: S['RelationMetadata'][] }
    | S['PreviewResult']
    | null;
  failureCode: string | null;
}
