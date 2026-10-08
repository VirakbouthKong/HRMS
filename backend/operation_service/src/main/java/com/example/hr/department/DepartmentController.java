package com.example.hr.department;

import com.example.hr.department.dto.DepartmentRequest;
import com.example.hr.department.dto.DepartmentResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public DepartmentResponse createDepartment(@Valid @RequestBody DepartmentRequest request) {
        return departmentService.createDepartment(request);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public List<DepartmentResponse> listDepartments() {
        return departmentService.getDepartments();
    }

    @GetMapping("/{departmentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public DepartmentResponse getDepartment(@PathVariable Integer departmentId) {
        return departmentService.getDepartment(departmentId);
    }

    @PatchMapping("/{departmentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public DepartmentResponse updateDepartment(@PathVariable Integer departmentId,
                                               @Valid @RequestBody DepartmentRequest request) {
        return departmentService.updateDepartment(departmentId, request);
    }

    @DeleteMapping("/{departmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public void deleteDepartment(@PathVariable Integer departmentId) {
        departmentService.deleteDepartment(departmentId);
    }
}
