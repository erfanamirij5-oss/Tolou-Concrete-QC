CREATE TABLE project_rule_profile_assignments(
  project_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  assigned_by TEXT NOT NULL,
  FOREIGN KEY(project_id,company_id) REFERENCES projects(id,company_id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,company_id) REFERENCES rule_profiles(id,company_id) ON DELETE RESTRICT
) STRICT;

CREATE TABLE result_rule_evaluations(
  id TEXT PRIMARY KEY,
  sample_id TEXT NOT NULL,
  result_revision INTEGER NOT NULL CHECK(result_revision>=1),
  company_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  profile_code TEXT NOT NULL,
  profile_document_code TEXT NOT NULL,
  profile_document_version TEXT NOT NULL,
  evaluated_at TEXT NOT NULL,
  evaluated_by TEXT NOT NULL,
  overall_status TEXT NOT NULL CHECK(overall_status IN ('pass','fail','not_evaluated')),
  input_json TEXT NOT NULL CHECK(json_valid(input_json)),
  output_json TEXT NOT NULL CHECK(json_valid(output_json)),
  UNIQUE(sample_id,result_revision,profile_id),
  FOREIGN KEY(sample_id,result_revision) REFERENCES result_revisions(sample_id,revision) ON DELETE RESTRICT,
  FOREIGN KEY(project_id,company_id) REFERENCES projects(id,company_id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,company_id) REFERENCES rule_profiles(id,company_id) ON DELETE RESTRICT
) STRICT;

CREATE TABLE result_rule_evaluation_items(
  evaluation_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  rule_version INTEGER NOT NULL,
  rule_type TEXT NOT NULL,
  reference_clause TEXT NOT NULL,
  source_title TEXT NOT NULL,
  source_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pass','fail','not_evaluated')),
  input_json TEXT NOT NULL CHECK(json_valid(input_json)),
  calculation_json TEXT NOT NULL CHECK(json_valid(calculation_json)),
  message TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(evaluation_id,rule_id),
  FOREIGN KEY(evaluation_id) REFERENCES result_rule_evaluations(id) ON DELETE RESTRICT,
  FOREIGN KEY(rule_id,company_id) REFERENCES rule_profile_rules(id,company_id) ON DELETE RESTRICT
) STRICT;

CREATE INDEX idx_project_rule_profile_assignments_profile ON project_rule_profile_assignments(company_id,profile_id);
CREATE INDEX idx_result_rule_evaluations_sample ON result_rule_evaluations(company_id,sample_id,result_revision);

CREATE TRIGGER project_rule_profile_assignment_requires_active_insert
BEFORE INSERT ON project_rule_profile_assignments
WHEN NOT EXISTS(SELECT 1 FROM rule_profiles p WHERE p.id=NEW.profile_id AND p.company_id=NEW.company_id AND p.status='active')
BEGIN
  SELECT RAISE(ABORT,'project rule profile must be active');
END;

CREATE TRIGGER project_rule_profile_assignment_requires_active_update
BEFORE UPDATE ON project_rule_profile_assignments
WHEN NOT EXISTS(SELECT 1 FROM rule_profiles p WHERE p.id=NEW.profile_id AND p.company_id=NEW.company_id AND p.status='active')
BEGIN
  SELECT RAISE(ABORT,'project rule profile must be active');
END;

CREATE TRIGGER result_rule_evaluations_immutable_update BEFORE UPDATE ON result_rule_evaluations BEGIN SELECT RAISE(ABORT,'result rule evaluations are immutable'); END;
CREATE TRIGGER result_rule_evaluations_immutable_delete BEFORE DELETE ON result_rule_evaluations BEGIN SELECT RAISE(ABORT,'result rule evaluations are immutable'); END;
CREATE TRIGGER result_rule_evaluation_items_immutable_update BEFORE UPDATE ON result_rule_evaluation_items BEGIN SELECT RAISE(ABORT,'result rule evaluation items are immutable'); END;
CREATE TRIGGER result_rule_evaluation_items_immutable_delete BEFORE DELETE ON result_rule_evaluation_items BEGIN SELECT RAISE(ABORT,'result rule evaluation items are immutable'); END;
