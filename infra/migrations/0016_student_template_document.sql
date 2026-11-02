-- A template revision owns its validated formatting document. Existing revisions remain unchanged.
ALTER TABLE student_center_template_versions ADD COLUMN document jsonb;
ALTER TABLE student_center_template_versions ADD CONSTRAINT student_template_document_object CHECK(document IS NULL OR (jsonb_typeof(document)='object' AND document->>'schemaVersion'='1.0' AND document->>'type'='doc'));
