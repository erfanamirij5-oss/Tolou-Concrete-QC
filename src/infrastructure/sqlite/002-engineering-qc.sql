CREATE TABLE mix_designs (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  code TEXT NOT NULL CHECK(length(trim(code)) > 0),
  title TEXT NOT NULL CHECK(length(trim(title)) > 0),
  archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)),
  UNIQUE(company_id,code),
  UNIQUE(id,company_id)
) STRICT;

CREATE TABLE mix_design_versions (
  id TEXT PRIMARY KEY NOT NULL,
  mix_design_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision > 0),
  target_strength_mpa REAL CHECK(target_strength_mpa IS NULL OR (target_strength_mpa >= 0 AND target_strength_mpa < 1e308)),
  max_water_cement_ratio REAL CHECK(max_water_cement_ratio IS NULL OR (max_water_cement_ratio > 0 AND max_water_cement_ratio < 5)),
  target_slump_mm REAL CHECK(target_slump_mm IS NULL OR (target_slump_mm >= 0 AND target_slump_mm < 1000)),
  nominal_max_aggregate_mm REAL CHECK(nominal_max_aggregate_mm IS NULL OR (nominal_max_aggregate_mm > 0 AND nominal_max_aggregate_mm < 500)),
  cement_kg_m3 REAL CHECK(cement_kg_m3 IS NULL OR (cement_kg_m3 >= 0 AND cement_kg_m3 < 5000)),
  water_kg_m3 REAL CHECK(water_kg_m3 IS NULL OR (water_kg_m3 >= 0 AND water_kg_m3 < 5000)),
  fine_aggregate_kg_m3 REAL CHECK(fine_aggregate_kg_m3 IS NULL OR (fine_aggregate_kg_m3 >= 0 AND fine_aggregate_kg_m3 < 5000)),
  coarse_aggregate_kg_m3 REAL CHECK(coarse_aggregate_kg_m3 IS NULL OR (coarse_aggregate_kg_m3 >= 0 AND coarse_aggregate_kg_m3 < 5000)),
  scm_kg_m3 REAL CHECK(scm_kg_m3 IS NULL OR (scm_kg_m3 >= 0 AND scm_kg_m3 < 5000)),
  admixture_kg_m3 REAL CHECK(admixture_kg_m3 IS NULL OR (admixture_kg_m3 >= 0 AND admixture_kg_m3 < 5000)),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK(length(trim(created_by)) > 0),
  FOREIGN KEY(mix_design_id,company_id) REFERENCES mix_designs(id,company_id),
  UNIQUE(mix_design_id,revision),
  UNIQUE(id,company_id)
) STRICT;

CREATE TABLE pour_qc_specifications (
  pour_id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  mix_design_version_id TEXT,
  element_name TEXT NOT NULL DEFAULT '',
  concrete_class TEXT NOT NULL DEFAULT '',
  specified_strength_mpa REAL CHECK(specified_strength_mpa IS NULL OR (specified_strength_mpa >= 0 AND specified_strength_mpa < 1e308)),
  target_slump_mm REAL CHECK(target_slump_mm IS NULL OR (target_slump_mm >= 0 AND target_slump_mm < 1000)),
  nominal_max_aggregate_mm REAL CHECK(nominal_max_aggregate_mm IS NULL OR (nominal_max_aggregate_mm > 0 AND nominal_max_aggregate_mm < 500)),
  exposure_class TEXT NOT NULL DEFAULT '',
  placement_method TEXT NOT NULL DEFAULT '',
  planned_volume_m3 REAL CHECK(planned_volume_m3 IS NULL OR (planned_volume_m3 >= 0 AND planned_volume_m3 < 1000000)),
  notes TEXT NOT NULL DEFAULT '',
  FOREIGN KEY(pour_id,project_id,company_id) REFERENCES pours(id,project_id,company_id),
  FOREIGN KEY(mix_design_version_id,company_id) REFERENCES mix_design_versions(id,company_id)
) STRICT;

CREATE TRIGGER preserve_referenced_mix_version_update BEFORE UPDATE ON mix_design_versions
WHEN EXISTS(SELECT 1 FROM pour_qc_specifications WHERE mix_design_version_id=OLD.id)
BEGIN SELECT RAISE(ABORT,'referenced mix design versions are immutable'); END;

CREATE TRIGGER preserve_referenced_mix_version_delete BEFORE DELETE ON mix_design_versions
WHEN EXISTS(SELECT 1 FROM pour_qc_specifications WHERE mix_design_version_id=OLD.id)
BEGIN SELECT RAISE(ABORT,'referenced mix design versions are immutable'); END;

CREATE INDEX mix_designs_company ON mix_designs(company_id,archived,code);
CREATE INDEX mix_versions_design ON mix_design_versions(mix_design_id,revision);
CREATE INDEX pour_qc_mix_version ON pour_qc_specifications(mix_design_version_id,company_id);
