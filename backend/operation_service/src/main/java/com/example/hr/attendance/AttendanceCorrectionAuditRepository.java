package com.example.hr.attendance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttendanceCorrectionAuditRepository extends JpaRepository<AttendanceCorrectionAudit, Integer> {

    List<AttendanceCorrectionAudit> findByAttendanceAttendanceIdOrderByCorrectedAtDesc(Integer attendanceId);
}
