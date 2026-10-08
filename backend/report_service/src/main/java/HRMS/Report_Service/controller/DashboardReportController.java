package HRMS.Report_Service.controller;

import HRMS.Report_Service.dto.response.ApiResponse;
import HRMS.Report_Service.dto.response.DashboardSummaryResponse;
import HRMS.Report_Service.service.DashboardReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/report")
@RequiredArgsConstructor
public class DashboardReportController {

    private final DashboardReportService dashboardReportService;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getDashboardSummary() {

        DashboardSummaryResponse summary =
                dashboardReportService.getDashboardSummary();

        ApiResponse<DashboardSummaryResponse> response =
                new ApiResponse<>(
                        true,
                        "Dashboard Summary",
                        summary
                );

        return ResponseEntity.ok(response);
    }
}
