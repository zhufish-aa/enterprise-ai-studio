-- Approval freezes logical data requirements. Physical PROD mappings are bound
-- once when the controlled deployment is created, never while drafting a request.
ALTER TABLE release_scopes ALTER COLUMN mapping_id DROP NOT NULL;
ALTER TABLE release_scopes ADD UNIQUE(organization_id,id,release_request_id,dataset_version_id);
ALTER TABLE deployments ADD COLUMN mapping_snapshot jsonb NOT NULL DEFAULT '[]';
UPDATE deployments d SET mapping_snapshot=coalesce((SELECT jsonb_agg(jsonb_build_object('datasetVersionId',s->>'datasetVersionId','mapping',s->'mapping')) FROM release_requests r CROSS JOIN LATERAL jsonb_array_elements(r.review_policy_snapshot->'scopes') s WHERE r.organization_id=d.organization_id AND r.id=d.release_request_id),'[]');
CREATE FUNCTION eas_deployment_mapping_frozen() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.mapping_snapshot IS DISTINCT FROM OLD.mapping_snapshot THEN RAISE EXCEPTION 'deployment mapping binding is immutable' USING ERRCODE='23514';END IF;RETURN NEW;
END $$;
CREATE TRIGGER deployment_mapping_frozen BEFORE UPDATE ON deployments FOR EACH ROW EXECUTE FUNCTION eas_deployment_mapping_frozen();
DO $$ DECLARE constraint_name text; BEGIN
 SELECT conname INTO constraint_name FROM pg_constraint WHERE conrelid='runtime_grants'::regclass AND confrelid='release_scopes'::regclass AND contype='f';
 IF constraint_name IS NOT NULL THEN EXECUTE format('ALTER TABLE runtime_grants DROP CONSTRAINT %I',constraint_name);END IF;
END $$;
ALTER TABLE runtime_grants ADD FOREIGN KEY(organization_id,release_scope_id,release_request_id,dataset_version_id) REFERENCES release_scopes(organization_id,id,release_request_id,dataset_version_id);
CREATE FUNCTION eas_runtime_mapping_binding() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.status='revoked' THEN RETURN NEW;END IF;
 IF NOT EXISTS(
  SELECT 1 FROM release_scopes s JOIN deployments d ON d.organization_id=s.organization_id AND d.release_request_id=s.release_request_id
  JOIN source_mappings m ON m.organization_id=s.organization_id AND m.id=NEW.mapping_id AND m.logical_data_source_id=s.logical_data_source_id AND m.environment='production'
  CROSS JOIN LATERAL jsonb_array_elements(d.mapping_snapshot) b
  WHERE s.organization_id=NEW.organization_id AND s.id=NEW.release_scope_id AND s.dataset_version_id=NEW.dataset_version_id AND d.id=NEW.deployment_id
   AND (s.mapping_id IS NULL OR s.mapping_id=NEW.mapping_id)
   AND b->>'datasetVersionId'=NEW.dataset_version_id::text AND b->'mapping'->>'mappingId'=NEW.mapping_id::text
 ) THEN RAISE EXCEPTION 'runtime mapping has no approved deployment binding' USING ERRCODE='23514';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER runtime_mapping_binding BEFORE INSERT OR UPDATE ON runtime_grants FOR EACH ROW EXECUTE FUNCTION eas_runtime_mapping_binding();
