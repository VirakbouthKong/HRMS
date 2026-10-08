package HRMS.Report_Service.controller;

import HRMS.Report_Service.dto.response.ApiResponse;
import HRMS.Report_Service.dto.response.PayrollReportResponse;
import HRMS.Report_Service.service.PayrollReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/report/payroll")
@RequiredArgsConstructor
public class PayrollReportController {

    private final PayrollReportService payrollReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PayrollReportResponse>>> getAllPayrolls() {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Payroll Report",
                        payrollReportService.getAllPayrolls()
                )
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PayrollReportResponse>> getPayrollById(
            @PathVariable Integer id) {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Payroll Found",
                        payrollReportService.getPayrollById(id)
                )
        );
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<ApiResponse<List<PayrollReportResponse>>> getPayrollByEmployee(
            @PathVariable Integer employeeId) {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Payroll By Employee",
                        payrollReportService.getPayrollByEmployee(employeeId)
                )
        );
    }

    @GetMapping("/date/{period}")
    public ResponseEntity<ApiResponse<List<PayrollReportResponse>>> getPayrollByDate(

            @PathVariable
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate period) {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Payroll By Date",
                        payrollReportService.getPayrollByDate(period)
                )
        );
    }

    @GetMapping("/range")
    public ResponseEntity<ApiResponse<List<PayrollReportResponse>>> getPayrollByDateRange(

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate startDate,

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate endDate) {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Payroll Between Dates",
                        payrollReportService.getPayrollByDateRange(startDate, endDate)
                )
        );
    }
}
