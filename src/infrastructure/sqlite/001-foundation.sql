CREATE TABLE companies (
 id TEXT PRIMARY KEY NOT NULL,
 name TEXT NOT NULL CHECK(length(trim(name)) > 0)
) STRICT;
CREATE TABLE projects (
 id TEXT PRIMARY KEY NOT NULL,
 company_id TEXT NOT NULL REFERENCES companies(id),
 name TEXT NOT NULL CHECK(length(trim(name)) > 0),
 customer_name TEXT NOT NULL CHECK(length(trim(customer_name)) > 0),
 address TEXT NOT NULL DEFAULT '',
 archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)),
 UNIQUE(id, company_id)
) STRICT;
CREATE TABLE pours (
 id TEXT PRIMARY KEY NOT NULL,
 company_id TEXT NOT NULL,
 project_id TEXT NOT NULL,
 occurred_at TEXT NOT NULL,
 FOREIGN KEY(project_id,company_id) REFERENCES projects(id,company_id),
 UNIQUE(id,project_id,company_id)
) STRICT;
CREATE TABLE sampling_series (
 id TEXT PRIMARY KEY NOT NULL,
 company_id TEXT NOT NULL REFERENCES companies(id),
 kind TEXT NOT NULL CHECK(kind IN ('customer','internal')),
 project_id TEXT,
 pour_id TEXT,
 title TEXT,
 purpose TEXT,
 sampled_at TEXT NOT NULL,
 sampler_name TEXT NOT NULL CHECK(length(trim(sampler_name)) > 0),
 entered_by TEXT NOT NULL CHECK(length(trim(entered_by)) > 0),
 CHECK((kind='customer' AND project_id IS NOT NULL AND pour_id IS NOT NULL)
 OR (kind='internal' AND project_id IS NULL AND pour_id IS NULL AND
 title IS NOT NULL AND length(trim(title))>0 AND purpose IS NOT NULL AND length(trim(purpose))>0)),
 FOREIGN KEY(pour_id,project_id,company_id) REFERENCES pours(id,project_id,company_id)
) STRICT;
CREATE TABLE samples (
 id TEXT PRIMARY KEY NOT NULL,
 series_id TEXT NOT NULL REFERENCES sampling_series(id),
 age_days INTEGER CHECK(age_days > 0),
 due_at TEXT,
 CHECK((age_days IS NULL AND due_at IS NULL) OR (age_days IS NOT NULL AND due_at IS NOT NULL))
) STRICT;
CREATE TABLE result_revisions (
 sample_id TEXT NOT NULL REFERENCES samples(id),
 revision INTEGER NOT NULL CHECK(revision > 0),
 strength_mpa REAL CHECK(strength_mpa >= 0 AND strength_mpa < 1e308),
 state TEXT NOT NULL CHECK(state IN ('draft','approved','void')),
 tested_at TEXT NOT NULL,
 tested_by TEXT NOT NULL CHECK(length(trim(tested_by))>0),
 entered_by TEXT NOT NULL CHECK(length(trim(entered_by))>0),
 entered_at TEXT NOT NULL,
 approved_by TEXT,
 reason TEXT,
 CHECK(state='void' OR strength_mpa IS NOT NULL),
 CHECK(state!='approved' OR (approved_by IS NOT NULL AND length(trim(approved_by))>0)),
 CHECK((revision=1 AND state!='void') OR (reason IS NOT NULL AND length(trim(reason))>0)),
 PRIMARY KEY(sample_id,revision)
) STRICT;
CREATE TRIGGER result_revision_sequence BEFORE INSERT ON result_revisions
WHEN NEW.revision != COALESCE((SELECT MAX(revision)+1 FROM result_revisions WHERE sample_id=NEW.sample_id),1)
BEGIN SELECT RAISE(ABORT,'invalid revision sequence'); END;
CREATE TRIGGER preserve_result_update BEFORE UPDATE ON result_revisions
BEGIN SELECT RAISE(ABORT,'result revisions are immutable'); END;
CREATE TRIGGER preserve_result_delete BEFORE DELETE ON result_revisions
BEGIN SELECT RAISE(ABORT,'result revisions are immutable'); END;
CREATE INDEX projects_company ON projects(company_id);
CREATE INDEX pours_project ON pours(project_id,company_id);
CREATE INDEX series_pour ON sampling_series(pour_id,project_id,company_id);
CREATE INDEX samples_due ON samples(due_at);
CREATE INDEX samples_series ON samples(series_id);
CREATE VIEW current_results AS SELECT r.* FROM result_revisions r
WHERE revision=(SELECT MAX(revision) FROM result_revisions WHERE sample_id=r.sample_id);
