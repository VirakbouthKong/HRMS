package com.example.hr.department;

import com.example.hr.department.dto.DepartmentRequest;
import com.example.hr.department.dto.DepartmentResponse;
import com.example.hr.department.exception.DepartmentHasEmployeesException;
import com.example.hr.department.exception.DepartmentNotFoundException;
import com.example.hr.department.exception.DuplicateDepartmentException;
import com.example.hr.employee.EmployeeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;

    public DepartmentService(DepartmentRepository departmentRepository, EmployeeRepository employeeRepository) {
        this.departmentRepository = departmentRepository;
        this.employeeRepository = employeeRepository;
    }

    public DepartmentResponse createDepartment(DepartmentRequest request) {
        if (departmentRepository.existsByDepartmentNameIgnoreCase(request.departmentName())) {
            throw new DuplicateDepartmentException(request.departmentName());
        }
        Department department = new Department(request.departmentName(), request.description());
        Department saved = departmentRepository.save(department);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<DepartmentResponse> getDepartments() {
        return departmentRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public DepartmentResponse getDepartment(Integer departmentId) {
        return toResponse(departmentRepository.findById(departmentId)
                .orElseThrow(() -> new DepartmentNotFoundException(departmentId)));
    }

    public DepartmentResponse updateDepartment(Integer departmentId, DepartmentRequest request) {
        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new DepartmentNotFoundException(departmentId));
        department.updateDetails(request.departmentName(), request.description());
        return toResponse(department);
    }

    public void deleteDepartment(Integer departmentId) {
        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new DepartmentNotFoundException(departmentId));
        if (employeeRepository.existsByDepartmentDepartmentId(departmentId)) {
            throw new DepartmentHasEmployeesException(departmentId);
        }
        departmentRepository.delete(department);
    }

    private DepartmentResponse toResponse(Department department) {
        return new DepartmentResponse(
                department.getDepartmentId(),
                department.getDepartmentName(),
                department.getDescription()
        );
    }
}
