CREATE TABLE witness_schedule_revisions (
  sample_id TEXT NOT NULL REFERENCES samples(id),
  revision INTEGER NOT NULL CHECK(revision > 0),
  due_at TEXT NOT NULL,
  reason TEXT NOT NULL CHECK(length(trim(reason)) > 0),
  entered_by TEXT NOT NULL CHECK(length(trim(entered_by)) > 0),
  entered_at TEXT NOT NULL,
  PRIMARY KEY(sample_id,revision)
) STRICT;

CREATE TRIGGER witness_schedule_revision_sequence BEFORE INSERT ON witness_schedule_revisions
WHEN NEW.revision != COALESCE((SELECT MAX(revision)+1 FROM witness_schedule_revisions WHERE sample_id=NEW.sample_id),1)
BEGIN SELECT RAISE(ABORT,'invalid witness schedule revision sequence'); END;

CREATE TRIGGER preserve_witness_schedule_update BEFORE UPDATE ON witness_schedule_revisions
BEGIN SELECT RAISE(ABORT,'witness schedule revisions are immutable'); END;

CREATE TRIGGER preserve_witness_schedule_delete BEFORE DELETE ON witness_schedule_revisions
BEGIN SELECT RAISE(ABORT,'witness schedule revisions are immutable'); END;

CREATE VIEW current_witness_schedules AS
SELECT w.* FROM witness_schedule_revisions w
WHERE revision=(SELECT MAX(revision) FROM witness_schedule_revisions WHERE sample_id=w.sample_id);

CREATE INDEX witness_schedule_due ON witness_schedule_revisions(due_at);
