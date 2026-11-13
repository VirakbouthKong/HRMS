package com.example.hr.job;

import com.example.hr.department.Department;
import com.example.hr.department.DepartmentRepository;
import com.example.hr.department.exception.DepartmentNotFoundException;
import com.example.hr.employee.EmployeeRepository;
import com.example.hr.job.dto.JobRequest;
import com.example.hr.job.dto.JobResponse;
import com.example.hr.job.exception.DuplicateJobException;
import com.example.hr.job.exception.JobInUseException;
import com.example.hr.job.exception.JobNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@Transactional
public class JobService {

    private final JobRepository jobRepository;
    private final JobHistoryRepository historyRepository;
    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;

    public JobService(JobRepository jobRepository, JobHistoryRepository historyRepository,
                      DepartmentRepository departmentRepository, EmployeeRepository employeeRepository) {
        this.jobRepository = jobRepository;
        this.historyRepository = historyRepository;
        this.departmentRepository = departmentRepository;
        this.employeeRepository = employeeRepository;
    }

    @Transactional(readOnly = true)
    public List<JobResponse> list(Integer departmentId) {
        List<Job> jobs = departmentId == null
                ? jobRepository.findAllByOrderByJobTitle()
                : jobRepository.findByDepartmentDepartmentIdOrderByJobTitle(departmentId);
        return jobs.stream().map(JobService::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public JobResponse get(Integer jobId) {
        return toResponse(find(jobId));
    }

    public JobResponse create(JobRequest request) {
        Department department = department(request.departmentId());
        String title = request.jobTitle().trim();
        rejectDuplicate(title, department, null);
        return toResponse(jobRepository.save(new Job(title, trimToNull(request.description()), department)));
    }

    public JobResponse update(Integer jobId, JobRequest request) {
        Job job = find(jobId);
        Department department = department(request.departmentId());
        String title = request.jobTitle().trim();
        rejectDuplicate(title, department, jobId);

        boolean moving = !Objects.equals(job.getDepartment().getDepartmentId(), department.getDepartmentId());
        long holders = employeeRepository.countByJobJobId(jobId);
        if (moving && holders > 0) {
            throw new JobInUseException("Job " + job.getJobTitle() + " cannot move to " + department.getDepartmentName()
                    + ": " + holders + " employee(s) in " + job.getDepartment().getDepartmentName() + " have it.");
        }
        // History shows the job's department; moving would rewrite where people worked in the past.
        if (moving && historyRepository.existsByJobJobId(jobId)) {
            throw new JobInUseException("Job " + job.getJobTitle() + " appears in job history and cannot move to "
                    + department.getDepartmentName() + ". Create a new job in that department instead.");
        }
        job.updateDetails(title, trimToNull(request.description()), department);
        return toResponse(job);
    }

    public void delete(Integer jobId) {
        Job job = find(jobId);
        long holders = employeeRepository.countByJobJobId(jobId);
        if (holders > 0) {
            throw new JobInUseException("Job " + job.getJobTitle() + " is still used by " + holders + " employee(s).");
        }
        if (historyRepository.existsByJobJobId(jobId)) {
            throw new JobInUseException("Job " + job.getJobTitle() + " appears in job history and cannot be deleted.");
        }
        jobRepository.delete(job);
    }

    Job find(Integer jobId) {
        return jobRepository.findById(jobId).orElseThrow(() -> new JobNotFoundException(jobId));
    }

    private Department department(Integer departmentId) {
        return departmentRepository.findById(departmentId)
                .orElseThrow(() -> new DepartmentNotFoundException(departmentId));
    }

    private void rejectDuplicate(String title, Department department, Integer exceptJobId) {
        boolean exists = jobRepository.findByDepartmentDepartmentId(department.getDepartmentId()).stream()
                .anyMatch(j -> !j.getJobId().equals(exceptJobId) && j.getJobTitle().equalsIgnoreCase(title));
        if (exists) {
            throw new DuplicateJobException(title, department.getDepartmentName());
        }
    }

    private static String trimToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    static JobResponse toResponse(Job job) {
        return new JobResponse(job.getJobId(), job.getJobTitle(), job.getDescription(),
                job.getDepartment().getDepartmentId(), job.getDepartment().getDepartmentName());
    }
}
