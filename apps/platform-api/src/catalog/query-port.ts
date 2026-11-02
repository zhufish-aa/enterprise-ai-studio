import type { CatalogPlan, components } from '@eas/api-contract';
import type { Sql } from '../infrastructure/database.js';
type S = components['schemas'];
export interface QueryCatalogPort {
  queryDataset(
    tx: Sql,
    organizationId: string,
    datasetId: string,
    versionId?: string,
  ): Promise<{ dataset: S['Dataset']; version: S['DatasetVersion']; primaryKeys: string[] }>;
  queryConnection(
    tx: Sql,
    organizationId: string,
    sourceId: string,
    environment: 'test' | 'production',
    mappingId?: string,
  ): Promise<{
    mappingId: string;
    schemaDigest: string;
    revision: number;
    connection: CatalogPlan['connection'];
  }>;
  registerQueryPolicy(
    tx: Sql,
    organizationId: string,
    key: string,
    definition: unknown,
    digest: string,
  ): Promise<void>;
  invalidate(tx: Sql, organizationId: string, sourceId?: string): Promise<void>;
  validateFilters(fields: S['DatasetField'][], filters: S['Filter'][]): void;
}
