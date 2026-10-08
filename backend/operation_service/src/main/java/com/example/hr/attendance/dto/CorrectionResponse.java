package com.example.hr.attendance.dto;

import com.example.hr.attendance.AttendanceStatus;

import java.time.LocalDateTime;

public record CorrectionResponse(
        Integer correctionAuditId,
        Integer attendanceId,
        Integer correctedById,
        String correctedByName,
        String reason,
        LocalDateTime previousCheckIn,
        LocalDateTime previousCheckOut,
        Integer previousLateMinutes,
        AttendanceStatus previousStatus,
        LocalDateTime correctedAt
) {
}
