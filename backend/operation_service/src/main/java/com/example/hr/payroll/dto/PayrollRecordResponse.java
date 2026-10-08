package com.example.hr.payroll.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;

public record PayrollRecordResponse(
        Integer payrollId,
        Integer employeeId,
        String employeeName,
        YearMonth period,
        LocalDate generatedDate,
        BigDecimal baseSalary,
        int totalLateMinutes,
        BigDecimal lateDeduction,
        int unpaidLeaveDays,
        BigDecimal unpaidLeaveDeduction,
        BigDecimal netSalary
) {
}
