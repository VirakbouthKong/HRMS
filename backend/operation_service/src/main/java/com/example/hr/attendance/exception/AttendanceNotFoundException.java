package com.example.hr.attendance.exception;

public class AttendanceNotFoundException extends RuntimeException {

    public AttendanceNotFoundException(Integer attendanceId) {
        super("Attendance record not found: " + attendanceId);
    }
}
