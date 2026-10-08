package com.example.hr.payroll.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record PayrollProfileRequest(
        @NotNull(message = "Base salary is required")
        @DecimalMin(value = "0.0", inclusive = true, message = "Base salary must be positive")
        BigDecimal baseSalary,

        @NotNull(message = "Daily rate is required")
        @DecimalMin(value = "0.0", inclusive = true, message = "Daily rate must be positive")
        BigDecimal dailyRate,

        @NotNull(message = "Late penalty per minute is required")
        @DecimalMin(value = "0.0", inclusive = true, message = "Late penalty must be positive")
        BigDecimal latePenaltyPerMinute
) {
}
