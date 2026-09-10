CREATE TABLE sampling_mix_snapshots (
  series_id TEXT PRIMARY KEY NOT NULL REFERENCES sampling_series(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id),
  source_mode TEXT NOT NULL CHECK(source_mode IN ('library','manual')),
  mix_design_version_id TEXT REFERENCES mix_design_versions(id),
  mix_code TEXT,
  mix_revision INTEGER,
  characteristic_strength_mpa REAL,
  target_strength_mpa REAL,
  declared_water_cement_ratio REAL,
  cement_kg_m3 REAL,
  water_kg_m3 REAL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  CHECK(mix_revision IS NULL OR mix_revision >= 0),
  CHECK(characteristic_strength_mpa IS NULL OR characteristic_strength_mpa >= 0),
  CHECK(target_strength_mpa IS NULL OR target_strength_mpa >= 0),
  CHECK(declared_water_cement_ratio IS NULL OR (declared_water_cement_ratio > 0 AND declared_water_cement_ratio < 2)),
  CHECK(cement_kg_m3 IS NULL OR cement_kg_m3 >= 0),
  CHECK(water_kg_m3 IS NULL OR water_kg_m3 >= 0)
) STRICT;

CREATE TABLE sampling_mix_snapshot_components (
  id TEXT PRIMARY KEY NOT NULL,
  series_id TEXT NOT NULL REFERENCES sampling_mix_snapshots(series_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id),
  category TEXT NOT NULL CHECK(category IN ('fine_aggregate','coarse_aggregate','scm','powder','chemical_admixture','air_entrainer','fiber','other')),
  material_name TEXT NOT NULL,
  quantity_kg_m3 REAL NOT NULL CHECK(quantity_kg_m3 >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
) STRICT;

CREATE INDEX idx_sampling_mix_snapshot_components_series
  ON sampling_mix_snapshot_components(series_id, sort_order, id);
