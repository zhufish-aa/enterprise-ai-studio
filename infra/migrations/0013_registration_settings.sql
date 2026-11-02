-- Per-organization registration policy. Existing organizations keep invitation registration.
CREATE TABLE organization_registration_settings (
 organization_id uuid PRIMARY KEY REFERENCES organizations(id),
 invitation_required boolean NOT NULL DEFAULT true,
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_by uuid REFERENCES users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO organization_registration_settings(organization_id) SELECT id FROM organizations;
ALTER TABLE organization_registration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_registration_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY registration_settings_tenant ON organization_registration_settings
 USING(organization_id=nullif(current_setting('eas.organization_id',true),'')::uuid)
 WITH CHECK(organization_id=nullif(current_setting('eas.organization_id',true),'')::uuid);
GRANT SELECT,INSERT,UPDATE ON organization_registration_settings TO eas_api;

-- Public registration only needs the identity of organizations that explicitly allow it.
CREATE FUNCTION eas_open_registration_organizations() RETURNS TABLE(id uuid,name text)
 LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT o.id,o.name FROM public.organizations o
 JOIN public.organization_registration_settings s ON s.organization_id=o.id
 WHERE NOT s.invitation_required ORDER BY o.name,o.id
$$;
REVOKE ALL ON FUNCTION eas_open_registration_organizations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION eas_open_registration_organizations() TO eas_api;
