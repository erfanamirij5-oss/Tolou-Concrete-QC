CREATE TABLE pour_qc_contexts (
  pour_id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  customer_id TEXT,
  concrete_source_id TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK(length(trim(created_by)) > 0),
  FOREIGN KEY(pour_id,project_id,company_id) REFERENCES pours(id,project_id,company_id),
  FOREIGN KEY(customer_id,company_id) REFERENCES customers(id,company_id),
  FOREIGN KEY(concrete_source_id,company_id) REFERENCES concrete_sources(id,company_id),
  CHECK(customer_id IS NOT NULL OR concrete_source_id IS NOT NULL)
) STRICT;

CREATE TRIGGER preserve_pour_qc_context_update BEFORE UPDATE ON pour_qc_contexts
BEGIN SELECT RAISE(ABORT,'pour QC context is immutable'); END;

CREATE TRIGGER preserve_pour_qc_context_delete BEFORE DELETE ON pour_qc_contexts
BEGIN SELECT RAISE(ABORT,'pour QC context is immutable'); END;

CREATE INDEX pour_qc_context_customer ON pour_qc_contexts(company_id,customer_id,project_id);
CREATE INDEX pour_qc_context_source ON pour_qc_contexts(company_id,concrete_source_id,project_id);
