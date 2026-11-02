-- Mutable server drafts are separate from immutable source versions/artifacts.
CREATE TABLE app_workspaces (
 organization_id uuid NOT NULL,
 app_id uuid NOT NULL,
 revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0),
 base_version_id uuid,
 updated_by uuid NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,app_id),
 FOREIGN KEY(organization_id,app_id) REFERENCES apps(organization_id,id),
 FOREIGN KEY(organization_id,base_version_id,app_id) REFERENCES app_versions(organization_id,id,app_id),
 FOREIGN KEY(organization_id,updated_by) REFERENCES organization_members(organization_id,user_id)
);
CREATE TABLE app_workspace_files (
 organization_id uuid NOT NULL,
 app_id uuid NOT NULL,
 path text NOT NULL CHECK(length(path) BETWEEN 1 AND 160),
 content text NOT NULL CHECK(octet_length(content)<=131072),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,app_id,path),
 FOREIGN KEY(organization_id,app_id) REFERENCES app_workspaces(organization_id,app_id)
);
CREATE UNIQUE INDEX workspace_casefold_path ON app_workspace_files(organization_id,app_id,lower(path));
GRANT SELECT,INSERT,UPDATE ON app_workspaces TO eas_api;
GRANT SELECT,INSERT,UPDATE,DELETE ON app_workspace_files TO eas_api;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['app_workspaces','app_workspace_files'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY tenant_workspace ON %I TO eas_api USING (organization_id=nullif(current_setting(''eas.organization_id'',true),'''')::uuid) WITH CHECK (organization_id=nullif(current_setting(''eas.organization_id'',true),'''')::uuid)',t);
 END LOOP;
END $$;
