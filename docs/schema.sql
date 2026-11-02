-- Stage 00 executable design reference, not an automatic production migration.
-- All identifiers are snake_case. Cross-organization relationships use composite FKs.
BEGIN;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oidc_issuer text NOT NULL,
  oidc_subject text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('active','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (oidc_issuer, oidc_subject)
);

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  policy_epoch bigint NOT NULL DEFAULT 1 CHECK (policy_epoch > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL CHECK (status IN ('active','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE permissions (
  key text PRIMARY KEY,
  description text NOT NULL
);

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  key text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key),
  UNIQUE (organization_id, id)
);

CREATE TABLE role_permissions (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  role_id uuid NOT NULL,
  permission_key text NOT NULL REFERENCES permissions(key),
  PRIMARY KEY (organization_id, role_id, permission_key),
  FOREIGN KEY (organization_id, role_id) REFERENCES roles (organization_id, id)
);

CREATE TABLE role_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, user_id) REFERENCES organization_members (organization_id, user_id),
  FOREIGN KEY (organization_id, role_id) REFERENCES roles (organization_id, id),
  UNIQUE (organization_id, user_id, role_id),
  UNIQUE (organization_id, id)
);

CREATE TABLE resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  kind text NOT NULL CHECK (kind IN ('app','report','dataset')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id, kind),
  UNIQUE (organization_id, id)
);

CREATE TABLE resource_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  resource_id uuid NOT NULL,
  principal_user_id uuid NOT NULL,
  action text NOT NULL REFERENCES permissions(key),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, resource_id) REFERENCES resources (organization_id, id),
  FOREIGN KEY (organization_id, principal_user_id) REFERENCES organization_members (organization_id, user_id),
  UNIQUE (organization_id, resource_id, principal_user_id, action),
  UNIQUE (organization_id, id)
);

CREATE TABLE artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  kind text NOT NULL CHECK (kind IN ('source','build')),
  object_key text NOT NULL,
  digest text NOT NULL CHECK (digest ~ '^sha256:[a-f0-9]{64}$'),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  status text NOT NULL CHECK (status IN ('uploading','sealed','quarantined')),
  owner_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, owner_user_id) REFERENCES organization_members (organization_id, user_id),
  UNIQUE (organization_id, object_key),
  UNIQUE (organization_id, id)
);

CREATE TABLE apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  resource_kind text NOT NULL DEFAULT 'app' CHECK (resource_kind = 'app'),
  key text NOT NULL,
  name text NOT NULL,
  owner_user_id uuid NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, id, resource_kind) REFERENCES resources (organization_id, id, kind),
  FOREIGN KEY (organization_id, owner_user_id) REFERENCES organization_members (organization_id, user_id),
  UNIQUE (organization_id, key),
  UNIQUE (organization_id, id)
);

CREATE TABLE app_members (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  app_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('viewer','developer','maintainer')),
  PRIMARY KEY (organization_id, app_id, user_id),
  FOREIGN KEY (organization_id, app_id) REFERENCES apps (organization_id, id),
  FOREIGN KEY (organization_id, user_id) REFERENCES organization_members (organization_id, user_id)
);

CREATE TABLE app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  app_id uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  source_artifact_id uuid NOT NULL,
  source_digest text NOT NULL CHECK (source_digest ~ '^sha256:[a-f0-9]{64}$'),
  manifest jsonb NOT NULL CHECK (jsonb_typeof(manifest) = 'object'),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, app_id) REFERENCES apps (organization_id, id),
  FOREIGN KEY (organization_id, source_artifact_id) REFERENCES artifacts (organization_id, id),
  FOREIGN KEY (organization_id, created_by) REFERENCES organization_members (organization_id, user_id),
  UNIQUE (organization_id, app_id, version),
  UNIQUE (organization_id, id, app_id),
  UNIQUE (organization_id, id)
);

CREATE TABLE build_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  app_version_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  artifact_id uuid,
  artifact_digest text CHECK (artifact_digest ~ '^sha256:[a-f0-9]{64}$'),
  template_digest text NOT NULL,
  lock_digest text NOT NULL,
  scan_status text NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending','passed','blocked')),
  attestation_ref text,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, app_version_id) REFERENCES app_versions (organization_id, id),
  FOREIGN KEY (organization_id, artifact_id) REFERENCES artifacts (organization_id, id),
  CHECK (status <> 'succeeded' OR (artifact_id IS NOT NULL AND artifact_digest IS NOT NULL)),
  CHECK (status <> 'succeeded' OR (scan_status = 'passed' AND attestation_ref IS NOT NULL)),
  UNIQUE (organization_id, id, app_version_id),
  UNIQUE (organization_id, id)
);

CREATE TABLE network_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('test','production')),
  host text NOT NULL,
  port integer NOT NULL CHECK (port BETWEEN 1 AND 65535),
  allowed_cidrs cidr[] NOT NULL CHECK (cardinality(allowed_cidrs) > 0),
  tls_server_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id, environment),
  UNIQUE (organization_id, id)
);

CREATE TABLE physical_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('test','production')),
  engine text NOT NULL CHECK (engine = 'postgresql'),
  endpoint_id uuid NOT NULL,
  database_name text NOT NULL,
  secret_ref text NOT NULL,
  credential_revision bigint NOT NULL DEFAULT 1 CHECK (credential_revision > 0),
  status text NOT NULL CHECK (status IN ('active','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, endpoint_id, environment) REFERENCES network_endpoints (organization_id, id, environment),
  UNIQUE (organization_id, id, environment),
  UNIQUE (organization_id, id)
);

CREATE TABLE connection_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  physical_connection_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('queued','running','succeeded','failed')),
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, physical_connection_id) REFERENCES physical_connections (organization_id, id),
  UNIQUE (organization_id, id)
);

CREATE TABLE logical_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  key text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key),
  UNIQUE (organization_id, id)
);

CREATE TABLE source_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  logical_data_source_id uuid NOT NULL,
  environment text NOT NULL CHECK (environment IN ('test','production')),
  physical_connection_id uuid NOT NULL,
  revision bigint NOT NULL CHECK (revision > 0),
  schema_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, logical_data_source_id) REFERENCES logical_data_sources (organization_id, id),
  FOREIGN KEY (organization_id, physical_connection_id, environment) REFERENCES physical_connections (organization_id, id, environment),
  UNIQUE (organization_id, logical_data_source_id, environment, revision),
  UNIQUE (organization_id, id, logical_data_source_id, environment),
  UNIQUE (organization_id, id)
);

CREATE TABLE mapping_heads (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  logical_data_source_id uuid NOT NULL,
  environment text NOT NULL CHECK (environment IN ('test','production')),
  mapping_id uuid NOT NULL,
  PRIMARY KEY (organization_id, logical_data_source_id, environment),
  FOREIGN KEY (organization_id, mapping_id, logical_data_source_id, environment) REFERENCES source_mappings (organization_id, id, logical_data_source_id, environment)
);

CREATE TABLE datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  resource_kind text NOT NULL DEFAULT 'dataset' CHECK (resource_kind = 'dataset'),
  key text NOT NULL,
  name text NOT NULL,
  logical_data_source_id uuid NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, id, resource_kind) REFERENCES resources (organization_id, id, kind),
  FOREIGN KEY (organization_id, logical_data_source_id) REFERENCES logical_data_sources (organization_id, id),
  UNIQUE (organization_id, key),
  UNIQUE (organization_id, id)
);

CREATE TABLE dataset_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  dataset_id uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  relation_schema text NOT NULL,
  relation_view text NOT NULL,
  row_policy_key text NOT NULL,
  schema_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, dataset_id) REFERENCES datasets (organization_id, id),
  UNIQUE (organization_id, dataset_id, version),
  UNIQUE (organization_id, id)
);

CREATE TABLE dataset_fields (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  dataset_version_id uuid NOT NULL,
  key text NOT NULL,
  physical_column text NOT NULL,
  data_type text NOT NULL CHECK (data_type IN ('string','number','integer','boolean','date','datetime')),
  classification text NOT NULL CHECK (classification IN ('public','internal','sensitive')),
  filterable boolean NOT NULL DEFAULT false,
  PRIMARY KEY (organization_id, dataset_version_id, key),
  FOREIGN KEY (organization_id, dataset_version_id) REFERENCES dataset_versions (organization_id, id)
);

CREATE TABLE metric_definitions (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  dataset_version_id uuid NOT NULL,
  key text NOT NULL,
  aggregate text NOT NULL CHECK (aggregate IN ('count','sum','avg','min','max')),
  field_key text NOT NULL,
  PRIMARY KEY (organization_id, dataset_version_id, key),
  FOREIGN KEY (organization_id, dataset_version_id, field_key) REFERENCES dataset_fields (organization_id, dataset_version_id, key)
);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  resource_kind text NOT NULL DEFAULT 'report' CHECK (resource_kind = 'report'),
  app_id uuid NOT NULL,
  key text NOT NULL,
  name text NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, id, resource_kind) REFERENCES resources (organization_id, id, kind),
  FOREIGN KEY (organization_id, app_id) REFERENCES apps (organization_id, id),
  UNIQUE (organization_id, app_id, key),
  UNIQUE (organization_id, id, app_id),
  UNIQUE (organization_id, id)
);

CREATE TABLE report_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  report_id uuid NOT NULL,
  app_id uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  config jsonb NOT NULL CHECK (jsonb_typeof(config) = 'object'),
  config_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, report_id, app_id) REFERENCES reports (organization_id, id, app_id),
  UNIQUE (organization_id, report_id, version),
  UNIQUE (organization_id, id, app_id),
  UNIQUE (organization_id, id)
);

CREATE TABLE report_version_datasets (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  report_version_id uuid NOT NULL,
  query_key text NOT NULL,
  dataset_version_id uuid NOT NULL,
  query_spec jsonb NOT NULL CHECK (jsonb_typeof(query_spec) = 'object'),
  PRIMARY KEY (organization_id, report_version_id, query_key),
  FOREIGN KEY (organization_id, report_version_id) REFERENCES report_versions (organization_id, id),
  FOREIGN KEY (organization_id, dataset_version_id) REFERENCES dataset_versions (organization_id, id)
);

CREATE TABLE app_version_reports (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  app_id uuid NOT NULL,
  app_version_id uuid NOT NULL,
  report_version_id uuid NOT NULL,
  PRIMARY KEY (organization_id, app_version_id, report_version_id),
  FOREIGN KEY (organization_id, app_version_id, app_id) REFERENCES app_versions (organization_id, id, app_id),
  FOREIGN KEY (organization_id, report_version_id, app_id) REFERENCES report_versions (organization_id, id, app_id)
);

CREATE TABLE release_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  app_id uuid NOT NULL,
  app_version_id uuid NOT NULL,
  build_job_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('publish','rollback')),
  target_environment text NOT NULL DEFAULT 'production' CHECK (target_environment = 'production'),
  rollback_target_deployment_id uuid,
  requester_user_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft','submitted','approved','rejected','cancelled','expired')),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  snapshot_digest text NOT NULL,
  review_policy_snapshot jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, app_version_id, app_id) REFERENCES app_versions (organization_id, id, app_id),
  FOREIGN KEY (organization_id, build_job_id, app_version_id) REFERENCES build_jobs (organization_id, id, app_version_id),
  FOREIGN KEY (organization_id, requester_user_id) REFERENCES organization_members (organization_id, user_id),
  CHECK ((kind = 'rollback') = (rollback_target_deployment_id IS NOT NULL)),
  UNIQUE (organization_id, id, app_version_id, app_id),
  UNIQUE (organization_id, id, requester_user_id),
  UNIQUE (organization_id, id)
);

CREATE TABLE release_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  release_request_id uuid NOT NULL,
  dataset_version_id uuid NOT NULL,
  mapping_id uuid NOT NULL,
  logical_data_source_id uuid NOT NULL,
  environment text NOT NULL DEFAULT 'production' CHECK (environment = 'production'),
  field_keys text[] NOT NULL,
  metric_keys text[] NOT NULL,
  row_policy_key text NOT NULL,
  max_rows integer NOT NULL CHECK (max_rows BETWEEN 1 AND 1000),
  max_duration_ms integer NOT NULL CHECK (max_duration_ms BETWEEN 100 AND 10000),
  FOREIGN KEY (organization_id, release_request_id) REFERENCES release_requests (organization_id, id),
  FOREIGN KEY (organization_id, dataset_version_id) REFERENCES dataset_versions (organization_id, id),
  FOREIGN KEY (organization_id, mapping_id, logical_data_source_id, environment) REFERENCES source_mappings (organization_id, id, logical_data_source_id, environment),
  UNIQUE (organization_id, release_request_id, dataset_version_id),
  UNIQUE (organization_id, id, release_request_id, dataset_version_id, mapping_id),
  UNIQUE (organization_id, id)
);

CREATE TABLE release_audiences (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  release_request_id uuid NOT NULL,
  user_id uuid NOT NULL,
  PRIMARY KEY (organization_id, release_request_id, user_id),
  FOREIGN KEY (organization_id, release_request_id) REFERENCES release_requests (organization_id, id),
  FOREIGN KEY (organization_id, user_id) REFERENCES organization_members (organization_id, user_id)
);

CREATE TABLE approval_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  release_request_id uuid NOT NULL,
  requester_user_id uuid NOT NULL,
  approver_user_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approve','reject')),
  comment text NOT NULL,
  snapshot_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, release_request_id, requester_user_id) REFERENCES release_requests (organization_id, id, requester_user_id),
  FOREIGN KEY (organization_id, approver_user_id) REFERENCES organization_members (organization_id, user_id),
  CHECK (requester_user_id <> approver_user_id),
  UNIQUE (organization_id, release_request_id, approver_user_id),
  UNIQUE (organization_id, id)
);

CREATE TABLE deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  app_id uuid NOT NULL,
  app_version_id uuid NOT NULL,
  release_request_id uuid NOT NULL,
  environment text NOT NULL DEFAULT 'production' CHECK (environment = 'production'),
  status text NOT NULL CHECK (status IN ('queued','validating','deploying','active','superseded','failed')),
  artifact_digest text NOT NULL,
  previous_deployment_id uuid,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, release_request_id, app_version_id, app_id) REFERENCES release_requests (organization_id, id, app_version_id, app_id),
  FOREIGN KEY (organization_id, previous_deployment_id, app_id) REFERENCES deployments (organization_id, id, app_id),
  UNIQUE (organization_id, release_request_id),
  UNIQUE (organization_id, id, app_id),
  UNIQUE (organization_id, id, release_request_id),
  UNIQUE (organization_id, id)
);

ALTER TABLE release_requests ADD CONSTRAINT rollback_same_app_fk
  FOREIGN KEY (organization_id, rollback_target_deployment_id, app_id) REFERENCES deployments (organization_id, id, app_id);

CREATE TABLE deployment_slots (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  app_id uuid NOT NULL,
  environment text NOT NULL DEFAULT 'production' CHECK (environment = 'production'),
  deployment_id uuid NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  PRIMARY KEY (organization_id, app_id, environment),
  FOREIGN KEY (organization_id, deployment_id, app_id) REFERENCES deployments (organization_id, id, app_id)
);

CREATE TABLE runtime_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  deployment_id uuid NOT NULL,
  release_request_id uuid NOT NULL,
  release_scope_id uuid NOT NULL,
  dataset_version_id uuid NOT NULL,
  mapping_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('active','revoked')),
  policy_epoch bigint NOT NULL CHECK (policy_epoch > 0),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, deployment_id, release_request_id) REFERENCES deployments (organization_id, id, release_request_id),
  FOREIGN KEY (organization_id, release_scope_id, release_request_id, dataset_version_id, mapping_id) REFERENCES release_scopes (organization_id, id, release_request_id, dataset_version_id, mapping_id),
  UNIQUE (organization_id, deployment_id, dataset_version_id),
  UNIQUE (organization_id, id)
);

CREATE TABLE query_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  initiator_user_id uuid NOT NULL,
  app_version_id uuid NOT NULL,
  dataset_version_id uuid NOT NULL,
  environment text NOT NULL CHECK (environment IN ('test','production')),
  mapping_id uuid NOT NULL,
  logical_data_source_id uuid NOT NULL,
  deployment_id uuid,
  runtime_grant_id uuid,
  report_version_id uuid,
  query_spec jsonb NOT NULL,
  policy_epoch bigint NOT NULL,
  status text NOT NULL CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  result_object_key text,
  failure_code text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, initiator_user_id) REFERENCES organization_members (organization_id, user_id),
  FOREIGN KEY (organization_id, app_version_id) REFERENCES app_versions (organization_id, id),
  FOREIGN KEY (organization_id, dataset_version_id) REFERENCES dataset_versions (organization_id, id),
  FOREIGN KEY (organization_id, mapping_id, logical_data_source_id, environment) REFERENCES source_mappings (organization_id, id, logical_data_source_id, environment),
  FOREIGN KEY (organization_id, deployment_id) REFERENCES deployments (organization_id, id),
  FOREIGN KEY (organization_id, runtime_grant_id) REFERENCES runtime_grants (organization_id, id),
  FOREIGN KEY (organization_id, report_version_id) REFERENCES report_versions (organization_id, id),
  CHECK ((environment = 'production' AND deployment_id IS NOT NULL AND runtime_grant_id IS NOT NULL)
    OR (environment = 'test' AND deployment_id IS NULL AND runtime_grant_id IS NULL)),
  UNIQUE (organization_id, id)
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  actor_user_id uuid REFERENCES users(id),
  actor_service text,
  action text NOT NULL,
  resource_id uuid,
  outcome text NOT NULL CHECK (outcome IN ('allow','deny','error')),
  request_id text NOT NULL,
  safe_metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id)
);

CREATE TABLE outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id)
);

CREATE TABLE idempotency_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL,
  operation_id text NOT NULL,
  key uuid NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('processing','completed')),
  response_status integer,
  response_body jsonb,
  expires_at timestamptz NOT NULL,
  FOREIGN KEY (organization_id, user_id) REFERENCES organization_members (organization_id, user_id),
  UNIQUE (organization_id, user_id, operation_id, key),
  UNIQUE (organization_id, id)
);

CREATE INDEX organization_members_user_idx ON organization_members(user_id, status);
CREATE INDEX role_bindings_role_idx ON role_bindings(organization_id, role_id);
CREATE INDEX resource_grants_subject_idx ON resource_grants(organization_id, principal_user_id, action, expires_at);
CREATE INDEX apps_page_idx ON apps(organization_id, created_at DESC, id DESC);
CREATE INDEX reports_page_idx ON reports(organization_id, created_at DESC, id DESC);
CREATE INDEX datasets_source_idx ON datasets(organization_id, logical_data_source_id);
CREATE INDEX report_datasets_dataset_idx ON report_version_datasets(organization_id, dataset_version_id);
CREATE INDEX release_inbox_idx ON release_requests(organization_id, status, created_at DESC, id DESC);
CREATE INDEX build_claim_idx ON build_jobs(status, created_at) WHERE status = 'queued';
CREATE INDEX query_claim_idx ON query_jobs(environment, status, created_at) WHERE status = 'queued';
CREATE INDEX query_owner_idx ON query_jobs(organization_id, initiator_user_id, created_at DESC, id DESC);
CREATE INDEX query_expiry_idx ON query_jobs(expires_at);
CREATE INDEX grants_active_idx ON runtime_grants(organization_id, deployment_id, expires_at) WHERE status = 'active';
CREATE INDEX deployments_app_idx ON deployments(organization_id, app_id, created_at DESC, id DESC);
CREATE UNIQUE INDEX deployment_one_active_idx ON deployments(organization_id, app_id, environment) WHERE status = 'active';
CREATE INDEX outbox_unpublished_idx ON outbox_events(created_at, id) WHERE published_at IS NULL;
CREATE INDEX idempotency_expiry_idx ON idempotency_records(expires_at);
CREATE INDEX audit_resource_idx ON audit_logs(organization_id, resource_id, created_at DESC, id DESC);
CREATE INDEX audit_time_idx ON audit_logs(organization_id, created_at DESC, id DESC);
-- Server-owned, immutable row policy DSL. Keys include a policy revision.
CREATE TABLE row_policies (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  key text NOT NULL,
  definition jsonb NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
  digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, key)
);
ALTER TABLE dataset_versions ADD CONSTRAINT dataset_row_policy_fk
  FOREIGN KEY (organization_id, row_policy_key) REFERENCES row_policies(organization_id, key);
ALTER TABLE release_scopes ADD CONSTRAINT release_row_policy_fk
  FOREIGN KEY (organization_id, row_policy_key) REFERENCES row_policies(organization_id, key);

CREATE TABLE app_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  app_id uuid NOT NULL,
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, app_id) REFERENCES apps(organization_id, id),
  UNIQUE (organization_id, app_id, key),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, id, app_id)
);
CREATE TABLE app_collection_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  app_id uuid NOT NULL,
  app_version_id uuid NOT NULL,
  app_collection_id uuid NOT NULL,
  schema jsonb NOT NULL CHECK (jsonb_typeof(schema) = 'object'),
  row_policy text NOT NULL CHECK (row_policy IN ('owner','organization')),
  allowed_actions text[] NOT NULL CHECK (allowed_actions <@ ARRAY['create','read','update','delete']::text[]),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, app_version_id, app_id) REFERENCES app_versions(organization_id, id, app_id),
  FOREIGN KEY (organization_id, app_collection_id, app_id) REFERENCES app_collections(organization_id, id, app_id),
  UNIQUE (organization_id, app_version_id, app_collection_id),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, id, app_collection_id)
);
CREATE TABLE app_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  app_collection_id uuid NOT NULL,
  schema_version_id uuid NOT NULL,
  environment text NOT NULL CHECK (environment IN ('test','production')),
  owner_user_id uuid NOT NULL,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  FOREIGN KEY (organization_id, app_collection_id) REFERENCES app_collections(organization_id, id),
  FOREIGN KEY (organization_id, schema_version_id, app_collection_id) REFERENCES app_collection_versions(organization_id, id, app_collection_id),
  FOREIGN KEY (organization_id, owner_user_id) REFERENCES organization_members(organization_id, user_id),
  UNIQUE (organization_id, id)
);
CREATE INDEX app_records_page_idx ON app_records(organization_id, app_collection_id, environment, owner_user_id, created_at DESC, id DESC) WHERE deleted_at IS NULL;
COMMIT;
