package com.example.hr.attendance;

import com.example.hr.attendance.dto.DailySummaryResponse;
import com.example.hr.attendance.dto.MarkAbsencesResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/internal/attendance")
public class InternalAttendanceController {

    private final AttendanceService attendanceService;

    public InternalAttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping("/mark-absences")
    public ResponseEntity<MarkAbsencesResponse> markAbsences(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(attendanceService.markAbsences(date));
    }

    @GetMapping("/daily-summary")
    public ResponseEntity<DailySummaryResponse> getDailySummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(attendanceService.getDailySummary(date));
    }
}
