package com.example.hr.department.exception;

public class DepartmentHasEmployeesException extends RuntimeException {

    public DepartmentHasEmployeesException(Integer departmentId) {
        super("Department has employees: " + departmentId);
    }
}
