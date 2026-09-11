CREATE TABLE qc_exception_events (
 id TEXT PRIMARY KEY NOT NULL,
 company_id TEXT NOT NULL REFERENCES companies(id),
 exception_key TEXT NOT NULL CHECK(length(trim(exception_key))>0),
 event_type TEXT NOT NULL CHECK(event_type IN ('opened','acknowledged','resolved','reopened')),
 category TEXT NOT NULL CHECK(category IN ('overdue_test','operational_reference','statistical_signal','workflow')),
 severity TEXT NOT NULL CHECK(severity IN ('info','warning','critical')),
 project_id TEXT,
 series_id TEXT,
 sample_id TEXT,
 title TEXT NOT NULL CHECK(length(trim(title))>0),
 detail TEXT NOT NULL CHECK(length(trim(detail))>0),
 source_type TEXT NOT NULL CHECK(length(trim(source_type))>0),
 source_ref TEXT,
 observed_at TEXT NOT NULL,
 reason TEXT,
 actor TEXT NOT NULL CHECK(length(trim(actor))>0),
 created_at TEXT NOT NULL,
 FOREIGN KEY(project_id,company_id) REFERENCES projects(id,company_id),
 FOREIGN KEY(series_id) REFERENCES sampling_series(id),
 FOREIGN KEY(sample_id) REFERENCES samples(id),
 CHECK(event_type='opened' OR (reason IS NOT NULL AND length(trim(reason))>0)),
 UNIQUE(company_id,exception_key,id)
) STRICT;

CREATE INDEX idx_qc_exception_events_company_key ON qc_exception_events(company_id,exception_key,created_at);
CREATE INDEX idx_qc_exception_events_project ON qc_exception_events(company_id,project_id,created_at);
CREATE INDEX idx_qc_exception_events_sample ON qc_exception_events(sample_id,created_at);

CREATE TRIGGER preserve_qc_exception_event_update BEFORE UPDATE ON qc_exception_events
BEGIN SELECT RAISE(ABORT,'qc exception events are immutable'); END;
CREATE TRIGGER preserve_qc_exception_event_delete BEFORE DELETE ON qc_exception_events
BEGIN SELECT RAISE(ABORT,'qc exception events are immutable'); END;

CREATE VIEW current_qc_exceptions AS
SELECT e.* FROM qc_exception_events e
WHERE e.created_at=(SELECT MAX(x.created_at) FROM qc_exception_events x WHERE x.company_id=e.company_id AND x.exception_key=e.exception_key)
AND e.id=(SELECT MAX(x.id) FROM qc_exception_events x WHERE x.company_id=e.company_id AND x.exception_key=e.exception_key AND x.created_at=e.created_at);
