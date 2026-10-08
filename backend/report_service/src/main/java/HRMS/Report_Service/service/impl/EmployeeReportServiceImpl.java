package HRMS.Report_Service.service.impl;

import HRMS.Report_Service.dto.response.EmployeeReportResponse;
import HRMS.Report_Service.entity.Employee;
import HRMS.Report_Service.repository.EmployeeRepository;
import HRMS.Report_Service.service.EmployeeReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeReportServiceImpl implements EmployeeReportService {

    private final EmployeeRepository employeeRepository;

    @Override
    public List<EmployeeReportResponse> getAllEmployees() {
        return employeeRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public EmployeeReportResponse getEmployeeById(Integer id) {

        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        return mapToResponse(employee);
    }

    @Override
    public List<EmployeeReportResponse> getEmployeesByStatus(String status) {

        return employeeRepository.findByStatus(status)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<EmployeeReportResponse> getEmployeesByDepartment(Integer departmentId) {

        return employeeRepository.findByDepartment_DepartmentId(departmentId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private EmployeeReportResponse mapToResponse(Employee employee) {

        EmployeeReportResponse response = new EmployeeReportResponse();

        response.setEmployeeId(employee.getEmployeeId());

        response.setFullName(
                employee.getFirstName() + " " + employee.getLastName());

        response.setGender(employee.getGender());

        response.setEmail(employee.getEmail());

        response.setPhoneNumber(employee.getPhoneNumber());

        response.setStatus(employee.getStatus());

        response.setDepartment(
                employee.getDepartment() != null
                        ? employee.getDepartment().getDepartmentName()
                        : null);

        response.setJobTitle(
                employee.getJob() != null
                        ? employee.getJob().getJobTitle()
                        : null);

        return response;
    }
}
