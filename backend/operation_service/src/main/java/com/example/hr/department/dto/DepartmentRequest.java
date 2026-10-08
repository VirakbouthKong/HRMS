package com.example.hr.department.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DepartmentRequest(
        @NotBlank(message = "Department name is required")
        @Size(max = 100, message = "Department name must be 100 characters or fewer")
        String departmentName,

        @Size(max = 255, message = "Description must be 255 characters or fewer")
        String description
) {
}
