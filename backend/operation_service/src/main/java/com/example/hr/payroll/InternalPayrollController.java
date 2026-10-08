package com.example.hr.payroll;

import com.example.hr.payroll.dto.PayrollRecordResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/internal/payroll")
public class InternalPayrollController {

    private final PayrollService payrollService;

    public InternalPayrollController(PayrollService payrollService) {
        this.payrollService = payrollService;
    }

    @PostMapping("/generate")
    public ResponseEntity<List<PayrollRecordResponse>> generatePayroll(
            @RequestParam(value = "period", required = false) YearMonth period) {
        if (period == null) {
            period = YearMonth.now(); // Default to current month if not provided
        }
        List<PayrollRecordResponse> responses = payrollService.generatePayroll(period);
        return ResponseEntity.ok(responses);
    }
}
