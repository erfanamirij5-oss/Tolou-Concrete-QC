DROP VIEW current_qc_exceptions;

CREATE VIEW current_qc_exceptions AS
SELECT e.* FROM qc_exception_events e
WHERE e.rowid=(
  SELECT MAX(x.rowid)
  FROM qc_exception_events x
  WHERE x.company_id=e.company_id AND x.exception_key=e.exception_key
);
