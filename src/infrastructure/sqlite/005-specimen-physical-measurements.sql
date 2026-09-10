CREATE TABLE specimen_physical_measurement_revisions (
  sample_id TEXT NOT NULL REFERENCES samples(id),
  revision INTEGER NOT NULL CHECK(revision > 0),
  shape TEXT NOT NULL CHECK(shape IN ('cube','cylinder')),
  length_mm REAL,
  width_mm REAL,
  height_mm REAL NOT NULL CHECK(height_mm > 0 AND height_mm < 5000),
  diameter_mm REAL,
  mass_kg REAL NOT NULL CHECK(mass_kg > 0 AND mass_kg < 10000),
  volume_m3 REAL NOT NULL CHECK(volume_m3 > 0 AND volume_m3 < 100),
  density_kg_m3 REAL NOT NULL CHECK(density_kg_m3 > 0 AND density_kg_m3 < 10000),
  reason TEXT,
  entered_by TEXT NOT NULL CHECK(length(trim(entered_by)) > 0),
  entered_at TEXT NOT NULL,
  CHECK(
    (shape='cube' AND length_mm IS NOT NULL AND width_mm IS NOT NULL AND diameter_mm IS NULL AND length_mm > 0 AND width_mm > 0 AND length_mm < 5000 AND width_mm < 5000)
    OR
    (shape='cylinder' AND diameter_mm IS NOT NULL AND length_mm IS NULL AND width_mm IS NULL AND diameter_mm > 0 AND diameter_mm < 5000)
  ),
  CHECK((revision=1 AND reason IS NULL) OR (revision>1 AND reason IS NOT NULL AND length(trim(reason))>0)),
  PRIMARY KEY(sample_id,revision)
) STRICT;

CREATE TRIGGER specimen_physical_revision_sequence BEFORE INSERT ON specimen_physical_measurement_revisions
WHEN NEW.revision != COALESCE((SELECT MAX(revision)+1 FROM specimen_physical_measurement_revisions WHERE sample_id=NEW.sample_id),1)
BEGIN SELECT RAISE(ABORT,'invalid specimen physical revision sequence'); END;

CREATE TRIGGER preserve_specimen_physical_update BEFORE UPDATE ON specimen_physical_measurement_revisions
BEGIN SELECT RAISE(ABORT,'specimen physical measurement revisions are immutable'); END;

CREATE TRIGGER preserve_specimen_physical_delete BEFORE DELETE ON specimen_physical_measurement_revisions
BEGIN SELECT RAISE(ABORT,'specimen physical measurement revisions are immutable'); END;

CREATE VIEW current_specimen_physical_measurements AS
SELECT m.* FROM specimen_physical_measurement_revisions m
WHERE revision=(SELECT MAX(revision) FROM specimen_physical_measurement_revisions WHERE sample_id=m.sample_id);

CREATE INDEX specimen_physical_density ON specimen_physical_measurement_revisions(density_kg_m3);
