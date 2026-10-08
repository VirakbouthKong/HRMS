package HRMS.Report_Service.repository;

import HRMS.Report_Service.entity.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface LeaveRepository extends JpaRepository<LeaveRequest, Integer> {

    List<LeaveRequest> findByEmployee_EmployeeId(Integer employeeId);

    List<LeaveRequest> findByStatus(String status);

    List<LeaveRequest> findByLeaveType(String leaveType);

    List<LeaveRequest> findByStartDateBetween(
            LocalDate startDate,
            LocalDate endDate
    );

}
