package com.example.hr.employee;

import com.example.hr.employee.dto.EmployeeRequest;
import com.example.hr.employee.dto.EmployeeResponse;
import com.example.hr.employee.dto.JobHistoryResponse;
import com.example.hr.employee.dto.StatusChangeRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_STAFF')")
    public EmployeeResponse createEmployee(@Valid @RequestBody EmployeeRequest request) {
        return employeeService.createEmployee(request);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_STAFF')")
    public List<EmployeeResponse> getEmployees() {
        return employeeService.getEmployees();
    }

    /** The logged-in user's own employee record (404 for accounts without one, e.g. sysadmin). */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public EmployeeResponse getMyEmployee() {
        return employeeService.getMyEmployee(currentEmployeeId());
    }

    @GetMapping("/me/job-history")
    @PreAuthorize("isAuthenticated()")
    public List<JobHistoryResponse> getMyJobHistory() {
        return employeeService.myJobHistory(currentEmployeeId());
    }

    @GetMapping("/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_STAFF')")
    public EmployeeResponse getEmployee(@PathVariable Integer employeeId) {
        return employeeService.getEmployee(employeeId);
    }

    /** Newest first; the current job has no end date. */
    @GetMapping("/{employeeId}/job-history")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_STAFF')")
    public List<JobHistoryResponse> getJobHistory(@PathVariable Integer employeeId) {
        return employeeService.jobHistory(employeeId);
    }
    /** From the token's employeeId claim; never the account id (see CurrentEmployee). */
    private static Integer currentEmployeeId() {
        return com.example.hr.common.security.CurrentEmployee.idOrNull();
    }

    @PatchMapping("/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_STAFF')")
    public EmployeeResponse updateEmployee(
            @PathVariable Integer employeeId,
            @Valid @RequestBody EmployeeRequest request) {
        return employeeService.updateEmployee(employeeId, request);
    }

    @PatchMapping("/{employeeId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_STAFF')")
    public EmployeeResponse changeEmployeeStatus(
            @PathVariable Integer employeeId,
            @Valid @RequestBody StatusChangeRequest request) {
        return employeeService.changeEmployeeStatus(employeeId, request.status());
    }
}
