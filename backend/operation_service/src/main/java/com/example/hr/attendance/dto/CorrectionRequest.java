package com.example.hr.attendance.dto;

import com.example.hr.attendance.AttendanceStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record CorrectionRequest(
        @NotNull LocalDateTime checkIn,
        LocalDateTime checkOut,
        @NotNull AttendanceStatus status,
        @NotNull @Min(0) Integer lateMinutes,
        @NotBlank @Size(max = 500) String reason
) {
}
