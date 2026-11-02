-- Resolve only currently public apps; business records no longer participate in routing.
CREATE FUNCTION eas_public_app_organization(requested_app uuid) RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT h.organization_id FROM public.site_share_heads h
 JOIN public.site_share_revisions r ON r.organization_id=h.organization_id AND r.id=h.share_revision_id
 WHERE h.app_id=requested_app AND r.visibility='public' LIMIT 1
$$;
REVOKE ALL ON FUNCTION eas_public_app_organization(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION eas_public_app_organization(uuid) TO eas_api;
