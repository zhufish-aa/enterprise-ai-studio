import type { components, CatalogPlan } from '@eas/api-contract';
import type { Sql } from '../infrastructure/database.js';
export interface ReleaseMapping {
  mappingId: string;
  logicalDataSourceId: string;
  schemaDigest: string;
  connectionRevision: number;
  relation: components['schemas']['RelationRef'];
  columns: components['schemas']['ColumnMetadata'][];
}
export type ReleaseRequirements = Pick<
  ReleaseMapping,
  'logicalDataSourceId' | 'relation' | 'columns'
>;
export interface CatalogReleasePort {
  releaseRequirements(
    tx: Sql,
    org: string,
    datasetId: string,
    versionId: string,
  ): Promise<ReleaseRequirements>;
  releaseMapping(
    tx: Sql,
    org: string,
    datasetId: string,
    versionId: string,
  ): Promise<ReleaseMapping>;
  releaseInspection(
    tx: Sql,
    org: string,
    datasetId: string,
    versionId: string,
    mappingId: string,
  ): Promise<Omit<CatalogPlan, 'jobId' | 'organizationId' | 'attempt' | 'expiresAt'>>;
}
