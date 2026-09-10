CREATE TABLE comparison_result_revisions (
  result_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision >= 1),
  company_id TEXT NOT NULL REFERENCES companies(id),
  series_id TEXT NOT NULL REFERENCES sampling_series(id) ON DELETE CASCADE,
  comparison_party_id TEXT NOT NULL REFERENCES sampling_comparison_parties(id) ON DELETE CASCADE,
  age_days INTEGER CHECK(age_days IS NULL OR age_days > 0),
  specimen_label TEXT NOT NULL,
  strength_mpa REAL NOT NULL CHECK(strength_mpa >= 0),
  tested_at TEXT NOT NULL,
  tested_by TEXT,
  notes TEXT,
  reason TEXT,
  entered_at TEXT NOT NULL,
  entered_by TEXT NOT NULL,
  PRIMARY KEY(result_id, revision)
) STRICT;

CREATE INDEX idx_comparison_result_series_age
  ON comparison_result_revisions(company_id, series_id, age_days, comparison_party_id);

CREATE VIEW current_comparison_results AS
SELECT r.*
FROM comparison_result_revisions r
JOIN (
  SELECT result_id, MAX(revision) AS revision
  FROM comparison_result_revisions
  GROUP BY result_id
) latest ON latest.result_id=r.result_id AND latest.revision=r.revision;

CREATE TRIGGER comparison_result_revisions_no_update
BEFORE UPDATE ON comparison_result_revisions
BEGIN
  SELECT RAISE(ABORT, 'comparison result revisions are immutable');
END;

CREATE TRIGGER comparison_result_revisions_no_delete
BEFORE DELETE ON comparison_result_revisions
BEGIN
  SELECT RAISE(ABORT, 'comparison result revisions are immutable');
END;
