ALTER TABLE organization_members ADD COLUMN department_codes text[] NOT NULL DEFAULT '{}' CHECK(cardinality(department_codes)<=20);
CREATE TABLE query_policies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id),
 dataset_id uuid NOT NULL, dataset_version_id uuid NOT NULL, revision integer NOT NULL CHECK(revision>0),
 definition jsonb NOT NULL CHECK(jsonb_typeof(definition)='object'), digest text NOT NULL,
 row_policy_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,dataset_id) REFERENCES datasets(organization_id,id),
 FOREIGN KEY(organization_id,dataset_version_id) REFERENCES dataset_versions(organization_id,id),
 FOREIGN KEY(organization_id,row_policy_key) REFERENCES row_policies(organization_id,key),
 UNIQUE(organization_id,dataset_version_id,revision), UNIQUE(organization_id,id),
 UNIQUE(organization_id,id,dataset_version_id)
);
CREATE TABLE query_policy_heads (
 organization_id uuid NOT NULL REFERENCES organizations(id), dataset_version_id uuid NOT NULL, policy_id uuid NOT NULL,
 PRIMARY KEY(organization_id,dataset_version_id),
 FOREIGN KEY(organization_id,policy_id,dataset_version_id) REFERENCES query_policies(organization_id,id,dataset_version_id)
);
ALTER TABLE query_jobs ALTER COLUMN app_version_id DROP NOT NULL;
ALTER TABLE query_jobs
 ADD COLUMN dataset_id uuid NOT NULL,
 ADD COLUMN physical_connection_id uuid NOT NULL,
 ADD COLUMN query_policy_id uuid NOT NULL,
 ADD COLUMN purpose text NOT NULL CHECK(purpose IN ('query','export')),
 ADD COLUMN context jsonb NOT NULL CHECK(jsonb_typeof(context)='object'),
 ADD COLUMN authorization_digest text NOT NULL,
 ADD COLUMN trace_id uuid NOT NULL,
 ADD COLUMN attempt integer NOT NULL DEFAULT 0 CHECK(attempt BETWEEN 0 AND 3),
 ADD COLUMN lease_expires_at timestamptz,
 ADD COLUMN result jsonb,
 ADD COLUMN duration_ms integer,
 ADD COLUMN row_count integer NOT NULL DEFAULT 0 CHECK(row_count BETWEEN 0 AND 10000),
 ADD COLUMN completed_at timestamptz,
 ADD FOREIGN KEY(organization_id,dataset_id) REFERENCES datasets(organization_id,id),
 ADD FOREIGN KEY(organization_id,physical_connection_id,environment) REFERENCES physical_connections(organization_id,id,environment),
 ADD FOREIGN KEY(organization_id,query_policy_id,dataset_version_id) REFERENCES query_policies(organization_id,id,dataset_version_id),
 ADD CHECK(environment<>'production' OR app_version_id IS NOT NULL);
CREATE INDEX query_recovery_idx ON query_jobs(organization_id,status,lease_expires_at,created_at);
CREATE TABLE query_audits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id),
 user_id uuid NOT NULL REFERENCES users(id), job_id uuid, app_id uuid, report_id uuid, dataset_id uuid,
 environment text NOT NULL CHECK(environment IN ('test','production')),
 duration_ms integer NOT NULL CHECK(duration_ms>=0), row_count integer NOT NULL CHECK(row_count>=0),
 status text NOT NULL, permission_result text NOT NULL CHECK(permission_result IN ('allow','deny')),
 trace_id uuid NOT NULL, slow boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id)
);
CREATE INDEX query_audit_trace_idx ON query_audits(organization_id,trace_id,created_at DESC);
CREATE TRIGGER immutable_query_policies BEFORE UPDATE OR DELETE ON query_policies FOR EACH ROW EXECUTE FUNCTION eas_immutable_catalog_version();
CREATE TRIGGER immutable_row_policies BEFORE UPDATE OR DELETE ON row_policies FOR EACH ROW EXECUTE FUNCTION eas_immutable_catalog_version();
CREATE TRIGGER immutable_query_audits BEFORE UPDATE OR DELETE ON query_audits FOR EACH ROW EXECUTE FUNCTION eas_immutable_catalog_version();
-- The gateway consumes release facts; it cannot approve, deploy, grant, or change these facts.
GRANT SELECT ON apps,app_versions,app_version_reports,reports,report_versions,report_version_datasets,build_jobs,release_requests,release_scopes,release_audiences,approval_records,deployments,deployment_slots,artifacts TO eas_api;
GRANT SELECT,INSERT,UPDATE ON query_jobs,query_policy_heads TO eas_api;
GRANT SELECT,INSERT ON query_policies,query_audits TO eas_api;
GRANT UPDATE(department_codes) ON organization_members TO eas_api;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['query_policies','query_policy_heads','query_jobs','query_audits','apps','app_versions','app_version_reports','reports','report_versions','report_version_datasets','build_jobs','release_requests','release_scopes','release_audiences','approval_records','deployments','deployment_slots','artifacts'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY organization_isolation ON %I TO eas_api USING (organization_id = nullif(current_setting(''eas.organization_id'',true),'''')::uuid) WITH CHECK (organization_id = nullif(current_setting(''eas.organization_id'',true),'''')::uuid)',t);
 END LOOP;
END $$;
-- Release snapshots consumed by stage03 cannot be rewritten through ordinary SQL UPDATE.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['app_versions','report_versions','report_version_datasets','app_version_reports','release_scopes','release_audiences','approval_records'] LOOP
  EXECUTE format('CREATE TRIGGER immutable_gateway_release_fact BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION eas_immutable_catalog_version()',t);
 END LOOP;
END $$;
