package com.example.hr.payroll.dto;

import jakarta.validation.constraints.NotNull;
import java.time.YearMonth;

public record GeneratePayrollRequest(
        @NotNull(message = "Period (e.g., 2024-10) is required")
        YearMonth period
) {
}
