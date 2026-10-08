package HRMS.Report_Service.service;

import HRMS.Report_Service.dto.response.EmployeeReportResponse;

import java.util.List;

public interface EmployeeReportService {

    List<EmployeeReportResponse> getAllEmployees();

    EmployeeReportResponse getEmployeeById(Integer id);

    List<EmployeeReportResponse> getEmployeesByStatus(String status);

    List<EmployeeReportResponse> getEmployeesByDepartment(Integer departmentId);

}
