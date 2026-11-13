package com.example.hr.employee;

import com.example.hr.department.Department;
import com.example.hr.department.DepartmentRepository;
import com.example.hr.department.exception.DepartmentNotFoundException;
import com.example.hr.employee.dto.EmployeeRequest;
import com.example.hr.employee.dto.EmployeeResponse;
import com.example.hr.employee.dto.JobHistoryResponse;
import com.example.hr.employee.exception.DuplicateEmployeeEmailException;
import com.example.hr.employee.exception.EmployeeNotFoundException;
import com.example.hr.employee.exception.EmployeeNotLinkedException;
import com.example.hr.job.Job;
import com.example.hr.job.JobHistory;
import com.example.hr.job.JobHistoryRepository;
import com.example.hr.job.JobRepository;
import com.example.hr.job.exception.JobNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Transactional
public class EmployeeService {

    private static final Logger logger = LoggerFactory.getLogger(EmployeeService.class);
    private static final String STARTING_RECORD = "Starting record";
    private static final String JOB_CHANGED = "Job changed";

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final JobRepository jobRepository;
    private final JobHistoryRepository historyRepository;

    public EmployeeService(EmployeeRepository employeeRepository, DepartmentRepository departmentRepository,
                           JobRepository jobRepository, JobHistoryRepository historyRepository) {
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
        this.jobRepository = jobRepository;
        this.historyRepository = historyRepository;
    }

    public EmployeeResponse createEmployee(EmployeeRequest request) {
        if (employeeRepository.existsByEmailIgnoreCase(request.email())) {
            throw new DuplicateEmployeeEmailException(request.email());
        }

        Department department = department(request.departmentId());
        Job job = jobOfDepartment(request.jobId(), department);

        Employee employee = new Employee(
                request.firstName(),
                request.lastName(),
                request.dateOfBirth(),
                request.email(),
                EmployeeStatus.ACTIVE,
                request.contractEndDate(),
                department,
                job
        );

        Employee savedEmployee = employeeRepository.save(employee);
        historyRepository.save(new JobHistory(savedEmployee, job, LocalDate.now(),
                remarkOr(request.jobChangeRemark(), STARTING_RECORD)));
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
        return toResponse(find(employeeId));
    }

    /** GET /api/employees/me: employeeId comes from the caller's JWT and may be missing. */
    @Transactional(readOnly = true)
    public EmployeeResponse getMyEmployee(Integer employeeId) {
        return toResponse(findMine(employeeId));
    }

    public EmployeeResponse updateEmployee(Integer employeeId, EmployeeRequest request) {
        Employee employee = find(employeeId);

        if (!employee.getEmail().equalsIgnoreCase(request.email()) &&
                employeeRepository.existsByEmailIgnoreCase(request.email())) {
            throw new DuplicateEmployeeEmailException(request.email());
        }

        Department department = department(request.departmentId());
        Job job = jobOfDepartment(request.jobId(), department);   // checked before anything changes

        employee.updateDetails(
                request.firstName(),
                request.lastName(),
                request.dateOfBirth(),
                request.email(),
                request.contractEndDate(),
                department
        );

        Integer previousJobId = employee.getJob() == null ? null : employee.getJob().getJobId();
        if (!Objects.equals(previousJobId, job.getJobId())) {
            LocalDate today = LocalDate.now();
            historyRepository.findFirstByEmployeeEmployeeIdAndEndDateIsNull(employeeId)
                    .ifPresent(open -> open.close(today));
            historyRepository.save(new JobHistory(employee, job, today, remarkOr(request.jobChangeRemark(), JOB_CHANGED)));
            employee.changeJob(job);
        }

        Employee updatedEmployee = employeeRepository.save(employee);
        return toResponse(updatedEmployee);
    }

    public EmployeeResponse changeEmployeeStatus(Integer employeeId, EmployeeStatus newStatus) {
        Employee employee = find(employeeId);

        employee.changeStatus(newStatus);
        Employee updatedEmployee = employeeRepository.save(employee);
        return toResponse(updatedEmployee);
    }

    /** Newest first. */
    @Transactional(readOnly = true)
    public List<JobHistoryResponse> jobHistory(Integer employeeId) {
        find(employeeId);
        return history(employeeId);
    }

    @Transactional(readOnly = true)
    public List<JobHistoryResponse> myJobHistory(Integer employeeId) {
        return history(findMine(employeeId).getEmployeeId());
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

    private List<JobHistoryResponse> history(Integer employeeId) {
        return historyRepository.findByEmployeeEmployeeIdOrderByStartedDateDescJobHistoryIdDesc(employeeId).stream()
                .map(h -> new JobHistoryResponse(h.getJob().getJobTitle(), h.getJob().getDepartment().getDepartmentName(),
                        h.getStartedDate(), h.getEndDate(), h.getRemark()))
                .toList();
    }

    private Employee find(Integer employeeId) {
        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new EmployeeNotFoundException(employeeId));
    }

    private Employee findMine(Integer employeeId) {
        if (employeeId == null) {
            throw new EmployeeNotLinkedException();
        }
        return employeeRepository.findById(employeeId).orElseThrow(EmployeeNotLinkedException::new);
    }

    private Department department(Integer departmentId) {
        return departmentRepository.findById(departmentId)
                .orElseThrow(() -> new DepartmentNotFoundException(departmentId));
    }

    /** The job must exist and belong to the employee's department (400 otherwise). */
    private Job jobOfDepartment(Integer jobId, Department department) {
        Job job = jobRepository.findById(jobId).orElseThrow(() -> new JobNotFoundException(jobId));
        if (!Objects.equals(job.getDepartment().getDepartmentId(), department.getDepartmentId())) {
            throw new IllegalArgumentException("Job " + job.getJobTitle() + " belongs to "
                    + job.getDepartment().getDepartmentName() + ", not " + department.getDepartmentName() + ".");
        }
        return job;
    }

    private static String remarkOr(String remark, String fallback) {
        return remark == null || remark.isBlank() ? fallback : remark.trim();
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
                employee.getDepartment().getDepartmentName(),
                employee.getJob() == null ? null : employee.getJob().getJobTitle()
        );
    }
}
