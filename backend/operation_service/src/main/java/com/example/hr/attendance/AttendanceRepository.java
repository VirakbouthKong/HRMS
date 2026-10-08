package com.example.hr.attendance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Integer> {

    Optional<Attendance> findByEmployeeEmployeeIdAndAttendanceDate(Integer employeeId, LocalDate attendanceDate);

    List<Attendance> findByAttendanceDate(LocalDate attendanceDate);
    
    List<Attendance> findByEmployeeEmployeeIdAndAttendanceDateBetween(Integer employeeId, LocalDate startDate, LocalDate endDate);
}
