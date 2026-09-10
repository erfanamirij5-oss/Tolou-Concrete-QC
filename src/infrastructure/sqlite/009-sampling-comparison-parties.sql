CREATE TABLE sampling_comparison_parties (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  series_id TEXT NOT NULL REFERENCES sampling_series(id) ON DELETE CASCADE,
  party_type TEXT NOT NULL CHECK(party_type IN ('laboratory','person','consultant','client','supervisor','other')),
  party_name TEXT NOT NULL,
  laboratory_name TEXT,
  sampler_name TEXT,
  external_reference TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
) STRICT;

CREATE INDEX idx_sampling_comparison_parties_series
  ON sampling_comparison_parties(company_id, series_id);
