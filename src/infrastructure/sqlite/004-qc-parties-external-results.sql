CREATE TABLE customers (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  code TEXT NOT NULL CHECK(length(trim(code)) > 0),
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)),
  UNIQUE(company_id,code),
  UNIQUE(id,company_id)
) STRICT;

CREATE TABLE concrete_sources (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  code TEXT NOT NULL CHECK(length(trim(code)) > 0),
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  source_type TEXT NOT NULL CHECK(source_type IN ('internal','external')),
  archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)),
  UNIQUE(company_id,code),
  UNIQUE(id,company_id)
) STRICT;

CREATE TABLE testing_laboratories (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  code TEXT NOT NULL CHECK(length(trim(code)) > 0),
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  lab_type TEXT NOT NULL CHECK(lab_type IN ('internal','external')),
  archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)),
  UNIQUE(company_id,code),
  UNIQUE(id,company_id)
) STRICT;

CREATE TABLE external_result_events (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  sample_id TEXT NOT NULL REFERENCES samples(id),
  testing_laboratory_id TEXT NOT NULL,
  external_event_id TEXT NOT NULL CHECK(length(trim(external_event_id)) > 0),
  strength_mpa REAL CHECK(strength_mpa IS NULL OR (strength_mpa >= 0 AND strength_mpa < 1e308)),
  tested_at TEXT,
  received_at TEXT NOT NULL,
  received_by TEXT NOT NULL CHECK(length(trim(received_by)) > 0),
  notes TEXT NOT NULL DEFAULT '',
  FOREIGN KEY(testing_laboratory_id,company_id) REFERENCES testing_laboratories(id,company_id),
  UNIQUE(company_id,testing_laboratory_id,external_event_id),
  UNIQUE(id,company_id)
) STRICT;

CREATE TABLE external_result_attachments (
  id TEXT PRIMARY KEY NOT NULL,
  external_result_event_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  file_name TEXT NOT NULL CHECK(length(trim(file_name)) > 0),
  media_type TEXT NOT NULL CHECK(length(trim(media_type)) > 0),
  relative_path TEXT NOT NULL CHECK(length(trim(relative_path)) > 0),
  sha256 TEXT NOT NULL CHECK(length(sha256) = 64),
  size_bytes INTEGER NOT NULL CHECK(size_bytes >= 0),
  added_at TEXT NOT NULL,
  added_by TEXT NOT NULL CHECK(length(trim(added_by)) > 0),
  FOREIGN KEY(external_result_event_id,company_id) REFERENCES external_result_events(id,company_id),
  UNIQUE(external_result_event_id,relative_path)
) STRICT;

CREATE INDEX customers_company ON customers(company_id,archived,code);
CREATE INDEX concrete_sources_company ON concrete_sources(company_id,archived,code);
CREATE INDEX testing_labs_company ON testing_laboratories(company_id,archived,code);
CREATE INDEX external_results_sample ON external_result_events(sample_id,company_id);
CREATE INDEX external_attachments_event ON external_result_attachments(external_result_event_id,company_id);
