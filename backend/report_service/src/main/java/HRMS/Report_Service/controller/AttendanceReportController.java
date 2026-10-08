package HRMS.Report_Service.controller;

import HRMS.Report_Service.dto.response.ApiResponse;
import HRMS.Report_Service.dto.response.AttendanceReportResponse;
import HRMS.Report_Service.service.AttendanceReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/report/attendance")
@RequiredArgsConstructor
public class AttendanceReportController {

    private final AttendanceReportService attendanceReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AttendanceReportResponse>>> getAllAttendance() {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Attendance Report",
                        attendanceReportService.getAllAttendance()
                )
        );
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<ApiResponse<List<AttendanceReportResponse>>> getAttendanceByEmployee(
            @PathVariable Integer employeeId) {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Attendance By Employee",
                        attendanceReportService.getAttendanceByEmployee(employeeId)
                )
        );
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<ApiResponse<List<AttendanceReportResponse>>> getAttendanceByStatus(
            @PathVariable String status) {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Attendance By Status",
                        attendanceReportService.getAttendanceByStatus(status)
                )
        );
    }

    @GetMapping("/date/{attendanceDate}")
    public ResponseEntity<ApiResponse<List<AttendanceReportResponse>>> getAttendanceByDate(
            @PathVariable
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate attendanceDate) {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Attendance By Date",
                        attendanceReportService.getAttendanceByDate(attendanceDate)
                )
        );
    }

    @GetMapping("/range")
    public ResponseEntity<ApiResponse<List<AttendanceReportResponse>>> getAttendanceByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Attendance Between Dates",
                        attendanceReportService.getAttendanceByDateRange(startDate, endDate)
                )
        );
    }
}
