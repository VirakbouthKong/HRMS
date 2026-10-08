package com.example.hr.attendance;

import com.example.hr.employee.Employee;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

// stores audit trail for corrections
@Entity
@Table(name = "tbl_attendance_correction_audit")
public class AttendanceCorrectionAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "correction_audit_id")
    private Integer correctionAuditId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_id", nullable = false)
    private Attendance attendance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "corrected_by", nullable = false)
    private Employee correctedBy;

    @Column(name = "correction_reason", nullable = false)
    private String correctionReason;

    @Column(name = "previous_check_in")
    private LocalDateTime previousCheckIn;

    @Column(name = "previous_check_out")
    private LocalDateTime previousCheckOut;

    @Column(name = "previous_late_minutes")
    private Integer previousLateMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status")
    private AttendanceStatus previousStatus;

    @Column(name = "corrected_at", nullable = false)
    private LocalDateTime correctedAt;

    protected AttendanceCorrectionAudit() {
    }

    // snapshot before correction
    public static AttendanceCorrectionAudit capture(Attendance attendance, Employee correctedBy,
                                                     String reason, LocalDateTime prevCheckIn,
                                                     LocalDateTime prevCheckOut, Integer prevLateMinutes,
                                                     AttendanceStatus prevStatus) {
        AttendanceCorrectionAudit audit = new AttendanceCorrectionAudit();
        audit.attendance = attendance;
        audit.correctedBy = correctedBy;
        audit.correctionReason = reason;
        audit.previousCheckIn = prevCheckIn;
        audit.previousCheckOut = prevCheckOut;
        audit.previousLateMinutes = prevLateMinutes;
        audit.previousStatus = prevStatus;
        audit.correctedAt = LocalDateTime.now();
        return audit;
    }


    public Integer getCorrectionAuditId() {
        return correctionAuditId;
    }

    public Attendance getAttendance() {
        return attendance;
    }

    public Employee getCorrectedBy() {
        return correctedBy;
    }

    public String getCorrectionReason() {
        return correctionReason;
    }

    public LocalDateTime getPreviousCheckIn() {
        return previousCheckIn;
    }

    public LocalDateTime getPreviousCheckOut() {
        return previousCheckOut;
    }

    public Integer getPreviousLateMinutes() {
        return previousLateMinutes;
    }

    public AttendanceStatus getPreviousStatus() {
        return previousStatus;
    }

    public LocalDateTime getCorrectedAt() {
        return correctedAt;
    }
}
