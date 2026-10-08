package com.example.hr.department.exception;

public class DepartmentNotFoundException extends RuntimeException {

    public DepartmentNotFoundException(Integer departmentId) {
        super("Department not found: " + departmentId);
    }
}
