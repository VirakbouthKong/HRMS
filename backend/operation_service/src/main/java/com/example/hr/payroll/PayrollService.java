package com.example.hr.payroll;

import com.example.hr.attendance.Attendance;
import com.example.hr.attendance.AttendanceRepository;
import com.example.hr.employee.Employee;
import com.example.hr.employee.EmployeeRepository;
import com.example.hr.leave.LeaveRequest;
import com.example.hr.leave.LeaveRequestRepository;
import com.example.hr.leave.LeaveStatus;
import com.example.hr.payroll.dto.PayrollProfileRequest;
import com.example.hr.payroll.dto.PayrollProfileResponse;
import com.example.hr.payroll.dto.PayrollRecordResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@Transactional
public class PayrollService {

    private final PayrollProfileRepository profileRepository;
    private final PayrollRecordRepository recordRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRequestRepository leaveRepository;

    public PayrollService(PayrollProfileRepository profileRepository,
                          PayrollRecordRepository recordRepository,
                          EmployeeRepository employeeRepository,
                          AttendanceRepository attendanceRepository,
                          LeaveRequestRepository leaveRepository) {
        this.profileRepository = profileRepository;
        this.recordRepository = recordRepository;
        this.employeeRepository = employeeRepository;
        this.attendanceRepository = attendanceRepository;
        this.leaveRepository = leaveRepository;
    }

    public PayrollProfileResponse setProfile(Integer employeeId, PayrollProfileRequest request) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        PayrollProfile profile = profileRepository.findByEmployeeId(employeeId)
                .orElse(null);

        if (profile == null) {
            profile = PayrollProfile.create(employee, request.baseSalary(), request.dailyRate(), request.latePenaltyPerMinute());
            profileRepository.save(profile);
        } else {
            profile.updateSalary(request.baseSalary(), request.dailyRate(), request.latePenaltyPerMinute());
        }

        return toProfileResponse(profile);
    }

    @Transactional(readOnly = true)
    public PayrollProfileResponse getProfile(Integer employeeId) {
        PayrollProfile profile = profileRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Payroll profile not found for employee"));
        return toProfileResponse(profile);
    }

    public List<PayrollRecordResponse> generatePayroll(YearMonth period) {
        LocalDate startDate = period.atDay(1);
        LocalDate endDate = period.atEndOfMonth();

        List<Employee> activeEmployees = employeeRepository.findAll();

        return activeEmployees.stream().map(emp -> {
            recordRepository.findByEmployeeIdAndPeriod(emp.getEmployeeId(), startDate)
                    .ifPresent(recordRepository::delete);
            PayrollProfile profile = profileRepository.findByEmployeeId(emp.getEmployeeId()).orElse(null);
            if (profile == null) {
                return null; // skip if no salary profile
            }

            // calc late deductions
            List<Attendance> attendances = attendanceRepository.findByEmployeeEmployeeIdAndAttendanceDateBetween(
                    emp.getEmployeeId(), startDate, endDate);
                    
            int totalLateMinutes = attendances.stream().mapToInt(Attendance::getLateMinutes).sum();
            BigDecimal lateDeduction = profile.getLatePenaltyPerMinute().multiply(BigDecimal.valueOf(totalLateMinutes));

            // calc unpaid leaves
            List<LeaveRequest> leaves = leaveRepository.findByEmployeeEmployeeIdAndStatus(emp.getEmployeeId(), LeaveStatus.APPROVED);
            int unpaidLeaveDays = 0;
            for (LeaveRequest lr : leaves) {
                // check leave overlap
                LocalDate maxStart = lr.getStartDate().isAfter(startDate) ? lr.getStartDate() : startDate;
                LocalDate minEnd = lr.getEndDate().isBefore(endDate) ? lr.getEndDate() : endDate;
                if (!maxStart.isAfter(minEnd)) {
                    unpaidLeaveDays += java.time.temporal.ChronoUnit.DAYS.between(maxStart, minEnd) + 1;
                }
            }
            BigDecimal unpaidLeaveDeduction = profile.getDailyRate().multiply(BigDecimal.valueOf(unpaidLeaveDays));

            // calc net salary
            BigDecimal totalDeductions = lateDeduction.add(unpaidLeaveDeduction);
            BigDecimal netSalary = profile.getBaseSalary().subtract(totalDeductions);
            if (netSalary.compareTo(BigDecimal.ZERO) < 0) {
                netSalary = BigDecimal.ZERO;
            }

            PayrollRecord record = PayrollRecord.create(
                    emp, startDate, LocalDate.now(), profile.getBaseSalary(),
                    totalLateMinutes, lateDeduction, unpaidLeaveDays, unpaidLeaveDeduction, netSalary
            );

            recordRepository.save(record);
            return toRecordResponse(record);
        }).filter(java.util.Objects::nonNull).toList();
    }

    @Transactional(readOnly = true)
    public List<PayrollRecordResponse> getMyPayrolls(Integer employeeId) {
        return recordRepository.findByEmployeeId(employeeId).stream()
                .map(this::toRecordResponse)
                .toList();
    }
    
    @Transactional(readOnly = true)
    public List<PayrollRecordResponse> getPayrollsByPeriod(YearMonth period) {
        return recordRepository.findByPeriodWithEmployee(period.atDay(1)).stream()
                .map(this::toRecordResponse)
                .toList();
    }

    private PayrollProfileResponse toProfileResponse(PayrollProfile profile) {
        return new PayrollProfileResponse(
                profile.getProfileId(),
                profile.getEmployee().getEmployeeId(),
                profile.getEmployee().getFirstName() + " " + profile.getEmployee().getLastName(),
                profile.getBaseSalary(),
                profile.getDailyRate(),
                profile.getLatePenaltyPerMinute()
        );
    }

    private PayrollRecordResponse toRecordResponse(PayrollRecord record) {
        return new PayrollRecordResponse(
                record.getPayrollId(),
                record.getEmployee().getEmployeeId(),
                record.getEmployee().getFirstName() + " " + record.getEmployee().getLastName(),
                YearMonth.from(record.getPeriod()),
                record.getGeneratedDate(),
                record.getBaseSalary(),
                record.getTotalLateMinutes(),
                record.getLateDeduction(),
                record.getUnpaidLeaveDays(),
                record.getUnpaidLeaveDeduction(),
                record.getNetSalary()
        );
    }
}
