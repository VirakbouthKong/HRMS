package HRMS.Report_Service.service;

import HRMS.Report_Service.dto.response.PayrollReportResponse;

import java.time.LocalDate;
import java.util.List;

public interface PayrollReportService {

    List<PayrollReportResponse> getAllPayrolls();

    PayrollReportResponse getPayrollById(Integer id);

    List<PayrollReportResponse> getPayrollByEmployee(Integer employeeId);

    List<PayrollReportResponse> getPayrollByDate(LocalDate period);

    List<PayrollReportResponse> getPayrollByDateRange(
            LocalDate startDate,
            LocalDate endDate
    );
}
