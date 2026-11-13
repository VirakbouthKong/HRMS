-- Profile photos, one row per account. Deleting the account deletes its photo.
CREATE TABLE tbl_account_photo (
    account_id   INTEGER      PRIMARY KEY REFERENCES tbl_account (account_id) ON DELETE CASCADE,
    content_type VARCHAR(20)  NOT NULL,
    data         BYTEA        NOT NULL,
    updated_date TIMESTAMP    NOT NULL
);

-- One employee has at most one account. Accounts without an employee (NULL) are still allowed.
-- Fails if two accounts already share an employee: remove the duplicate first.
CREATE UNIQUE INDEX uq_account_employee_id ON tbl_account (employee_id) WHERE employee_id IS NOT NULL;
