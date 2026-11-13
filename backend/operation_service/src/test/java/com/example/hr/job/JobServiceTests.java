package com.example.hr.job;

import com.example.hr.department.Department;
import com.example.hr.department.DepartmentRepository;
import com.example.hr.employee.Employee;
import com.example.hr.employee.EmployeeRepository;
import com.example.hr.employee.EmployeeStatus;
import com.example.hr.job.dto.JobRequest;
import com.example.hr.job.dto.JobResponse;
import com.example.hr.job.exception.DuplicateJobException;
import com.example.hr.job.exception.JobInUseException;
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
@Import(JobService.class)
class JobServiceTests {

    @Autowired JobService jobService;
    @Autowired JobRepository jobRepository;
    @Autowired JobHistoryRepository historyRepository;
    @Autowired DepartmentRepository departmentRepository;
    @Autowired EmployeeRepository employeeRepository;

    Department hr;
    Department it;

    @BeforeEach
    void setUp() {
        hr = departmentRepository.save(new Department("HR DEPARTMENT", "People"));
        it = departmentRepository.save(new Department("IT DEPARTMENT", "Tech"));
    }

    private Employee employee(String email, Department department, Job job) {
        return employeeRepository.save(new Employee("Dara", "Sok", LocalDate.of(1998, 1, 1), email,
                EmployeeStatus.ACTIVE, null, department, job));
    }

    @Test
    void create_savesTrimmedTitleInDepartment() {
        JobResponse job = jobService.create(new JobRequest("  HR Staff  ", "Staff HR", hr.getDepartmentId()));

        assertThat(job.jobTitle()).isEqualTo("HR Staff");
        assertThat(job.departmentId()).isEqualTo(hr.getDepartmentId());
        assertThat(job.departmentName()).isEqualTo("HR DEPARTMENT");
    }

    @Test
    void create_duplicateTitleIgnoringCaseAndSpaces409() {
        jobService.create(new JobRequest("HR Staff", null, hr.getDepartmentId()));

        assertThatThrownBy(() -> jobService.create(new JobRequest("  hr staff ", null, hr.getDepartmentId())))
                .isInstanceOf(DuplicateJobException.class);
    }

    @Test
    void create_sameTitleInOtherDepartmentAllowed() {
        jobService.create(new JobRequest("Manager", null, hr.getDepartmentId()));

        assertThat(jobService.create(new JobRequest("Manager", null, it.getDepartmentId())).jobId()).isNotNull();
    }

    @Test
    void update_renameAllowedWithEmployees() {
        Job job = jobRepository.save(new Job("HR Staff", null, hr));
        employee("a@x.com", hr, job);

        JobResponse renamed = jobService.update(job.getJobId(), new JobRequest("HR Officer", "renamed", hr.getDepartmentId()));

        assertThat(renamed.jobTitle()).isEqualTo("HR Officer");
    }

    @Test
    void update_moveDepartmentWithEmployees409() {
        Job job = jobRepository.save(new Job("HR Staff", null, hr));
        employee("a@x.com", hr, job);

        assertThatThrownBy(() -> jobService.update(job.getJobId(), new JobRequest("HR Staff", null, it.getDepartmentId())))
                .isInstanceOf(JobInUseException.class);
    }

    @Test
    void update_moveDepartmentOfJobInHistory409() {
        Job old = jobRepository.save(new Job("Old Title", null, hr));
        Job current = jobRepository.save(new Job("New Title", null, hr));
        JobHistory past = new JobHistory(employee("a@x.com", hr, current), old, LocalDate.of(2025, 1, 1), "Starting record");
        past.close(LocalDate.of(2026, 1, 1));
        historyRepository.save(past);

        // past history must keep showing the department the person really worked in
        assertThatThrownBy(() -> jobService.update(old.getJobId(), new JobRequest("Old Title", null, it.getDepartmentId())))
                .isInstanceOf(JobInUseException.class).hasMessageContaining("history");
    }

    @Test
    void delete_unusedJob() {
        Job job = jobRepository.save(new Job("Content Creator", null, hr));

        jobService.delete(job.getJobId());

        assertThat(jobRepository.existsById(job.getJobId())).isFalse();
    }

    @Test
    void delete_jobWithEmployeesIs409() {
        Job job = jobRepository.save(new Job("Worker", null, hr));
        employee("a@x.com", hr, job);
        employee("b@x.com", hr, job);

        assertThatThrownBy(() -> jobService.delete(job.getJobId()))
                .isInstanceOf(JobInUseException.class).hasMessageContaining("2 employee");
        assertThat(jobRepository.existsById(job.getJobId())).isTrue();
    }

    @Test
    void delete_jobInHistoryIs409() {
        Job old = jobRepository.save(new Job("Old Title", null, hr));
        Job current = jobRepository.save(new Job("New Title", null, hr));
        Employee dara = employee("a@x.com", hr, current);
        JobHistory past = new JobHistory(dara, old, LocalDate.of(2025, 1, 1), "Starting record");
        past.close(LocalDate.of(2026, 1, 1));
        historyRepository.save(past);

        assertThatThrownBy(() -> jobService.delete(old.getJobId()))
                .isInstanceOf(JobInUseException.class).hasMessageContaining("history");
    }

    @Test
    void list_filtersByDepartment() {
        jobRepository.save(new Job("HR Staff", null, hr));
        jobRepository.save(new Job("Developer", null, it));

        List<JobResponse> hrJobs = jobService.list(hr.getDepartmentId());

        assertThat(hrJobs).extracting(JobResponse::jobTitle).containsExactly("HR Staff");
        assertThat(jobService.list(null)).hasSize(2);
    }
}
