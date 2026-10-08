package HRMS.Report_Service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.*;

@Getter
@Setter
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
    private Integer otHours;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @Column(name = "status", length = 20)
    private String status;

}
