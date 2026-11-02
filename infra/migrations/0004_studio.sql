-- Source artifacts and manifests are immutable. No release or production grant writer is added.
ALTER TABLE apps ADD COLUMN type text NOT NULL DEFAULT 'REPORT' CHECK(type IN ('REPORT','SITE'));
ALTER TABLE apps ADD COLUMN description text NOT NULL DEFAULT '';
ALTER TABLE apps ADD COLUMN workspace_id text NOT NULL DEFAULT '';
ALTER TABLE app_versions ADD COLUMN message text NOT NULL DEFAULT '';
ALTER TABLE app_versions ADD COLUMN restored_from uuid;
ALTER TABLE app_versions ADD COLUMN changes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE app_versions ADD FOREIGN KEY(organization_id,restored_from,app_id) REFERENCES app_versions(organization_id,id,app_id);
ALTER TABLE build_jobs ADD COLUMN logs jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE build_jobs ADD COLUMN preview_only boolean NOT NULL DEFAULT true;
ALTER TABLE build_jobs ADD CONSTRAINT studio_build_preview_only CHECK (preview_only OR attestation_ref NOT LIKE 'static-profile:%');
ALTER TABLE build_jobs ADD COLUMN lease_token uuid;
ALTER TABLE build_jobs ADD COLUMN lease_expires_at timestamptz;
CREATE TABLE studio_artifact_blobs (
 organization_id uuid NOT NULL,
 artifact_id uuid NOT NULL,
 content bytea NOT NULL CHECK(octet_length(content) BETWEEN 1 AND 8388608),
 PRIMARY KEY(organization_id,artifact_id),
 FOREIGN KEY(organization_id,artifact_id) REFERENCES artifacts(organization_id,id)
);
CREATE TABLE app_dataset_bindings (
 organization_id uuid NOT NULL,
 app_id uuid NOT NULL,
 dataset_version_id uuid NOT NULL,
 PRIMARY KEY(organization_id,app_id,dataset_version_id),
 FOREIGN KEY(organization_id,app_id) REFERENCES apps(organization_id,id),
 FOREIGN KEY(organization_id,dataset_version_id) REFERENCES dataset_versions(organization_id,id)
);
GRANT SELECT,INSERT ON artifacts,studio_artifact_blobs,app_versions,app_dataset_bindings,reports,report_versions,report_version_datasets,app_version_reports,app_members TO eas_api;
GRANT INSERT,UPDATE ON apps TO eas_api;
GRANT INSERT,UPDATE ON build_jobs TO eas_api;
GRANT UPDATE(revision) ON reports TO eas_api;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['studio_artifact_blobs','app_dataset_bindings','app_members'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY tenant_studio ON %I USING (organization_id = nullif(current_setting(''eas.organization_id'', true),'''')::uuid) WITH CHECK (organization_id = nullif(current_setting(''eas.organization_id'', true),'''')::uuid)',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['studio_artifact_blobs','app_dataset_bindings'] LOOP
 EXECUTE format('CREATE TRIGGER immutable_studio BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION eas_immutable_catalog_version()',t);
 END LOOP;
END $$;
CREATE INDEX studio_build_queue_idx ON build_jobs(created_at,id) WHERE status IN ('queued','running');
