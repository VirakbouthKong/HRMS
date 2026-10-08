package HRMS.Report_Service.service.impl;

import HRMS.Report_Service.dto.response.DashboardSummaryResponse;
import HRMS.Report_Service.repository.DepartmentRepository;
import HRMS.Report_Service.repository.EmployeeRepository;
import HRMS.Report_Service.repository.JobRepository;
import HRMS.Report_Service.service.DashboardReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashboardReportServiceImpl implements DashboardReportService {

    private final EmployeeRepository employeeRepository;

    private final DepartmentRepository departmentRepository;

    private final JobRepository jobRepository;

    @Override
    public DashboardSummaryResponse getDashboardSummary() {

        DashboardSummaryResponse response = new DashboardSummaryResponse();

        response.setTotalEmployees(employeeRepository.count());

        response.setActiveEmployees(employeeRepository.countByStatus("ACTIVE"));

        response.setInactiveEmployees(employeeRepository.countByStatus("INACTIVE"));

        response.setTotalDepartments(departmentRepository.count());

        response.setTotalJobs(jobRepository.count());

        return response;
    }
}
