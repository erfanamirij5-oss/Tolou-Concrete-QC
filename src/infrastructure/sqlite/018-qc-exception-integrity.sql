CREATE TRIGGER qc_exception_project_company_guard BEFORE INSERT ON qc_exception_events
WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM projects p WHERE p.id=NEW.project_id AND p.company_id=NEW.company_id
)
BEGIN SELECT RAISE(ABORT,'exception project company mismatch'); END;

CREATE TRIGGER qc_exception_series_company_guard BEFORE INSERT ON qc_exception_events
WHEN NEW.series_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM sampling_series ss WHERE ss.id=NEW.series_id AND ss.company_id=NEW.company_id
)
BEGIN SELECT RAISE(ABORT,'exception series company mismatch'); END;

CREATE TRIGGER qc_exception_sample_company_guard BEFORE INSERT ON qc_exception_events
WHEN NEW.sample_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM samples s JOIN sampling_series ss ON ss.id=s.series_id
  WHERE s.id=NEW.sample_id AND ss.company_id=NEW.company_id
)
BEGIN SELECT RAISE(ABORT,'exception sample company mismatch'); END;

CREATE TRIGGER qc_exception_context_guard BEFORE INSERT ON qc_exception_events
WHEN NEW.sample_id IS NOT NULL AND (
  (NEW.series_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM samples s WHERE s.id=NEW.sample_id AND s.series_id=NEW.series_id
  )) OR
  (NEW.project_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM samples s JOIN sampling_series ss ON ss.id=s.series_id
    WHERE s.id=NEW.sample_id AND ss.project_id=NEW.project_id AND ss.company_id=NEW.company_id
  ))
)
BEGIN SELECT RAISE(ABORT,'exception context mismatch'); END;
