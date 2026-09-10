CREATE TABLE fresh_concrete_measurement_revisions (
  series_id TEXT NOT NULL REFERENCES sampling_series(id),
  revision INTEGER NOT NULL CHECK(revision > 0),
  slump_mm REAL CHECK(slump_mm IS NULL OR (slump_mm >= 0 AND slump_mm < 1000)),
  concrete_temperature_c REAL CHECK(concrete_temperature_c IS NULL OR (concrete_temperature_c > -50 AND concrete_temperature_c < 100)),
  measured_at TEXT NOT NULL,
  reason TEXT,
  entered_by TEXT NOT NULL CHECK(length(trim(entered_by)) > 0),
  entered_at TEXT NOT NULL,
  CHECK(slump_mm IS NOT NULL OR concrete_temperature_c IS NOT NULL),
  CHECK((revision = 1) OR (reason IS NOT NULL AND length(trim(reason)) > 0)),
  PRIMARY KEY(series_id, revision)
) STRICT;

CREATE TRIGGER fresh_concrete_revision_sequence BEFORE INSERT ON fresh_concrete_measurement_revisions
WHEN NEW.revision != COALESCE((SELECT MAX(revision) + 1 FROM fresh_concrete_measurement_revisions WHERE series_id = NEW.series_id), 1)
BEGIN SELECT RAISE(ABORT,'invalid fresh concrete measurement revision sequence'); END;

CREATE TRIGGER preserve_fresh_concrete_update BEFORE UPDATE ON fresh_concrete_measurement_revisions
BEGIN SELECT RAISE(ABORT,'fresh concrete measurement revisions are immutable'); END;

CREATE TRIGGER preserve_fresh_concrete_delete BEFORE DELETE ON fresh_concrete_measurement_revisions
BEGIN SELECT RAISE(ABORT,'fresh concrete measurement revisions are immutable'); END;

CREATE VIEW current_fresh_concrete_measurements AS
SELECT m.* FROM fresh_concrete_measurement_revisions m
WHERE revision = (SELECT MAX(revision) FROM fresh_concrete_measurement_revisions WHERE series_id = m.series_id);

CREATE INDEX fresh_concrete_measured_at ON fresh_concrete_measurement_revisions(measured_at);
