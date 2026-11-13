package com.example.hr.job;

import com.example.hr.job.dto.JobRequest;
import com.example.hr.job.dto.JobResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Job titles. Everyone logged in can read them; ADMIN and HR_MANAGER manage the list. */
@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    /** Optional ?departmentId= gives only that department's jobs (e.g. for the employee form). */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<JobResponse> list(@RequestParam(required = false) Integer departmentId) {
        return jobService.list(departmentId);
    }

    @GetMapping("/{jobId}")
    @PreAuthorize("isAuthenticated()")
    public JobResponse get(@PathVariable Integer jobId) {
        return jobService.get(jobId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public JobResponse create(@Valid @RequestBody JobRequest request) {
        return jobService.create(request);
    }

    @PatchMapping("/{jobId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public JobResponse update(@PathVariable Integer jobId, @Valid @RequestBody JobRequest request) {
        return jobService.update(jobId, request);
    }

    /** 409 while employees have this job or it appears in job history. */
    @DeleteMapping("/{jobId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public void delete(@PathVariable Integer jobId) {
        jobService.delete(jobId);
    }
}
