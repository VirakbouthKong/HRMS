package com.example.hr.attendance.exception;

public class DuplicateAttendanceException extends RuntimeException {

    public DuplicateAttendanceException(Integer employeeId, String date) {
        super("Attendance already exists for employee " + employeeId + " on " + date);
    }
}
