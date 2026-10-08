package HRMS.Report_Service.service.impl;

import HRMS.Report_Service.dto.response.LeaveReportResponse;
import HRMS.Report_Service.entity.LeaveRequest;
import HRMS.Report_Service.repository.LeaveRepository;
import HRMS.Report_Service.service.LeaveReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaveReportServiceImpl implements LeaveReportService {

    private final LeaveRepository leaveRepository;

    @Override
    public List<LeaveReportResponse> getAllLeaves() {
        return leaveRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public LeaveReportResponse getLeaveById(Integer id) {

        LeaveRequest leave = leaveRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Leave not found"));

        return mapToResponse(leave);
    }

    @Override
    public List<LeaveReportResponse> getLeavesByEmployee(Integer employeeId) {

        return leaveRepository.findByEmployee_EmployeeId(employeeId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<LeaveReportResponse> getLeavesByStatus(String status) {

        return leaveRepository.findByStatus(status)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<LeaveReportResponse> getLeavesByType(String leaveType) {

        return leaveRepository.findByLeaveType(leaveType)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<LeaveReportResponse> getLeavesByDateRange(
            LocalDate startDate,
            LocalDate endDate) {

        return leaveRepository.findByStartDateBetween(startDate, endDate)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private LeaveReportResponse mapToResponse(LeaveRequest leave) {

        LeaveReportResponse response = new LeaveReportResponse();

        response.setLeaveId(leave.getLeaveId());

        if (leave.getEmployee() != null) {
            response.setEmployeeName(
                    leave.getEmployee().getFirstName() + " " +
                            leave.getEmployee().getLastName());
        }

        response.setLeaveType(leave.getLeaveType());

        response.setStartDate(leave.getStartDate());

        response.setEndDate(leave.getEndDate());

        long days = ChronoUnit.DAYS.between(
                leave.getStartDate(),
                leave.getEndDate()) + 1;

        response.setTotalDays((int) days);

        response.setReason(leave.getReason());

        response.setStatus(leave.getStatus());

        if (leave.getApprovedBy() != null) {
            response.setApprovedBy(
                    leave.getApprovedBy().getFirstName() + " " +
                            leave.getApprovedBy().getLastName());
        }

        return response;
    }
}
