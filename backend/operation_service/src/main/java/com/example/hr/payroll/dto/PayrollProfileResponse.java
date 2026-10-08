package com.example.hr.payroll.dto;

import java.math.BigDecimal;

public record PayrollProfileResponse(
        Integer profileId,
        Integer employeeId,
        String employeeName,
        BigDecimal baseSalary,
        BigDecimal dailyRate,
        BigDecimal latePenaltyPerMinute
) {
}
