ALTER TABLE site_share_revisions DROP CONSTRAINT site_share_revisions_visibility_check;
ALTER TABLE site_share_revisions ADD CONSTRAINT site_share_revisions_visibility_check CHECK(visibility IN ('private','organization','public'));
-- Narrow discovery port; no anonymous table access or caller-selected tenant is granted.
CREATE FUNCTION eas_public_site_organization(requested_share uuid) RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT h.organization_id FROM public.site_share_heads h JOIN public.site_share_revisions r ON r.organization_id=h.organization_id AND r.app_id=h.app_id AND r.id=h.share_revision_id WHERE h.share_id=requested_share AND r.visibility='public'
$$;
REVOKE ALL ON FUNCTION eas_public_site_organization(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION eas_public_site_organization(uuid) TO eas_api;
CREATE FUNCTION eas_student_center_organization(requested_app uuid) RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT organization_id FROM public.student_center_settings WHERE app_id=requested_app
$$;
REVOKE ALL ON FUNCTION eas_student_center_organization(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION eas_student_center_organization(uuid) TO eas_api;
