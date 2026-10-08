package com.example.hr.department.exception;

public class DuplicateDepartmentException extends RuntimeException {

    public DuplicateDepartmentException(String departmentName) {
        super("Department already exists: " + departmentName);
    }
}
