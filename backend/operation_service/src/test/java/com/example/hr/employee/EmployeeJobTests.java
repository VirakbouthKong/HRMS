package com.example.hr.employee;

import com.example.hr.department.Department;
import com.example.hr.department.DepartmentRepository;
import com.example.hr.employee.dto.EmployeeRequest;
import com.example.hr.employee.dto.EmployeeResponse;
import com.example.hr.employee.dto.JobHistoryResponse;
import com.example.hr.employee.exception.EmployeeNotLinkedException;
import com.example.hr.job.Job;
import com.example.hr.job.JobHistoryRepository;
import com.example.hr.job.JobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import(EmployeeService.class)
class EmployeeJobTests {

    @Autowired EmployeeService employeeService;
    @Autowired EmployeeRepository employeeRepository;
    @Autowired DepartmentRepository departmentRepository;
    @Autowired JobRepository jobRepository;
    @Autowired JobHistoryRepository historyRepository;

    Department hr;
    Department it;
    Job hrStaff;
    Job hrManager;
    Job developer;

    @BeforeEach
    void setUp() {
        hr = departmentRepository.save(new Department("HR DEPARTMENT", "People"));
        it = departmentRepository.save(new Department("IT DEPARTMENT", "Tech"));
        hrStaff = jobRepository.save(new Job("HR Staff", null, hr));
        hrManager = jobRepository.save(new Job("HR Manager", null, hr));
        developer = jobRepository.save(new Job("Developer", null, it));
    }

    private EmployeeRequest request(String email, Department department, Job job, String remark) {
        return new EmployeeRequest("Dara", "Sok", LocalDate.of(1998, 1, 1), email, null,
                department.getDepartmentId(), job.getJobId(), remark);
    }

    private List<JobHistoryResponse> history(Integer employeeId) {
        return employeeService.jobHistory(employeeId);
    }

    @Test
    void create_requiresJobOfSameDepartment() {
        assertThatThrownBy(() -> employeeService.createEmployee(request("a@x.com", hr, developer, null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Developer").hasMessageContaining("IT DEPARTMENT").hasMessageContaining("HR DEPARTMENT");
        assertThat(employeeRepository.count()).isZero();
    }

    @Test
    void response_hasJobTitle() {
        EmployeeResponse created = employeeService.createEmployee(request("a@x.com", hr, hrStaff, null));

        assertThat(created.jobTitle()).isEqualTo("HR Staff");
        assertThat(employeeService.getEmployee(created.employeeId()).jobTitle()).isEqualTo("HR Staff");
    }

    @Test
    void create_writesOpeningHistory() {
        EmployeeResponse created = employeeService.createEmployee(request("a@x.com", hr, hrStaff, null));

        List<JobHistoryResponse> rows = history(created.employeeId());
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).jobTitle()).isEqualTo("HR Staff");
        assertThat(rows.get(0).startedDate()).isEqualTo(LocalDate.now());
        assertThat(rows.get(0).endDate()).isNull();
    }

    @Test
    void update_jobChangeClosesAndOpensHistoryWithRemark() {
        EmployeeResponse created = employeeService.createEmployee(request("a@x.com", hr, hrStaff, null));

        EmployeeResponse updated = employeeService.updateEmployee(created.employeeId(),
                request("a@x.com", hr, hrManager, "Promotion"));

        assertThat(updated.jobTitle()).isEqualTo("HR Manager");
        List<JobHistoryResponse> rows = history(created.employeeId());   // newest first
        assertThat(rows).hasSize(2);
        assertThat(rows.get(0).jobTitle()).isEqualTo("HR Manager");
        assertThat(rows.get(0).endDate()).isNull();
        assertThat(rows.get(0).remark()).isEqualTo("Promotion");
        assertThat(rows.get(1).jobTitle()).isEqualTo("HR Staff");
        assertThat(rows.get(1).endDate()).isEqualTo(LocalDate.now());
    }

    @Test
    void update_sameJobWritesNoHistory() {
        EmployeeResponse created = employeeService.createEmployee(request("a@x.com", hr, hrStaff, null));

        employeeService.updateEmployee(created.employeeId(), request("a@x.com", hr, hrStaff, "ignored remark"));

        assertThat(history(created.employeeId())).hasSize(1);
    }

    @Test
    void update_departmentChangeWithOldJobIs400() {
        EmployeeResponse created = employeeService.createEmployee(request("a@x.com", hr, hrStaff, null));

        assertThatThrownBy(() -> employeeService.updateEmployee(created.employeeId(),
                request("a@x.com", it, hrStaff, null))).isInstanceOf(IllegalArgumentException.class);
        assertThat(employeeService.getEmployee(created.employeeId()).departmentName()).isEqualTo("HR DEPARTMENT");
    }

    @Test
    void update_departmentAndJobTogetherWorks() {
        EmployeeResponse created = employeeService.createEmployee(request("a@x.com", hr, hrStaff, null));

        EmployeeResponse moved = employeeService.updateEmployee(created.employeeId(),
                request("a@x.com", it, developer, "Transfer"));

        assertThat(moved.departmentName()).isEqualTo("IT DEPARTMENT");
        assertThat(moved.jobTitle()).isEqualTo("Developer");
    }

    @Test
    void me_returnsOwnEmployee() {
        EmployeeResponse created = employeeService.createEmployee(request("a@x.com", hr, hrStaff, null));

        assertThat(employeeService.getMyEmployee(created.employeeId()).email()).isEqualTo("a@x.com");
    }

    @Test
    void me_withoutEmployeeIdIs404() {
        assertThatThrownBy(() -> employeeService.getMyEmployee(null)).isInstanceOf(EmployeeNotLinkedException.class);
        assertThatThrownBy(() -> employeeService.getMyEmployee(999_999)).isInstanceOf(EmployeeNotLinkedException.class);
    }
}
