package com.example.hr.attendance.dto;

import com.example.hr.attendance.AttendanceStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record  AttendanceResponse(
        Integer attendanceId,
        Integer employeeId,
        String employeeName,
        LocalDate attendanceDate,
        LocalDateTime checkIn,
        LocalDateTime checkOut,
        Integer lateMinutes,
        AttendanceStatus status
) {
}
