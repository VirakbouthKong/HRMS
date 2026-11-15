package com.example.hr.attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface AttendanceRequestRepository extends JpaRepository<AttendanceRequest,Integer> {
    List<AttendanceRequest> findAllByOrderByRequestedAtDesc();
    List<AttendanceRequest> findByEmployeeEmployeeIdOrderByRequestedAtDesc(Integer employeeId);
    boolean existsByAttendanceAttendanceIdAndStatus(Integer attendanceId,String status);
}
