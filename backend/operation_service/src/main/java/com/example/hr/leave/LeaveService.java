package com.example.hr.leave;

import com.example.hr.employee.Employee;
import com.example.hr.employee.EmployeeRepository;
import com.example.hr.employee.exception.EmployeeNotFoundException;
import com.example.hr.leave.dto.LeaveResponse;
import com.example.hr.leave.dto.LeaveSubmitRequest;
import com.example.hr.leave.exception.LeaveNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class LeaveService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;

    public LeaveService(LeaveRequestRepository leaveRequestRepository, EmployeeRepository employeeRepository) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.employeeRepository = employeeRepository;
    }

    public LeaveResponse submitLeave(Integer employeeId, LeaveSubmitRequest request) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new EmployeeNotFoundException(employeeId));

        if (request.startDate().isAfter(request.endDate())) {
            throw new IllegalArgumentException("Start date must be before or equal to end date");
        }

        LeaveRequest leaveRequest = new LeaveRequest(
                employee,
                request.leaveType(),
                request.startDate(),
                request.endDate(),
                request.reason()
        );

        LeaveRequest savedLeave = leaveRequestRepository.save(leaveRequest);
        return toResponse(savedLeave);
    }

    @Transactional(readOnly = true)
    public List<LeaveResponse> getLeaves() {
        return leaveRequestRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LeaveResponse> getLeavesByEmployee(Integer employeeId) {
        return leaveRequestRepository.findByEmployeeEmployeeId(employeeId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public LeaveResponse getLeave(Integer leaveId) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new LeaveNotFoundException(leaveId));
        return toResponse(leaveRequest);
    }

    public LeaveResponse approveLeave(Integer leaveId, Integer approverId) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new LeaveNotFoundException(leaveId));
        Employee approver = employeeRepository.findById(approverId)
                .orElseThrow(() -> new EmployeeNotFoundException(approverId));

        leaveRequest.approve(approver);
        return toResponse(leaveRequestRepository.save(leaveRequest));
    }

    public LeaveResponse rejectLeave(Integer leaveId, Integer approverId) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new LeaveNotFoundException(leaveId));
        Employee approver = employeeRepository.findById(approverId)
                .orElseThrow(() -> new EmployeeNotFoundException(approverId));

        leaveRequest.reject(approver);
        return toResponse(leaveRequestRepository.save(leaveRequest));
    }

    public LeaveResponse cancelLeave(Integer leaveId, Integer employeeId) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new LeaveNotFoundException(leaveId));

        if (!leaveRequest.getEmployee().getEmployeeId().equals(employeeId)) {
            throw new IllegalArgumentException("You can only cancel your own leave requests");
        }

        leaveRequest.cancel();
        return toResponse(leaveRequestRepository.save(leaveRequest));
    }

    private LeaveResponse toResponse(LeaveRequest leave) {
        Integer approvedById = null;
        String approvedByName = null;

        if (leave.getApprovedBy() != null) {
            approvedById = leave.getApprovedBy().getEmployeeId();
            approvedByName = leave.getApprovedBy().getFirstName() + " " + leave.getApprovedBy().getLastName();
        }

        return new LeaveResponse(
                leave.getLeaveId(),
                leave.getEmployee().getEmployeeId(),
                leave.getEmployee().getFirstName() + " " + leave.getEmployee().getLastName(),
                leave.getLeaveType(),
                leave.getStartDate(),
                leave.getEndDate(),
                leave.getReason(),
                leave.getStatus(),
                approvedById,
                approvedByName
        );
    }
}
