CREATE TABLE pour_qc_contexts_v8_stage (
  pour_id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  customer_id TEXT,
  concrete_source_id TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
) STRICT;

INSERT INTO pour_qc_contexts_v8_stage(pour_id,company_id,project_id,customer_id,concrete_source_id,created_at,created_by)
SELECT pour_id,company_id,project_id,customer_id,concrete_source_id,created_at,created_by
FROM pour_qc_contexts;

DROP TABLE pour_qc_contexts;

CREATE TABLE concrete_sources_v8 (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  code TEXT NOT NULL CHECK(length(trim(code)) > 0),
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  source_type TEXT NOT NULL CHECK(source_type IN ('internal','external','unspecified')),
  archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)),
  UNIQUE(company_id,code),
  UNIQUE(id,company_id)
) STRICT;

INSERT INTO concrete_sources_v8(id,company_id,code,name,source_type,archived)
SELECT id,company_id,code,name,source_type,archived
FROM concrete_sources;

DROP TABLE concrete_sources;
ALTER TABLE concrete_sources_v8 RENAME TO concrete_sources;

CREATE INDEX concrete_sources_company ON concrete_sources(company_id,archived,code);

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

INSERT INTO pour_qc_contexts(pour_id,company_id,project_id,customer_id,concrete_source_id,created_at,created_by)
SELECT pour_id,company_id,project_id,customer_id,concrete_source_id,created_at,created_by
FROM pour_qc_contexts_v8_stage;

DROP TABLE pour_qc_contexts_v8_stage;

CREATE TRIGGER preserve_pour_qc_context_update BEFORE UPDATE ON pour_qc_contexts
BEGIN SELECT RAISE(ABORT,'pour QC context is immutable'); END;

CREATE TRIGGER preserve_pour_qc_context_delete BEFORE DELETE ON pour_qc_contexts
BEGIN SELECT RAISE(ABORT,'pour QC context is immutable'); END;

CREATE INDEX pour_qc_context_customer ON pour_qc_contexts(company_id,customer_id,project_id);
CREATE INDEX pour_qc_context_source ON pour_qc_contexts(company_id,concrete_source_id,project_id);
