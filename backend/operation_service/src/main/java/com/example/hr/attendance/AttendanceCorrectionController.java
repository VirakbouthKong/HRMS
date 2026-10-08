package com.example.hr.attendance;

import com.example.hr.attendance.dto.AttendanceResponse;
import com.example.hr.attendance.dto.CorrectionRequest;
import com.example.hr.attendance.dto.CorrectionResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/attendance/{attendanceId}/corrections")
public class AttendanceCorrectionController {

    private final AttendanceService attendanceService;

    public AttendanceCorrectionController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
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

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER')")
    public ResponseEntity<AttendanceResponse> correctAttendance(
            @PathVariable Integer attendanceId,
            @Valid @RequestBody CorrectionRequest request) {

        AttendanceResponse response = attendanceService.correctAttendance(
                attendanceId,
                currentEmployeeId(),
                request.checkIn(),
                request.checkOut(),
                request.status(),
                request.lateMinutes(),
                request.reason()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER')")
    public ResponseEntity<List<CorrectionResponse>> getCorrectionHistory(
            @PathVariable Integer attendanceId) {
        return ResponseEntity.ok(attendanceService.getCorrectionHistory(attendanceId));
    }
}
