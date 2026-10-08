package HRMS.Report_Service.service.impl;

import HRMS.Report_Service.dto.response.PayrollReportResponse;
import HRMS.Report_Service.entity.PayrollRecord;
import HRMS.Report_Service.repository.PayrollRecordRepository;
import HRMS.Report_Service.service.PayrollReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PayrollReportServiceImpl implements PayrollReportService {

    private final PayrollRecordRepository payrollRecordRepository;

    @Override
    public List<PayrollReportResponse> getAllPayrolls() {

        return payrollRecordRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public PayrollReportResponse getPayrollById(Integer id) {

        PayrollRecord payroll = payrollRecordRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payroll not found"));

        return mapToResponse(payroll);
    }

    @Override
    public List<PayrollReportResponse> getPayrollByEmployee(Integer employeeId) {

        return payrollRecordRepository.findByEmployee_EmployeeId(employeeId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<PayrollReportResponse> getPayrollByDate(LocalDate period) {

        return payrollRecordRepository.findByPeriod(period)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<PayrollReportResponse> getPayrollByDateRange(
            LocalDate startDate,
            LocalDate endDate) {

        return payrollRecordRepository.findByPeriodBetween(startDate, endDate)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private PayrollReportResponse mapToResponse(PayrollRecord payroll) {

        PayrollReportResponse response = new PayrollReportResponse();

        response.setPayrollId(payroll.getPayrollId());

        if (payroll.getEmployee() != null) {
            response.setEmployeeName(
                    payroll.getEmployee().getFirstName() + " " +
                            payroll.getEmployee().getLastName());
        }

        response.setPeriod(payroll.getPeriod());

        response.setGeneratedDate(payroll.getGeneratedDate());

        response.setBaseSalary(payroll.getBaseSalary());

        response.setTotalLateMinutes(payroll.getTotalLateMinutes());

        response.setLateDeduction(payroll.getLateDeduction());

        response.setUnpaidLeaveDays(payroll.getUnpaidLeaveDays());

        response.setUnpaidLeaveDeduction(payroll.getUnpaidLeaveDeduction());

        response.setNetSalary(payroll.getNetSalary());

        return response;
    }
}
