package com.example.hr.employee.exception;

public class EmployeeNotFoundException extends RuntimeException {

    public EmployeeNotFoundException(Integer employeeId) {
        super("Employee not found: " + employeeId);
    }
}
