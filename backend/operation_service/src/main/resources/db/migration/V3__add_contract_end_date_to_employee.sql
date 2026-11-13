-- IF NOT EXISTS: this column was added by hand before Flyway recorded V3; re-running changes nothing.
ALTER TABLE tbl_employee
ADD COLUMN IF NOT EXISTS contract_end_date DATE;
