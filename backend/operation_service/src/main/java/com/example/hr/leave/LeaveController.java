package com.example.hr.leave;

import com.example.hr.leave.dto.LeaveResponse;
import com.example.hr.leave.dto.LeaveSubmitRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leaves")
public class LeaveController {

    private final LeaveService leaveService;

    public LeaveController(LeaveService leaveService) {
        this.leaveService = leaveService;
    }

    /** From the token's employeeId claim; never the account id (see CurrentEmployee). */

    private static Integer currentEmployeeId() {

        return com.example.hr.common.security.CurrentEmployee.id();

    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER','HR_STAFF','EMPLOYEE')")
    public LeaveResponse submitLeave(@Valid @RequestBody LeaveSubmitRequest request) {
        return leaveService.submitLeave(currentEmployeeId(), request);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER','HR_STAFF')")
    public List<LeaveResponse> getLeaves() {
        return leaveService.getLeaves();
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER','HR_STAFF','EMPLOYEE')")
    public List<LeaveResponse> getMyLeaves() {
        return leaveService.getLeavesByEmployee(currentEmployeeId());
    }

    @GetMapping("/{leaveId}")
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER','HR_STAFF')")
    public LeaveResponse getLeave(@PathVariable Integer leaveId) {
        return leaveService.getLeave(leaveId);
    }

    @PatchMapping("/{leaveId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER','HR_STAFF')")
    public LeaveResponse approveLeave(@PathVariable Integer leaveId) {
        return leaveService.approveLeave(leaveId, currentEmployeeId());
    }

    @PatchMapping("/{leaveId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER','HR_STAFF')")
    public LeaveResponse rejectLeave(@PathVariable Integer leaveId) {
        return leaveService.rejectLeave(leaveId, currentEmployeeId());
    }

    @PatchMapping("/{leaveId}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER','HR_STAFF','EMPLOYEE')")
    public LeaveResponse cancelLeave(@PathVariable Integer leaveId) {
        return leaveService.cancelLeave(leaveId, currentEmployeeId());
    }
}
