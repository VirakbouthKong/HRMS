package com.example.hr.employee.exception;

/** A /me endpoint was called by an account that has no (existing) employee record, e.g. sysadmin. */
public class EmployeeNotLinkedException extends RuntimeException {

    public EmployeeNotLinkedException() {
        super("No employee record for this account.");
    }
}
