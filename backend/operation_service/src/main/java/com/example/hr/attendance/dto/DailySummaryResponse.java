package com.example.hr.attendance.dto;

import java.time.LocalDate;

public record DailySummaryResponse(LocalDate date, long presentCount, long lateCount, long absentCount) {
}
