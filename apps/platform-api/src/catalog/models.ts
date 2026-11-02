import type { components } from '@eas/api-contract';
export type S = components['schemas'];
export interface BaseRow {
  id: string;
  organization_id: string;
  created_at: Date;
}
export interface SourceRow extends BaseRow {
  key: string;
  name: string;
  system_code: string;
  engine: S['LogicalDataSource']['engine'];
  description: string;
  department: string;
  owner_user_id: string;
  owner_name?: string;
  sensitivity: S['LogicalDataSource']['sensitivity'];
  status: 'enabled' | 'disabled';
  revision: number;
  updated_at: Date;
}
export interface ConnectionRow extends BaseRow {
  name: string;
  environment: 'test' | 'production';
  engine: S['PhysicalConnection']['engine'];
  endpoint_id: string;
  database_name: string;
  credential_profile_id: string;
  secret_ref: string;
  credential_revision: number;
  status: 'active' | 'disabled';
  revision: number;
  connect_timeout_ms: number;
  request_timeout_ms: number;
  pool_max: number;
  metadata_scope: S['RelationRef'][];
  last_health_status: 'unknown' | 'healthy' | 'unhealthy';
  last_checked_at: Date | null;
  updated_at: Date;
  host: string;
  port: number;
}
export interface EndpointRow extends BaseRow {
  name: string;
  environment: 'test' | 'production';
  engine: S['NetworkEndpoint']['engine'];
  host: string;
  port: number;
  allowed_cidrs: string[];
  tls_server_name: string;
  tls_mode: 'verify-full' | 'disable-fixture';
  allowed_databases: string[];
  allowed_relations: S['RelationRef'][];
  local_fixture: boolean;
  ca_ref: string | null;
}
export interface DatasetRow extends BaseRow {
  key: string;
  name: string;
  logical_data_source_id: string;
  description: string;
  status: 'draft' | 'enabled' | 'disabled';
  revision: number;
  updated_at: Date;
}
export interface VersionRow extends BaseRow {
  dataset_id: string;
  version: number;
  metadata_snapshot_id: string;
  relation_schema: string;
  relation_view: string;
  row_policy_key: string;
  schema_digest: string;
  definition: S['CreateDatasetVersion'];
}
export interface SnapshotRow extends BaseRow {
  physical_connection_id: string;
  job_id: string;
  schema_digest: string;
  relations: S['RelationMetadata'][];
}
export interface JobRow extends BaseRow {
  requested_by: string;
  operation: 'health' | 'metadata' | 'preview';
  environment: 'test' | 'production';
  physical_connection_id: string;
  dataset_version_id: string | null;
  input: {
    relations?: S['RelationRef'][];
    preview?: S['CreateDatasetPreview'];
    clientKind: 'human' | 'ai';
    authenticatedAt: number;
    connectionRevision: number;
  };
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  attempt: number;
  retry_of: string | null;
  policy_epoch: number;
  lease_expires_at: Date | null;
  result: S['CatalogJob']['result'];
  failure_code: string | null;
  completed_at: Date | null;
}
export const sourceDto = (r: SourceRow): S['LogicalDataSource'] => ({
  id: r.id,
  organizationId: r.organization_id,
  createdAt: r.created_at.toISOString(),
  key: r.key,
  name: r.name,
  systemCode: r.system_code,
  engine: r.engine,
  description: r.description,
  department: r.department,
  ownerUserId: r.owner_user_id,
  ...(r.owner_name ? { ownerDisplayName: r.owner_name } : {}),
  sensitivity: r.sensitivity,
  status: r.status,
  revision: Number(r.revision),
  updatedAt: r.updated_at.toISOString(),
});
export const endpointDto = (r: EndpointRow): S['NetworkEndpoint'] => ({
  id: r.id,
  organizationId: r.organization_id,
  createdAt: r.created_at.toISOString(),
  name: r.name,
  environment: r.environment,
  engine: r.engine,
  host: r.host,
  port: r.port,
  allowedCidrs: r.allowed_cidrs,
  tlsServerName: r.tls_server_name,
  tlsMode: r.tls_mode,
  allowedDatabases: r.allowed_databases,
  allowedRelations: r.allowed_relations,
  localFixture: r.local_fixture,
});
export const connectionDto = (r: ConnectionRow): S['PhysicalConnection'] => ({
  id: r.id,
  organizationId: r.organization_id,
  createdAt: r.created_at.toISOString(),
  name: r.name,
  environment: r.environment,
  engine: r.engine,
  endpointId: r.endpoint_id,
  host: r.host,
  port: r.port,
  databaseName: r.database_name,
  credentialProfileId: r.credential_profile_id,
  credentialRevision: Number(r.credential_revision),
  status: r.status,
  revision: Number(r.revision),
  connectTimeoutMs: r.connect_timeout_ms,
  requestTimeoutMs: r.request_timeout_ms,
  poolMax: r.pool_max,
  metadataScope: r.metadata_scope,
  lastHealthStatus: r.last_health_status,
  lastCheckedAt: r.last_checked_at?.toISOString() ?? null,
  updatedAt: r.updated_at.toISOString(),
});
export const datasetDto = (r: DatasetRow): S['Dataset'] => ({
  id: r.id,
  organizationId: r.organization_id,
  createdAt: r.created_at.toISOString(),
  key: r.key,
  name: r.name,
  logicalDataSourceId: r.logical_data_source_id,
  description: r.description,
  status: r.status,
  revision: Number(r.revision),
  updatedAt: r.updated_at.toISOString(),
});
export const snapshotDto = (r: SnapshotRow): S['MetadataSnapshot'] => ({
  id: r.id,
  organizationId: r.organization_id,
  createdAt: r.created_at.toISOString(),
  physicalConnectionId: r.physical_connection_id,
  jobId: r.job_id,
  schemaDigest: r.schema_digest,
  relations: r.relations,
});
export const jobDto = (r: JobRow): S['CatalogJob'] => ({
  id: r.id,
  organizationId: r.organization_id,
  createdAt: r.created_at.toISOString(),
  operation: r.operation,
  environment: r.environment,
  physicalConnectionId: r.physical_connection_id,
  datasetVersionId: r.dataset_version_id,
  status: r.status,
  attempt: r.attempt,
  retryOf: r.retry_of,
  failureCode: r.failure_code,
  result: r.result,
  completedAt: r.completed_at?.toISOString() ?? null,
});
export const versionDto = (r: VersionRow): S['DatasetVersion'] => ({
  id: r.id,
  organizationId: r.organization_id,
  createdAt: r.created_at.toISOString(),
  datasetId: r.dataset_id,
  version: r.version,
  metadataSnapshotId: r.metadata_snapshot_id,
  relation: { schema: r.relation_schema, name: r.relation_view },
  fields: r.definition.fields,
  metrics: r.definition.metrics,
  relationships: r.definition.relationships,
  rowPolicyKey: r.row_policy_key,
  schemaDigest: r.schema_digest,
});
