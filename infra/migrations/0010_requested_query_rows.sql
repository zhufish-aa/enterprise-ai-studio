-- Result row counts follow the caller's requested limit/page size, without a
-- platform-wide 10,000-row ceiling. Preserve existing data and audit records.
ALTER TABLE query_jobs DROP CONSTRAINT query_jobs_row_count_check;
ALTER TABLE query_jobs ADD CONSTRAINT query_jobs_row_count_check CHECK (row_count >= 0);
