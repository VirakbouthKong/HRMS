package com.example.hr.employee.dto;

import com.example.hr.employee.EmployeeStatus;
import jakarta.validation.constraints.NotNull;

public record StatusChangeRequest(
        @NotNull EmployeeStatus status
) {
}
