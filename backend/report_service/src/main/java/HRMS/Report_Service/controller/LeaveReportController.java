package HRMS.Report_Service.controller;

import HRMS.Report_Service.dto.response.ApiResponse;
import HRMS.Report_Service.dto.response.LeaveReportResponse;
import HRMS.Report_Service.service.LeaveReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/report/leaves")
@RequiredArgsConstructor
public class LeaveReportController {

    private final LeaveReportService leaveReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<LeaveReportResponse>>> getAllLeaves() {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Leave Report",
                        leaveReportService.getAllLeaves()
                )
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LeaveReportResponse>> getLeaveById(
            @PathVariable Integer id) {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Leave Found",
                        leaveReportService.getLeaveById(id)
                )
        );
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<ApiResponse<List<LeaveReportResponse>>> getLeavesByEmployee(
            @PathVariable Integer employeeId) {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Leaves By Employee",
                        leaveReportService.getLeavesByEmployee(employeeId)
                )
        );
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<ApiResponse<List<LeaveReportResponse>>> getLeavesByStatus(
            @PathVariable String status) {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Leaves By Status",
                        leaveReportService.getLeavesByStatus(status)
                )
        );
    }

    @GetMapping("/type/{leaveType}")
    public ResponseEntity<ApiResponse<List<LeaveReportResponse>>> getLeavesByType(
            @PathVariable String leaveType) {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Leaves By Type",
                        leaveReportService.getLeavesByType(leaveType)
                )
        );
    }

    @GetMapping("/range")
    public ResponseEntity<ApiResponse<List<LeaveReportResponse>>> getLeavesByDateRange(

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate startDate,

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate endDate) {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Leaves Between Dates",
                        leaveReportService.getLeavesByDateRange(startDate, endDate)
                )
        );
    }
}
