package com.example.hr.payroll;

import com.example.hr.payroll.dto.GeneratePayrollRequest;
import com.example.hr.payroll.dto.PayrollProfileRequest;
import com.example.hr.payroll.dto.PayrollProfileResponse;
import com.example.hr.payroll.dto.PayrollRecordResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/payroll")
public class PayrollController {

    private final PayrollService payrollService;

    public PayrollController(PayrollService payrollService) {
        this.payrollService = payrollService;
    }


    @PostMapping("/profiles/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<PayrollProfileResponse> setProfile(
            @PathVariable Integer employeeId,
            @Valid @RequestBody PayrollProfileRequest request) {
        PayrollProfileResponse response = payrollService.setProfile(employeeId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profiles/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<PayrollProfileResponse> getProfile(@PathVariable Integer employeeId) {
        return ResponseEntity.ok(payrollService.getProfile(employeeId));
    }


    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<List<PayrollRecordResponse>> generatePayroll(
            @Valid @RequestBody GeneratePayrollRequest request) {
        List<PayrollRecordResponse> responses = payrollService.generatePayroll(request.period());
        return ResponseEntity.ok(responses);
    }
    
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<List<PayrollRecordResponse>> getPayrollsByPeriod(
            @RequestParam("period") YearMonth period) {
        return ResponseEntity.ok(payrollService.getPayrollsByPeriod(period));
    }


    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')")
    public ResponseEntity<List<PayrollRecordResponse>> getMyPayrolls() {
        return ResponseEntity.ok(payrollService.getMyPayrolls(currentEmployeeId()));
    }

    private Integer currentEmployeeId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String employeeIdStr = jwt.getClaimAsString("employeeId");
            if (employeeIdStr != null) {
                return Integer.parseInt(employeeIdStr);
            }
            return Integer.parseInt(jwt.getSubject());
        }
        throw new IllegalStateException("User not authenticated or employeeId missing");
    }
}
