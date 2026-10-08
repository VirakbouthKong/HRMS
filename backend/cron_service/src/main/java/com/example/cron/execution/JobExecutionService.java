package com.example.cron.execution;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class JobExecutionService {

    private static final Logger log = LoggerFactory.getLogger(JobExecutionService.class);
    private final JobExecutionRepository repository;

    public JobExecutionService(JobExecutionRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public JobExecution startJob(String jobName) {
        log.info("Starting job: {}", jobName);
        JobExecution execution = new JobExecution(jobName, LocalDateTime.now(), "STARTED");
        return repository.save(execution);
    }

    @Transactional
    public void finishJob(JobExecution execution) {
        log.info("Successfully finished job: {}", execution.getJobName());
        execution.setEndTime(LocalDateTime.now());
        execution.setStatus("COMPLETED");
        repository.save(execution);
    }

    @Transactional
    public void failJob(JobExecution execution, Exception e) {
        log.error("Failed job: {}", execution.getJobName(), e);
        execution.setEndTime(LocalDateTime.now());
        execution.setStatus("FAILED");
        execution.setErrorMessage(e.getMessage());
        repository.save(execution);
    }

    public List<JobExecution> getRecentHistory() {
        return repository.findTop50ByOrderByStartTimeDesc();
    }
}
