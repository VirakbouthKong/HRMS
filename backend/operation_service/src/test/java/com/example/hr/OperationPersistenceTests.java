package com.example.hr;

import com.example.hr.department.Department;
import com.example.hr.department.DepartmentRepository;
import com.example.hr.employee.Employee;
import com.example.hr.employee.EmployeeRepository;
import com.example.hr.employee.EmployeeStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class OperationPersistenceTests {

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Test
    void persistsAnActiveEmployeeInItsDepartment() {
        Department department = departmentRepository.save(new Department("Human Resources", "People operations"));

        Employee employee = employeeRepository.save(new Employee(
                "Dara",
                "Sok",
                LocalDate.of(2000, 1, 15),
                "dara.sok@example.test",
                EmployeeStatus.ACTIVE,
                null,
                department
        ));

        assertThat(employee.getEmployeeId()).isNotNull();
        assertThat(employee.getDepartment().getDepartmentId()).isEqualTo(department.getDepartmentId());
        assertThat(employee.getStatus()).isEqualTo(EmployeeStatus.ACTIVE);
    }
}
