package com.example.hr.job.dto;

public record JobResponse(
        Integer jobId,
        String jobTitle,
        String description,
        Integer departmentId,
        String departmentName
) {
}
