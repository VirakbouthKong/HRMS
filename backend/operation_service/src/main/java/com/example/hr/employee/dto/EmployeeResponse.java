package com.example.hr.employee.dto;

import com.example.hr.employee.EmployeeStatus;

import java.time.LocalDate;

public record EmployeeResponse(
        Integer employeeId,
        String firstName,
        String lastName,
        LocalDate dateOfBirth,
        String email,
        LocalDate contractEndDate,
        EmployeeStatus status,
        Integer departmentId,
        String departmentName,
        String jobTitle,
        String phoneNumber,
        String address,
        String emergencyContactName,
        String emergencyContactPhone,
        String emergencyContactRelation
) {
}
