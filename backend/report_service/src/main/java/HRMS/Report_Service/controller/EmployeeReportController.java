package HRMS.Report_Service.controller;

import HRMS.Report_Service.dto.response.ApiResponse;
import HRMS.Report_Service.dto.response.EmployeeReportResponse;
import HRMS.Report_Service.service.EmployeeReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/report/employees")
@RequiredArgsConstructor
public class EmployeeReportController {

    private final EmployeeReportService employeeReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<EmployeeReportResponse>>> getAllEmployees() {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Employee Report",
                        employeeReportService.getAllEmployees()
                )
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EmployeeReportResponse>> getEmployeeById(
            @PathVariable Integer id) {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Employee Found",
                        employeeReportService.getEmployeeById(id)
                )
        );
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<ApiResponse<List<EmployeeReportResponse>>> getEmployeesByStatus(
            @PathVariable String status) {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Employees By Status",
                        employeeReportService.getEmployeesByStatus(status)
                )
        );
    }

    @GetMapping("/department/{departmentId}")
    public ResponseEntity<ApiResponse<List<EmployeeReportResponse>>> getEmployeesByDepartment(
            @PathVariable Integer departmentId) {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Employees By Department",
                        employeeReportService.getEmployeesByDepartment(departmentId)
                )
        );
    }
}
