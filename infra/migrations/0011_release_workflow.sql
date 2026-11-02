-- Stage 06: immutable review envelopes, ordered approvals and atomic activation.
ALTER TABLE release_requests DROP CONSTRAINT release_requests_status_check;
ALTER TABLE release_requests ADD CONSTRAINT release_requests_status_check CHECK(status IN ('draft','submitted','reviewing','approved','rejected','cancelled','withdrawn','expired','publishing','published','failed'));
ALTER TABLE release_requests ADD COLUMN test_results text NOT NULL DEFAULT '';
ALTER TABLE release_requests ADD COLUMN target_departments text[] NOT NULL DEFAULT '{}';
ALTER TABLE release_requests ADD COLUMN current_step integer NOT NULL DEFAULT 0;
ALTER TABLE release_requests ADD COLUMN submitted_at timestamptz;
ALTER TABLE release_requests ADD COLUMN requester_context jsonb NOT NULL DEFAULT '{}';
ALTER TABLE approval_records ADD COLUMN step_index integer;
ALTER TABLE approval_records ADD COLUMN role_key text;
DO $$ DECLARE c text; BEGIN
 SELECT conname INTO c FROM pg_constraint WHERE conrelid='approval_records'::regclass AND contype='u' AND pg_get_constraintdef(oid) LIKE '%release_request_id, approver_user_id)%';
 IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE approval_records DROP CONSTRAINT %I',c);END IF;
END $$;
CREATE UNIQUE INDEX approval_step_once ON approval_records(organization_id,release_request_id,step_index) WHERE step_index IS NOT NULL;
ALTER TABLE release_scopes DROP CONSTRAINT release_scopes_max_rows_check;
ALTER TABLE release_scopes ALTER COLUMN max_rows DROP NOT NULL;
ALTER TABLE release_scopes ADD CHECK(max_rows IS NULL OR max_rows>0);
ALTER TABLE deployments ADD COLUMN phase text NOT NULL DEFAULT 'queued';
ALTER TABLE deployments ADD COLUMN attempt integer NOT NULL DEFAULT 0;
ALTER TABLE deployments ADD COLUMN lease_token uuid;
ALTER TABLE deployments ADD COLUMN lease_expires_at timestamptz;
ALTER TABLE deployments ADD COLUMN initiated_by uuid;
ALTER TABLE deployments ADD COLUMN initiator_context jsonb;
ALTER TABLE deployments ADD COLUMN trace_id uuid;
ALTER TABLE deployments ADD FOREIGN KEY(organization_id,initiated_by) REFERENCES organization_members(organization_id,user_id);

CREATE TABLE release_policies (
 organization_id uuid NOT NULL,app_id uuid NOT NULL,revision bigint NOT NULL DEFAULT 1,steps jsonb NOT NULL,
 updated_by uuid NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(organization_id,app_id),
 FOREIGN KEY(organization_id,app_id) REFERENCES apps(organization_id,id),
 FOREIGN KEY(organization_id,updated_by) REFERENCES organization_members(organization_id,user_id)
);
CREATE TABLE deployment_artifacts (
 organization_id uuid NOT NULL,deployment_id uuid NOT NULL,artifact_id uuid NOT NULL,artifact_digest text NOT NULL,
 attestation jsonb NOT NULL,attestation_digest text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,deployment_id),FOREIGN KEY(organization_id,deployment_id) REFERENCES deployments(organization_id,id),
 FOREIGN KEY(organization_id,artifact_id) REFERENCES artifacts(organization_id,id)
);
CREATE TABLE release_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL,release_request_id uuid NOT NULL,
 deployment_id uuid,actor_user_id uuid NOT NULL,event text NOT NULL,detail jsonb NOT NULL DEFAULT '{}',trace_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,release_request_id) REFERENCES release_requests(organization_id,id),
 FOREIGN KEY(organization_id,deployment_id) REFERENCES deployments(organization_id,id),
 FOREIGN KEY(organization_id,actor_user_id) REFERENCES organization_members(organization_id,user_id)
);
CREATE INDEX release_events_history ON release_events(organization_id,release_request_id,created_at,id);
CREATE INDEX deployment_queue ON deployments(organization_id,created_at,id) WHERE status IN('queued','validating','deploying');
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['release_policies','deployment_artifacts','release_events'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY tenant_release ON %I TO eas_api USING(organization_id=nullif(current_setting(''eas.organization_id'',true),'''')::uuid) WITH CHECK(organization_id=nullif(current_setting(''eas.organization_id'',true),'''')::uuid)',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['deployment_artifacts','release_events'] LOOP
  EXECUTE format('CREATE TRIGGER immutable_release BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION eas_immutable_catalog_version()',t);
 END LOOP;
END $$;
CREATE FUNCTION eas_release_frozen() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['status','revision','current_step','submitted_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','revision','current_step','submitted_at']) THEN
  RAISE EXCEPTION 'release envelope is immutable' USING ERRCODE='23514';
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER release_frozen BEFORE UPDATE OR DELETE ON release_requests FOR EACH ROW EXECUTE FUNCTION eas_release_frozen();
GRANT SELECT,INSERT,UPDATE ON release_requests,deployments,deployment_slots,release_policies TO eas_api;
GRANT SELECT,INSERT ON release_scopes,release_audiences,approval_records,deployment_artifacts,release_events TO eas_api;
GRANT SELECT,INSERT,UPDATE ON runtime_grants TO eas_api;
INSERT INTO permissions(key,description) VALUES('release.create','Create and submit immutable releases'),('release.read','Read releases'),('release.policy.manage','Configure approval routing'),('release.deploy','Execute approved deployments') ON CONFLICT DO NOTHING;
-- Existing account roles inherit equivalent actions, without inventing new role names.
INSERT INTO role_permissions(organization_id,role_id,permission_key)
 SELECT DISTINCT organization_id,role_id,'release.create' FROM role_permissions WHERE permission_key='app.develop' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(organization_id,role_id,permission_key)
 SELECT DISTINCT organization_id,role_id,'release.read' FROM role_permissions WHERE permission_key='app.view' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(organization_id,role_id,permission_key)
 SELECT DISTINCT organization_id,role_id,'dataset.query.production' FROM role_permissions WHERE permission_key='app.view' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(organization_id,role_id,permission_key)
 SELECT DISTINCT p.organization_id,p.role_id,k FROM role_permissions p CROSS JOIN unnest(ARRAY['release.policy.manage','release.deploy','release.approve']) k WHERE p.permission_key='permission.manage' ON CONFLICT DO NOTHING;
