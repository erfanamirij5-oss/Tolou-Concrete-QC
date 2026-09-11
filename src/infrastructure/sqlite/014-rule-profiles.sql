CREATE TABLE rule_profiles(
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  authority TEXT NOT NULL,
  document_code TEXT NOT NULL,
  document_version TEXT NOT NULL,
  effective_date TEXT,
  scope TEXT NOT NULL DEFAULT 'compressive_strength',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','retired')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  activated_at TEXT,
  activated_by TEXT,
  UNIQUE(company_id,code,document_version),
  UNIQUE(id,company_id),
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE RESTRICT
) STRICT;

CREATE TABLE rule_profile_rules(
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  rule_version INTEGER NOT NULL CHECK(rule_version>=1),
  rule_type TEXT NOT NULL,
  parameters_json TEXT NOT NULL CHECK(json_valid(parameters_json)),
  reference_clause TEXT NOT NULL,
  source_title TEXT NOT NULL,
  source_version TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'draft' CHECK(verification_status IN ('draft','verified')),
  test_case_count INTEGER NOT NULL DEFAULT 0 CHECK(test_case_count>=0),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  UNIQUE(profile_id,rule_key,rule_version),
  FOREIGN KEY(profile_id,company_id) REFERENCES rule_profiles(id,company_id) ON DELETE RESTRICT
) STRICT;

CREATE INDEX idx_rule_profiles_company_status ON rule_profiles(company_id,status,code);
CREATE INDEX idx_rule_profile_rules_profile ON rule_profile_rules(profile_id,enabled,verification_status);

CREATE TRIGGER rule_profiles_active_immutable_update
BEFORE UPDATE ON rule_profiles
WHEN OLD.status='active'
BEGIN
  SELECT RAISE(ABORT,'active rule profile is immutable');
END;

CREATE TRIGGER rule_profiles_active_immutable_delete
BEFORE DELETE ON rule_profiles
WHEN OLD.status='active'
BEGIN
  SELECT RAISE(ABORT,'active rule profile is immutable');
END;

CREATE TRIGGER rule_profile_rules_active_profile_immutable_update
BEFORE UPDATE ON rule_profile_rules
WHEN EXISTS(SELECT 1 FROM rule_profiles p WHERE p.id=OLD.profile_id AND p.status='active')
BEGIN
  SELECT RAISE(ABORT,'rules of active profile are immutable');
END;

CREATE TRIGGER rule_profile_rules_active_profile_immutable_delete
BEFORE DELETE ON rule_profile_rules
WHEN EXISTS(SELECT 1 FROM rule_profiles p WHERE p.id=OLD.profile_id AND p.status='active')
BEGIN
  SELECT RAISE(ABORT,'rules of active profile are immutable');
END;
