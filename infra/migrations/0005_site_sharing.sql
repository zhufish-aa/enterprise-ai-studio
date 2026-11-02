-- Sharing is an organization-authenticated TEST viewer capability, never a production release.
CREATE TABLE site_share_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 app_id uuid NOT NULL,
 revision bigint NOT NULL CHECK(revision > 0),
 visibility text NOT NULL CHECK(visibility IN ('private','organization')),
 app_version_id uuid NOT NULL,
 build_job_id uuid NOT NULL,
 environment text NOT NULL DEFAULT 'test' CHECK(environment='test'),
 changed_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,app_id) REFERENCES apps(organization_id,id),
 FOREIGN KEY(organization_id,app_version_id,app_id) REFERENCES app_versions(organization_id,id,app_id),
 FOREIGN KEY(organization_id,build_job_id,app_version_id) REFERENCES build_jobs(organization_id,id,app_version_id),
 UNIQUE(organization_id,app_id,revision),
 UNIQUE(organization_id,id,app_id)
);
CREATE TABLE site_share_heads (
 organization_id uuid NOT NULL,
 app_id uuid NOT NULL,
 share_id uuid NOT NULL DEFAULT gen_random_uuid(),
 share_revision_id uuid NOT NULL,
 PRIMARY KEY(organization_id,app_id),
 UNIQUE(organization_id,share_id),
 FOREIGN KEY(organization_id,app_id) REFERENCES apps(organization_id,id),
 FOREIGN KEY(organization_id,share_revision_id,app_id) REFERENCES site_share_revisions(organization_id,id,app_id)
);
GRANT SELECT,INSERT ON site_share_revisions TO eas_api;
GRANT SELECT,INSERT,UPDATE ON site_share_heads TO eas_api;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['site_share_revisions','site_share_heads'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY tenant_site_sharing ON %I USING (organization_id = nullif(current_setting(''eas.organization_id'', true),'''')::uuid) WITH CHECK (organization_id = nullif(current_setting(''eas.organization_id'', true),'''')::uuid)',t);
 END LOOP;
END $$;
CREATE TRIGGER immutable_site_share_revision BEFORE UPDATE OR DELETE ON site_share_revisions FOR EACH ROW EXECUTE FUNCTION eas_immutable_catalog_version();
CREATE INDEX site_share_revision_history_idx ON site_share_revisions(organization_id,app_id,revision DESC);
