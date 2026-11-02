-- Opaque, organization-bound personal credentials. Plaintext is never persisted.
CREATE TABLE personal_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  token_hint text NOT NULL CHECK (length(token_hint) = 8),
  scope text NOT NULL CHECK (scope IN ('read','develop')),
  request_key uuid NOT NULL,
  request_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  UNIQUE (organization_id,user_id,request_key),
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '91 days')
);
CREATE INDEX personal_tokens_owner_idx ON personal_access_tokens(organization_id,user_id,created_at DESC);
ALTER TABLE personal_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_access_tokens FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON personal_access_tokens USING (organization_id = nullif(current_setting('eas.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('eas.organization_id',true),'')::uuid);
GRANT SELECT, INSERT, UPDATE ON personal_access_tokens TO eas_api;
-- The sole global lookup accepts a high-entropy digest and discloses no credential.
-- Migration owner must be privileged; API runtime remains NOSUPERUSER NOBYPASSRLS.
CREATE FUNCTION eas_authenticate_personal_token(digest text)
RETURNS TABLE (id uuid, organization_id uuid, user_id uuid, display_name text, scope text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 SELECT t.id,t.organization_id,t.user_id,u.display_name,t.scope,t.created_at
 FROM public.personal_access_tokens t JOIN public.users u ON u.id=t.user_id
 JOIN public.organization_members m ON m.organization_id=t.organization_id AND m.user_id=t.user_id
 WHERE t.token_hash=digest AND t.revoked_at IS NULL AND t.expires_at>now() AND u.status='active' AND m.status='active'
$$;
REVOKE ALL ON FUNCTION eas_authenticate_personal_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION eas_authenticate_personal_token(text) TO eas_api;
