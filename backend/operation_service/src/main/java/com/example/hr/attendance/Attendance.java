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

import java.time.LocalDate;
import java.time.LocalDateTime;

// Attendance record for a specific date
@Entity
@Table(name = "tbl_attendance")
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attendance_id")
    private Integer attendanceId;

    @Column(name = "attendance_date")
    private LocalDate attendanceDate;

    @Column(name = "check_in")
    private LocalDateTime checkIn;

    @Column(name = "check_out")
    private LocalDateTime checkOut;

    @Column(name = "late_minutes")
    private Integer lateMinutes;

    @Column(name = "ot_hours")
    private Integer overtimeHours;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AttendanceStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    protected Attendance() {
    }

    // Creates check-in record
    public static Attendance checkIn(Employee employee, LocalDate date, LocalDateTime checkInTime,
                                     AttendanceStatus status, int lateMinutes) {
        Attendance attendance = new Attendance();
        attendance.employee = employee;
        attendance.attendanceDate = date;
        attendance.checkIn = checkInTime;
        attendance.status = status;
        attendance.lateMinutes = lateMinutes;
        return attendance;
    }

    // Marks employee as absent (called by cron)
    public static Attendance markAbsent(Employee employee, LocalDate date) {
        Attendance attendance = new Attendance();
        attendance.employee = employee;
        attendance.attendanceDate = date;
        attendance.status = AttendanceStatus.ABSENT;
        attendance.lateMinutes = 0;
        return attendance;
    }


    public Integer getAttendanceId() {
        return attendanceId;
    }

    public LocalDate getAttendanceDate() {
        return attendanceDate;
    }

    public LocalDateTime getCheckIn() {
        return checkIn;
    }

    public LocalDateTime getCheckOut() {
        return checkOut;
    }

    public Integer getLateMinutes() {
        return lateMinutes;
    }

    public Integer getOvertimeHours() {
        return overtimeHours;
    }

    public AttendanceStatus getStatus() {
        return status;
    }

    public Employee getEmployee() {
        return employee;
    }


    public void recordCheckOut(LocalDateTime checkOutTime) {
        this.checkOut = checkOutTime;
    }

    // apply correction & save audit
    public AttendanceCorrectionAudit applyCorrection(Employee correctedBy, String reason,
                                                     LocalDateTime newCheckIn, LocalDateTime newCheckOut,
                                                     AttendanceStatus newStatus, int newLateMinutes) {
        AttendanceCorrectionAudit audit = AttendanceCorrectionAudit.capture(
                this, correctedBy, reason, this.checkIn, this.checkOut, this.lateMinutes, this.status);

        this.checkIn = newCheckIn;
        this.checkOut = newCheckOut;
        this.status = newStatus;
        this.lateMinutes = newLateMinutes;
        return audit;
    }
}
