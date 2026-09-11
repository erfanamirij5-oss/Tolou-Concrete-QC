ALTER TABLE rule_profiles ADD COLUMN retired_at TEXT;
ALTER TABLE rule_profiles ADD COLUMN retired_by TEXT;

DROP TRIGGER rule_profiles_active_immutable_update;
DROP TRIGGER rule_profiles_active_immutable_delete;
DROP TRIGGER rule_profile_rules_active_profile_immutable_update;
DROP TRIGGER rule_profile_rules_active_profile_immutable_delete;

CREATE TRIGGER rule_profiles_locked_update
BEFORE UPDATE ON rule_profiles
WHEN
  OLD.status='retired'
  OR (
    OLD.status='active'
    AND NOT (
      NEW.status='retired'
      AND NEW.id IS OLD.id
      AND NEW.company_id IS OLD.company_id
      AND NEW.code IS OLD.code
      AND NEW.title IS OLD.title
      AND NEW.authority IS OLD.authority
      AND NEW.document_code IS OLD.document_code
      AND NEW.document_version IS OLD.document_version
      AND NEW.effective_date IS OLD.effective_date
      AND NEW.scope IS OLD.scope
      AND NEW.notes IS OLD.notes
      AND NEW.created_at IS OLD.created_at
      AND NEW.created_by IS OLD.created_by
      AND NEW.activated_at IS OLD.activated_at
      AND NEW.activated_by IS OLD.activated_by
      AND NEW.retired_at IS NOT NULL
      AND length(trim(NEW.retired_at))>0
      AND NEW.retired_by IS NOT NULL
      AND length(trim(NEW.retired_by))>0
    )
  )
BEGIN
  SELECT RAISE(ABORT,'locked rule profile is immutable');
END;

CREATE TRIGGER rule_profiles_locked_delete
BEFORE DELETE ON rule_profiles
WHEN OLD.status IN ('active','retired')
BEGIN
  SELECT RAISE(ABORT,'locked rule profile is immutable');
END;

CREATE TRIGGER rule_profile_rules_locked_profile_immutable_update
BEFORE UPDATE ON rule_profile_rules
WHEN EXISTS(SELECT 1 FROM rule_profiles p WHERE p.id=OLD.profile_id AND p.status IN ('active','retired'))
BEGIN
  SELECT RAISE(ABORT,'rules of locked profile are immutable');
END;

CREATE TRIGGER rule_profile_rules_locked_profile_immutable_delete
BEFORE DELETE ON rule_profile_rules
WHEN EXISTS(SELECT 1 FROM rule_profiles p WHERE p.id=OLD.profile_id AND p.status IN ('active','retired'))
BEGIN
  SELECT RAISE(ABORT,'rules of locked profile are immutable');
END;
