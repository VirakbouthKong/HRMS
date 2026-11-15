package com.example.hr.attendance;

import com.example.hr.employee.Employee;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tbl_attendance_request")
public class AttendanceRequest {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) @Column(name="correction_id")
    Integer correctionId;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="attendance_id",nullable=false)
    Attendance attendance;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="employee_id",nullable=false)
    Employee employee;
    LocalDateTime requestedCheckIn;
    LocalDateTime requestedCheckOut;
    LocalDateTime originalCheckIn;
    LocalDateTime originalCheckOut;
    String reason;
    String status = "PENDING";
    LocalDateTime requestedAt;
    Integer reviewedBy;
    String reviewedByName;
    LocalDateTime reviewedAt;
    @Version long version;
    protected AttendanceRequest() {}
}
