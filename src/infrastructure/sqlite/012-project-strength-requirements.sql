CREATE TABLE project_strength_requirements (
  project_id TEXT PRIMARY KEY NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id),
  characteristic_strength_mpa REAL NOT NULL CHECK(characteristic_strength_mpa > 0),
  seven_day_reference_ratio REAL NOT NULL DEFAULT 0.60 CHECK(seven_day_reference_ratio > 0 AND seven_day_reference_ratio <= 1),
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
) STRICT;

CREATE INDEX idx_project_strength_requirements_company
  ON project_strength_requirements(company_id, project_id);
