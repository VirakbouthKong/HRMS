-- Administrators may review leave even when their account has no employee record.
ALTER TABLE tbl_leave ADD COLUMN decided_by_username varchar(100);
