package HRMS.Report_Service.repository;

import HRMS.Report_Service.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface AttendanceRepository extends JpaRepository<Attendance,Integer> {

    List<Attendance> findByEmployee_EmployeeId(Integer employeeId);

    List<Attendance> findByStatus(String status);

    List<Attendance> findByAttendanceDate(LocalDate attendanceDate);

    List<Attendance> findByAttendanceDateBetween(
            LocalDate startDate,
            LocalDate endDate
    );

}
