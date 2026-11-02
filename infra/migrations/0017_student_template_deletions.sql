-- Remove a template from future use without modifying immutable versions or issued certificates.
CREATE TABLE student_center_template_deletions (
 organization_id uuid NOT NULL,
 app_id uuid NOT NULL,
 kind text NOT NULL,
 template_id uuid NOT NULL,
 deleted_by uuid NOT NULL,
 deleted_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,app_id,kind),
 FOREIGN KEY(organization_id,app_id) REFERENCES student_center_settings(organization_id,app_id),
 FOREIGN KEY(organization_id,app_id,template_id) REFERENCES student_center_template_versions(organization_id,app_id,id),
 FOREIGN KEY(organization_id,app_id,deleted_by) REFERENCES student_center_accounts(organization_id,app_id,id)
);
ALTER TABLE student_center_template_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_center_template_deletions FORCE ROW LEVEL SECURITY;
CREATE POLICY student_center_tenant ON student_center_template_deletions
 USING(organization_id=nullif(current_setting('eas.organization_id',true),'')::uuid)
 WITH CHECK(organization_id=nullif(current_setting('eas.organization_id',true),'')::uuid);
GRANT SELECT,INSERT ON student_center_template_deletions TO eas_api;
