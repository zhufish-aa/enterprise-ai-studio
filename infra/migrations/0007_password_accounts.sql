-- Interactive account authentication; no public administrator bootstrap endpoint.
ALTER TABLE auth_sessions ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE auth_sessions ADD CONSTRAINT auth_sessions_id_unique UNIQUE(id);
ALTER TABLE auth_sessions ADD COLUMN auth_method text NOT NULL DEFAULT 'legacy' CHECK(auth_method IN ('legacy','password'));
CREATE INDEX auth_sessions_user_idx ON auth_sessions(user_id,expires_at DESC);
CREATE TABLE password_accounts (
 user_id uuid PRIMARY KEY REFERENCES users(id),
 username text NOT NULL UNIQUE CHECK(username ~ '^[a-z][a-z0-9_.-]{2,63}$'),
 password_hash text NOT NULL,
 must_change_password boolean NOT NULL DEFAULT false,
 password_changed_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE auth_rate_limits (
 bucket_hash text PRIMARY KEY CHECK(bucket_hash ~ '^[a-f0-9]{64}$'),
 window_started_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 1 CHECK(attempts>0)
);
CREATE TABLE organization_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES organizations(id),
 token_hash text NOT NULL UNIQUE CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 80),
 role_kind text NOT NULL CHECK(role_kind IN ('viewer','developer')),
 request_key uuid NOT NULL,
 role_id uuid NOT NULL,
 created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 used_by uuid REFERENCES users(id),
 used_at timestamptz,
 FOREIGN KEY(organization_id,role_id) REFERENCES roles(organization_id,id),
 UNIQUE(organization_id,created_by,request_key),
 CHECK((used_by IS NULL)=(used_at IS NULL)),
 CHECK(expires_at>created_at AND expires_at<=created_at+interval '8 days')
);
CREATE INDEX invitations_org_idx ON organization_invitations(organization_id,created_at DESC);
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations FORCE ROW LEVEL SECURITY;
CREATE POLICY invitation_tenant ON organization_invitations USING(organization_id=nullif(current_setting('eas.organization_id',true),'')::uuid) WITH CHECK(organization_id=nullif(current_setting('eas.organization_id',true),'')::uuid);
CREATE FUNCTION eas_invitation_organization(digest text) RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT organization_id FROM public.organization_invitations WHERE token_hash=digest AND revoked_at IS NULL AND used_at IS NULL AND expires_at>now()
$$;
REVOKE ALL ON FUNCTION eas_invitation_organization(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION eas_invitation_organization(text) TO eas_api;
GRANT SELECT,INSERT,UPDATE ON password_accounts,auth_rate_limits,organization_invitations TO eas_api;
GRANT DELETE ON auth_rate_limits TO eas_api;
GRANT INSERT,UPDATE ON auth_sessions TO eas_api;
GRANT INSERT ON users,organization_members,roles,role_permissions,role_bindings TO eas_api;
INSERT INTO permissions(key,description) VALUES('account.manage','Manage organization registration invitations') ON CONFLICT DO NOTHING;
