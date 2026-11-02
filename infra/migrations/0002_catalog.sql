ALTER TABLE resources DROP CONSTRAINT resources_kind_check;
ALTER TABLE resources ADD CONSTRAINT resources_kind_check CHECK (kind IN ('app','report','dataset','logical_data_source'));
INSERT INTO resources(id, organization_id, kind)
SELECT id, organization_id, 'logical_data_source' FROM logical_data_sources ON CONFLICT DO NOTHING;
ALTER TABLE logical_data_sources
  ADD COLUMN resource_kind text NOT NULL DEFAULT 'logical_data_source' CHECK (resource_kind = 'logical_data_source'),
  ADD COLUMN system_code text NOT NULL DEFAULT '',
  ADD COLUMN engine text NOT NULL DEFAULT 'postgresql' CHECK (engine IN ('postgresql','mysql','sqlserver')),
  ADD COLUMN description text NOT NULL DEFAULT '',
  ADD COLUMN department text NOT NULL DEFAULT '',
  ADD COLUMN owner_user_id uuid,
  ADD COLUMN sensitivity text NOT NULL DEFAULT 'internal' CHECK (sensitivity IN ('public','internal','sensitive','restricted')),
  ADD COLUMN status text NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled','disabled')),
  ADD COLUMN revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD FOREIGN KEY (organization_id, id, resource_kind) REFERENCES resources(organization_id,id,kind),
  ADD FOREIGN KEY (organization_id, owner_user_id) REFERENCES organization_members(organization_id,user_id);
UPDATE logical_data_sources SET system_code = key WHERE system_code = '';
CREATE INDEX sources_list_idx ON logical_data_sources(organization_id, status, created_at DESC,id DESC);

ALTER TABLE network_endpoints
  ADD COLUMN engine text NOT NULL DEFAULT 'postgresql' CHECK (engine IN ('postgresql','mysql','sqlserver')),
  ADD COLUMN allowed_databases text[] NOT NULL DEFAULT ARRAY['postgres'],
  ADD COLUMN allowed_relations jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(allowed_relations)='array'),
  ADD COLUMN tls_mode text NOT NULL DEFAULT 'verify-full' CHECK (tls_mode IN ('verify-full','disable-fixture')),
  ADD COLUMN ca_ref text,
  ADD COLUMN local_fixture boolean NOT NULL DEFAULT false,
  ADD UNIQUE(organization_id,id,environment,engine);
CREATE TABLE credential_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  label text NOT NULL,
  engine text NOT NULL CHECK (engine IN ('postgresql','mysql','sqlserver')),
  environment text NOT NULL CHECK (environment IN ('test','production')),
  secret_ref text NOT NULL,
  allowed_endpoint_ids uuid[] NOT NULL CHECK (cardinality(allowed_endpoint_ids)>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,label,environment),
  UNIQUE(organization_id,id),
  UNIQUE(organization_id,id,environment,engine)
);
ALTER TABLE physical_connections DROP CONSTRAINT physical_connections_engine_check;
ALTER TABLE physical_connections ADD CONSTRAINT physical_connections_engine_check CHECK (engine IN ('postgresql','mysql','sqlserver'));
ALTER TABLE physical_connections
  ADD COLUMN credential_profile_id uuid,
  ADD COLUMN connect_timeout_ms integer NOT NULL DEFAULT 5000 CHECK (connect_timeout_ms BETWEEN 100 AND 10000),
  ADD COLUMN request_timeout_ms integer NOT NULL DEFAULT 10000 CHECK (request_timeout_ms BETWEEN 100 AND 30000),
  ADD COLUMN pool_max integer NOT NULL DEFAULT 2 CHECK (pool_max BETWEEN 1 AND 8),
  ADD COLUMN metadata_scope jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(metadata_scope)='array'),
  ADD COLUMN revision bigint NOT NULL DEFAULT 1 CHECK (revision>0),
  ADD COLUMN last_health_status text NOT NULL DEFAULT 'unknown' CHECK (last_health_status IN ('unknown','healthy','unhealthy')),
  ADD COLUMN last_checked_at timestamptz,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD FOREIGN KEY(organization_id,credential_profile_id,environment,engine) REFERENCES credential_profiles(organization_id,id,environment,engine),
  ADD FOREIGN KEY(organization_id,endpoint_id,environment,engine) REFERENCES network_endpoints(organization_id,id,environment,engine);

ALTER TABLE datasets
  ADD COLUMN description text NOT NULL DEFAULT '',
  ADD COLUMN status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','enabled','disabled')),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE dataset_versions
  ADD COLUMN metadata_snapshot_id uuid,
  ADD COLUMN definition jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(definition)='object');
ALTER TABLE dataset_fields
  ADD COLUMN name text NOT NULL DEFAULT '',
  ADD COLUMN description text NOT NULL DEFAULT '',
  ADD COLUMN is_dimension boolean NOT NULL DEFAULT false;
ALTER TABLE metric_definitions
  ADD COLUMN name text NOT NULL DEFAULT '',
  ADD COLUMN business_definition text NOT NULL DEFAULT '',
  ADD COLUMN description text NOT NULL DEFAULT '',
  ADD COLUMN filters jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(filters)='array'),
  ADD COLUMN available_dimensions text[] NOT NULL DEFAULT '{}';
ALTER TABLE metric_definitions DROP CONSTRAINT metric_definitions_aggregate_check;
ALTER TABLE metric_definitions ADD CONSTRAINT metric_definitions_aggregate_check CHECK (aggregate IN ('count','countDistinct','sum','avg','min','max'));
ALTER TABLE resource_grants ADD COLUMN constraints jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(constraints)='object');

CREATE TABLE auth_sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  client_kind text NOT NULL CHECK (client_kind IN ('human','ai')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE TABLE catalog_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  requested_by uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('health','metadata','preview')),
  environment text NOT NULL CHECK (environment IN ('test','production')),
  physical_connection_id uuid NOT NULL,
  dataset_version_id uuid,
  input jsonb NOT NULL CHECK (jsonb_typeof(input)='object'),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed')),
  attempt integer NOT NULL DEFAULT 0 CHECK (attempt>=0),
  retry_of uuid,
  lease_expires_at timestamptz,
  policy_epoch bigint NOT NULL,
  result jsonb,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(organization_id,id),
  FOREIGN KEY(organization_id,requested_by) REFERENCES organization_members(organization_id,user_id),
  FOREIGN KEY(organization_id,physical_connection_id,environment) REFERENCES physical_connections(organization_id,id,environment),
  FOREIGN KEY(organization_id,dataset_version_id) REFERENCES dataset_versions(organization_id,id),
  FOREIGN KEY(organization_id,retry_of) REFERENCES catalog_jobs(organization_id,id),
  CHECK (operation <> 'preview' OR (environment='test' AND dataset_version_id IS NOT NULL))
);
CREATE INDEX catalog_jobs_recovery_idx ON catalog_jobs(organization_id,status,lease_expires_at,created_at);
CREATE TABLE metadata_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  physical_connection_id uuid NOT NULL,
  job_id uuid NOT NULL,
  schema_digest text NOT NULL,
  relations jsonb NOT NULL CHECK (jsonb_typeof(relations)='array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,id),
  UNIQUE(organization_id,job_id),
  FOREIGN KEY(organization_id,physical_connection_id) REFERENCES physical_connections(organization_id,id),
  FOREIGN KEY(organization_id,job_id) REFERENCES catalog_jobs(organization_id,id)
);
ALTER TABLE dataset_versions ADD FOREIGN KEY (organization_id,metadata_snapshot_id) REFERENCES metadata_snapshots(organization_id,id);
CREATE INDEX metadata_connection_idx ON metadata_snapshots(organization_id,physical_connection_id,created_at DESC,id DESC);

CREATE FUNCTION eas_immutable_catalog_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'IMMUTABLE_CATALOG_VERSION' USING ERRCODE='23514';
END $$;
CREATE FUNCTION eas_user_organizations(subject_user_id uuid)
RETURNS TABLE(id uuid,name text) LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT o.id,o.name FROM public.organizations o JOIN public.organization_members m ON m.organization_id=o.id
  WHERE m.user_id=subject_user_id AND m.status='active' ORDER BY o.id
$$;
REVOKE ALL ON FUNCTION eas_user_organizations(uuid) FROM PUBLIC;
CREATE TRIGGER immutable_dataset_versions BEFORE UPDATE OR DELETE ON dataset_versions FOR EACH ROW EXECUTE FUNCTION eas_immutable_catalog_version();
CREATE TRIGGER immutable_dataset_fields BEFORE UPDATE OR DELETE ON dataset_fields FOR EACH ROW EXECUTE FUNCTION eas_immutable_catalog_version();
CREATE TRIGGER immutable_metric_definitions BEFORE UPDATE OR DELETE ON metric_definitions FOR EACH ROW EXECUTE FUNCTION eas_immutable_catalog_version();
CREATE TRIGGER immutable_source_mappings BEFORE UPDATE OR DELETE ON source_mappings FOR EACH ROW EXECUTE FUNCTION eas_immutable_catalog_version();
CREATE TRIGGER immutable_metadata_snapshots BEFORE UPDATE OR DELETE ON metadata_snapshots FOR EACH ROW EXECUTE FUNCTION eas_immutable_catalog_version();

-- Runtime roles do not own tables and cannot bypass tenant RLS.
DO $$ BEGIN
  IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='eas_api') THEN CREATE ROLE eas_api NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO eas_api;
GRANT EXECUTE ON FUNCTION eas_user_organizations(uuid) TO eas_api;
GRANT SELECT ON users,organizations,permissions,auth_sessions TO eas_api;
GRANT SELECT ON organization_members,roles,role_permissions,role_bindings TO eas_api;
GRANT SELECT,INSERT,UPDATE ON resources,resource_grants,logical_data_sources,physical_connections,source_mappings,mapping_heads,datasets,dataset_versions,dataset_fields,metric_definitions,row_policies,catalog_jobs,metadata_snapshots,idempotency_records,outbox_events TO eas_api;
GRANT DELETE ON resource_grants TO eas_api;
GRANT SELECT ON network_endpoints,credential_profiles TO eas_api;
GRANT INSERT ON audit_logs TO eas_api;
GRANT SELECT,UPDATE ON runtime_grants TO eas_api;
GRANT UPDATE(policy_epoch) ON organizations TO eas_api;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['organization_members','roles','role_permissions','role_bindings','resources','resource_grants','logical_data_sources','physical_connections','source_mappings','mapping_heads','datasets','dataset_versions','dataset_fields','metric_definitions','row_policies','network_endpoints','credential_profiles','catalog_jobs','metadata_snapshots','idempotency_records','outbox_events','audit_logs','runtime_grants'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY organization_isolation ON %I TO eas_api USING (organization_id = nullif(current_setting(''eas.organization_id'',true),'''')::uuid) WITH CHECK (organization_id = nullif(current_setting(''eas.organization_id'',true),'''')::uuid)',t);
  END LOOP;
END $$;
