package com.example.hr.employee;

import com.example.hr.department.Department;
import com.example.hr.department.DepartmentRepository;
import com.example.hr.department.exception.DepartmentNotFoundException;
import com.example.hr.employee.dto.EmployeeRequest;
import com.example.hr.employee.dto.EmployeeResponse;
import com.example.hr.employee.exception.DuplicateEmployeeEmailException;
import com.example.hr.employee.exception.EmployeeNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class EmployeeService {

    private static final Logger logger = LoggerFactory.getLogger(EmployeeService.class);

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;

    public EmployeeService(EmployeeRepository employeeRepository, DepartmentRepository departmentRepository) {
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
    }

    public EmployeeResponse createEmployee(EmployeeRequest request) {
        if (employeeRepository.existsByEmailIgnoreCase(request.email())) {
            throw new DuplicateEmployeeEmailException(request.email());
        }

        Department department = departmentRepository.findById(request.departmentId())
                .orElseThrow(() -> new DepartmentNotFoundException(request.departmentId()));

        Employee employee = new Employee(
                request.firstName(),
                request.lastName(),
                request.dateOfBirth(),
                request.email(),
                EmployeeStatus.ACTIVE,
                request.contractEndDate(),
                department
        );

        Employee savedEmployee = employeeRepository.save(employee);
        return toResponse(savedEmployee);
    }

    @Transactional(readOnly = true)
    public List<EmployeeResponse> getEmployees() {
        return employeeRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public EmployeeResponse getEmployee(Integer employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new EmployeeNotFoundException(employeeId));
        return toResponse(employee);
    }

    public EmployeeResponse updateEmployee(Integer employeeId, EmployeeRequest request) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new EmployeeNotFoundException(employeeId));

        if (!employee.getEmail().equalsIgnoreCase(request.email()) &&
                employeeRepository.existsByEmailIgnoreCase(request.email())) {
            throw new DuplicateEmployeeEmailException(request.email());
        }

        Department department = departmentRepository.findById(request.departmentId())
                .orElseThrow(() -> new DepartmentNotFoundException(request.departmentId()));

        employee.updateDetails(
                request.firstName(),
                request.lastName(),
                request.dateOfBirth(),
                request.email(),
                request.contractEndDate(),
                department
        );

        Employee updatedEmployee = employeeRepository.save(employee);
        return toResponse(updatedEmployee);
    }

    public EmployeeResponse changeEmployeeStatus(Integer employeeId, EmployeeStatus newStatus) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new EmployeeNotFoundException(employeeId));

        employee.changeStatus(newStatus);
        Employee updatedEmployee = employeeRepository.save(employee);
        return toResponse(updatedEmployee);
    }

    @Transactional(readOnly = true)
    public void checkContractExpiries(int daysAhead) {
        LocalDate targetDate = LocalDate.now().plusDays(daysAhead);
        List<Employee> expiringEmployees = employeeRepository.findByContractEndDateBetween(targetDate, targetDate);

        for (Employee emp : expiringEmployees) {
            logger.info("[EMAIL ALERT] Contract for {} {} ({}) expires on {} (in exactly {} days).",
                    emp.getFirstName(), emp.getLastName(), emp.getEmail(), emp.getContractEndDate(), daysAhead);
        }
    }

    private EmployeeResponse toResponse(Employee employee) {
        return new EmployeeResponse(
                employee.getEmployeeId(),
                employee.getFirstName(),
                employee.getLastName(),
                employee.getDateOfBirth(),
                employee.getEmail(),
                employee.getContractEndDate(),
                employee.getStatus(),
                employee.getDepartment().getDepartmentId(),
                employee.getDepartment().getDepartmentName()
        );
    }
}
