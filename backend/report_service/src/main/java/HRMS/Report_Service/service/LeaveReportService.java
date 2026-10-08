package HRMS.Report_Service.service;

import HRMS.Report_Service.dto.response.LeaveReportResponse;

import java.time.LocalDate;
import java.util.List;

public interface LeaveReportService {

    List<LeaveReportResponse> getAllLeaves();

    LeaveReportResponse getLeaveById(Integer id);

    List<LeaveReportResponse> getLeavesByEmployee(Integer employeeId);

    List<LeaveReportResponse> getLeavesByStatus(String status);

    List<LeaveReportResponse> getLeavesByType(String leaveType);

    List<LeaveReportResponse> getLeavesByDateRange(
            LocalDate startDate,
            LocalDate endDate
    );
}
