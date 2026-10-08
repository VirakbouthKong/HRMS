package com.example.hr.department;

import com.example.hr.department.dto.DepartmentRequest;
import com.example.hr.department.dto.DepartmentResponse;
import com.example.hr.department.exception.DepartmentHasEmployeesException;
import com.example.hr.department.exception.DuplicateDepartmentException;
import com.example.hr.employee.Employee;
import com.example.hr.employee.EmployeeRepository;
import com.example.hr.employee.EmployeeStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import(DepartmentService.class)
class DepartmentServiceTests {

    @Autowired
    private DepartmentService departmentService;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Test
    void rejectsDuplicateDepartmentName() {
        departmentRepository.save(new Department("Human Resources", "People operations"));

        assertThatThrownBy(() -> departmentService.createDepartment(
                new DepartmentRequest("human resources", "Duplicate")
        )).isInstanceOf(DuplicateDepartmentException.class);
    }

    @Test
    void updatesDepartmentFields() {
        Department department = departmentRepository.save(new Department("Human Resources", "People operations"));

        DepartmentResponse response = departmentService.updateDepartment(
                department.getDepartmentId(),
                new DepartmentRequest("HR", "People team")
        );

        assertThat(response.departmentName()).isEqualTo("HR");
        assertThat(response.description()).isEqualTo("People team");
    }

    @Test
    void rejectsDeletingDepartmentWithEmployees() {
        Department department = departmentRepository.save(new Department("Human Resources", "People operations"));
        employeeRepository.save(new Employee(
                "Dara",
                "Sok",
                LocalDate.of(2000, 1, 15),
                "dara.sok@example.test",
                EmployeeStatus.ACTIVE,
                null,
                department
        ));

        assertThatThrownBy(() -> departmentService.deleteDepartment(department.getDepartmentId()))
                .isInstanceOf(DepartmentHasEmployeesException.class);
    }
}
