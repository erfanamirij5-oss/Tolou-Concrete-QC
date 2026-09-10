CREATE TABLE company_profiles (
  company_id TEXT PRIMARY KEY NOT NULL REFERENCES companies(id),
  qc_manager_name TEXT NOT NULL DEFAULT '',
  managing_director_name TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
) STRICT;
