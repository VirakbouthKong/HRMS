package com.example.hr.employee.dto;

import java.time.LocalDate;

/** One period of an employee's job history; endDate is null for the current job. */
public record JobHistoryResponse(
        String jobTitle,
        String departmentName,
        LocalDate startedDate,
        LocalDate endDate,
        String remark
) {
}
