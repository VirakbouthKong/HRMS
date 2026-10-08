package com.example.hr.attendance;

import com.example.hr.attendance.dto.AttendanceResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
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

    @PostMapping("/check-in")
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER','EMPLOYEE')")
    public ResponseEntity<AttendanceResponse> checkIn() {
        AttendanceResponse response = attendanceService.checkIn(currentEmployeeId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/check-out")
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER','EMPLOYEE')")
    public ResponseEntity<AttendanceResponse> checkOut() {
        AttendanceResponse response = attendanceService.checkOut(currentEmployeeId());
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER')")
    public ResponseEntity<List<AttendanceResponse>> getAttendance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(attendanceService.getAttendanceByDate(date));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER','EMPLOYEE')")
    public ResponseEntity<AttendanceResponse> getMyAttendance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(attendanceService.getEmployeeAttendance(currentEmployeeId(), date));
    }

    @GetMapping("/{attendanceId}")
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER')")
    public ResponseEntity<AttendanceResponse> getAttendanceRecord(@PathVariable Integer attendanceId) {
        return ResponseEntity.ok(attendanceService.getAttendanceRecord(attendanceId));
    }
}
