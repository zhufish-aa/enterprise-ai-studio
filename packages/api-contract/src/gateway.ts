import type { components } from './generated.js';
import type { CatalogPlan } from './internal.js';
type S = components['schemas'];
/** Private, server-authored execution plan. Never accepted from a business client. */
export interface GatewayPlan extends Omit<CatalogPlan, 'operation' | 'preview'> {
  operation: 'query';
  query: S['QuerySpec'];
  model: {
    relation: S['RelationRef'];
    fields: S['DatasetField'][];
    metrics: S['MetricDefinition'][];
  };
  rowFilters: S['Filter'][];
  masks: S['QueryPolicyInput']['masks'];
  offset: number;
  rowLimit: number;
  timeoutMs: number;
  maxCost: number;
  maxScanRows: number;
  requireDatabaseRls: boolean;
  databaseContext: { organizationId: string; userId: string; departments: string[] };
}
export interface GatewayResult {
  jobId: string;
  attempt: number;
  ok: boolean;
  failureCode: string | null;
  durationMs: number;
  data: S['QueryResult'] | null;
}
