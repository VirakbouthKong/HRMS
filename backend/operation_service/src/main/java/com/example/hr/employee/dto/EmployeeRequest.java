package com.example.hr.employee.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record EmployeeRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotNull LocalDate dateOfBirth,
        @NotBlank @Email String email,
        LocalDate contractEndDate,
        @NotNull Integer departmentId,
        /** Must be a job of departmentId (GET /api/jobs?departmentId=...). */
        @NotNull Integer jobId,
        /** Optional, saved in job history when the job changes (e.g. "Promotion"). */
        @Size(max = 255) String jobChangeRemark
) {
}
