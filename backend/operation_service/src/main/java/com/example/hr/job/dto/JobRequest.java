package com.example.hr.job.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record JobRequest(
        @NotBlank @Size(max = 100) String jobTitle,
        @Size(max = 255) String description,
        @NotNull Integer departmentId
) {
}
