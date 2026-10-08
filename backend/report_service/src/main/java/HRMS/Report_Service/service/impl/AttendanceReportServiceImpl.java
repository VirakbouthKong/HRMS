package HRMS.Report_Service.service.impl;

import HRMS.Report_Service.dto.response.AttendanceReportResponse;
import HRMS.Report_Service.entity.Attendance;
import HRMS.Report_Service.repository.AttendanceRepository;
import HRMS.Report_Service.service.AttendanceReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceReportServiceImpl implements AttendanceReportService {

    private final AttendanceRepository attendanceRepository;

    @Override
    public List<AttendanceReportResponse> getAllAttendance() {

        return attendanceRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    @Override
    public List<AttendanceReportResponse> getAttendanceByDateRange(
            LocalDate startDate,
            LocalDate endDate) {

        return attendanceRepository.findByAttendanceDateBetween(startDate, endDate)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    @Override
    public List<AttendanceReportResponse> getAttendanceByEmployee(Integer employeeId) {

        return attendanceRepository.findByEmployee_EmployeeId(employeeId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<AttendanceReportResponse> getAttendanceByStatus(String status) {

        return attendanceRepository.findByStatus(status)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<AttendanceReportResponse> getAttendanceByDate(LocalDate attendanceDate) {

        return attendanceRepository.findByAttendanceDate(attendanceDate)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private AttendanceReportResponse mapToResponse(Attendance attendance) {

        AttendanceReportResponse response = new AttendanceReportResponse();

        response.setAttendanceId(attendance.getAttendanceId());

        response.setEmployeeName(
                attendance.getEmployee().getFirstName() + " " +
                        attendance.getEmployee().getLastName());

        response.setAttendanceDate(attendance.getAttendanceDate().toString());

        response.setCheckIn(
                attendance.getCheckIn() != null
                        ? attendance.getCheckIn().toString()
                        : null
        );

        response.setCheckOut(
                attendance.getCheckOut() != null
                        ? attendance.getCheckOut().toString()
                        : null
        );

        response.setLateMinutes(attendance.getLateMinutes());

        response.setOtHours(attendance.getOtHours());

        response.setStatus(attendance.getStatus());



        return response;
    }
}
