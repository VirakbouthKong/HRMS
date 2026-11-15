package com.example.hr.attendance;

import org.springframework.data.jpa.repository.JpaRepository;

/** Audit rows are written when HR approves an attendance request (see AttendanceService.correctAttendance). */
public interface AttendanceCorrectionAuditRepository extends JpaRepository<AttendanceCorrectionAudit, Integer> {
}
