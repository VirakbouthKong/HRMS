package HRMS.Report_Service.service;

import HRMS.Report_Service.dto.response.AttendanceReportResponse;

import java.time.LocalDate;
import java.util.List;

public interface AttendanceReportService {

    List<AttendanceReportResponse> getAllAttendance();

    List<AttendanceReportResponse> getAttendanceByEmployee(Integer employeeId);

    List<AttendanceReportResponse> getAttendanceByStatus(String status);

    List<AttendanceReportResponse> getAttendanceByDate(LocalDate attendanceDate);

    List<AttendanceReportResponse> getAttendanceByDateRange(
            LocalDate startDate,
            LocalDate endDate
    );

}
