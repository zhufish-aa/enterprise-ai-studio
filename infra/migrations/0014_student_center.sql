-- Platform-managed departmental records. These do not connect to enterprise business databases.
CREATE TABLE student_center_settings (
 organization_id uuid NOT NULL, app_id uuid NOT NULL,
 school_name text NOT NULL DEFAULT '', department_name text NOT NULL DEFAULT '学生事务中心',
 signature text NOT NULL DEFAULT '', academic_year text NOT NULL DEFAULT '',
 holiday_start text NOT NULL DEFAULT '', holiday_end text NOT NULL DEFAULT '',
 revision bigint NOT NULL DEFAULT 1, next_number bigint NOT NULL DEFAULT 1,
 PRIMARY KEY(organization_id,app_id),
 FOREIGN KEY(organization_id,app_id) REFERENCES apps(organization_id,id)
);
CREATE TABLE student_center_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, app_id uuid NOT NULL,
 username text NOT NULL, display_name text NOT NULL, password_hash text NOT NULL, active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,app_id,username), UNIQUE(organization_id,app_id,id),
 FOREIGN KEY(organization_id,app_id) REFERENCES student_center_settings(organization_id,app_id)
);
CREATE TABLE student_center_members (
 organization_id uuid NOT NULL, app_id uuid NOT NULL, user_id uuid NOT NULL,
 role text NOT NULL CHECK(role IN ('administrator','staff')),
 PRIMARY KEY(organization_id,app_id,user_id),
 FOREIGN KEY(organization_id,app_id) REFERENCES student_center_settings(organization_id,app_id),
 FOREIGN KEY(organization_id,app_id,user_id) REFERENCES student_center_accounts(organization_id,app_id,id)
);
CREATE TABLE student_center_sessions (
 token_hash text PRIMARY KEY, organization_id uuid NOT NULL, app_id uuid NOT NULL, user_id uuid NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days', revoked_at timestamptz,
 FOREIGN KEY(organization_id,app_id,user_id) REFERENCES student_center_accounts(organization_id,app_id,id)
);
CREATE TABLE student_center_idempotency (
 organization_id uuid NOT NULL, app_id uuid NOT NULL, user_id uuid NOT NULL, key uuid NOT NULL,
 request_hash text NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,app_id,user_id,key),
 FOREIGN KEY(organization_id,app_id,user_id) REFERENCES student_center_accounts(organization_id,app_id,id)
);
CREATE TABLE student_center_students (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, app_id uuid NOT NULL,
 student_number text NOT NULL, name text NOT NULL, profile jsonb NOT NULL,
 revision bigint NOT NULL DEFAULT 1, archived boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,app_id,student_number), UNIQUE(organization_id,app_id,id),
 FOREIGN KEY(organization_id,app_id) REFERENCES student_center_settings(organization_id,app_id)
);
CREATE INDEX student_center_students_name ON student_center_students(organization_id,app_id,name) WHERE NOT archived;
CREATE TABLE student_center_template_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, app_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind ~ '^[a-z][a-z0-9_-]*$'),
 name text NOT NULL, format text NOT NULL CHECK(format IN ('text','docx')),
 body text NOT NULL DEFAULT '', required_fields jsonb NOT NULL, version integer NOT NULL,
 original_file_name text NOT NULL DEFAULT '', content bytea,
 created_at timestamptz NOT NULL DEFAULT now(), created_by uuid NOT NULL,
 UNIQUE(organization_id,app_id,kind,version), UNIQUE(organization_id,app_id,id),
 FOREIGN KEY(organization_id,app_id) REFERENCES student_center_settings(organization_id,app_id),
 FOREIGN KEY(organization_id,app_id,created_by) REFERENCES student_center_accounts(organization_id,app_id,id),
 CHECK((format='docx' AND content IS NOT NULL) OR (format='text' AND content IS NULL))
);
CREATE TABLE student_center_certificates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, app_id uuid NOT NULL,
 number text NOT NULL, student_id uuid NOT NULL, template_id uuid NOT NULL, fields jsonb NOT NULL,
 issue_date date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid NOT NULL,
 UNIQUE(organization_id,app_id,number), UNIQUE(organization_id,app_id,id),
 FOREIGN KEY(organization_id,app_id,student_id) REFERENCES student_center_students(organization_id,app_id,id),
 FOREIGN KEY(organization_id,app_id,template_id) REFERENCES student_center_template_versions(organization_id,app_id,id),
 FOREIGN KEY(organization_id,app_id,created_by) REFERENCES student_center_accounts(organization_id,app_id,id)
);
CREATE INDEX student_center_certificates_recent ON student_center_certificates(organization_id,app_id,created_at DESC,id);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['student_center_settings','student_center_accounts','student_center_members','student_center_sessions','student_center_idempotency','student_center_students','student_center_template_versions','student_center_certificates'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY student_center_tenant ON %I USING(organization_id=nullif(current_setting(''eas.organization_id'',true),'''')::uuid) WITH CHECK(organization_id=nullif(current_setting(''eas.organization_id'',true),'''')::uuid)',t);
 END LOOP;
END $$;
GRANT SELECT,INSERT,UPDATE ON student_center_settings,student_center_members,student_center_students TO eas_api;
GRANT DELETE ON student_center_members TO eas_api;
GRANT SELECT,INSERT,UPDATE ON student_center_accounts,student_center_sessions TO eas_api;
GRANT SELECT,INSERT ON student_center_idempotency TO eas_api;
GRANT SELECT,INSERT ON student_center_template_versions,student_center_certificates TO eas_api;
