package com.example.cron.job;

import com.example.cron.execution.JobExecution;
import com.example.cron.execution.JobExecutionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class DailyAttendanceSyncJob implements CronJob {

    private static final Logger log = LoggerFactory.getLogger(DailyAttendanceSyncJob.class);
    private static final String JOB_NAME = "DailyAttendanceSyncJob";
    private final JobExecutionService executionService;
    private final com.example.cron.client.OperationsServiceClient operationsServiceClient;

    public DailyAttendanceSyncJob(JobExecutionService executionService, com.example.cron.client.OperationsServiceClient operationsServiceClient) {
        this.executionService = executionService;
        this.operationsServiceClient = operationsServiceClient;
    }

    @Override
    public String getJobName() {
        return JOB_NAME;
    }

    // Run every day at midnight
    @Scheduled(cron = "0 0 0 * * *")
    @Override
    public void execute() {
        JobExecution execution = executionService.startJob(JOB_NAME);
        try {
            java.time.LocalDate yesterday = java.time.LocalDate.now().minusDays(1);
            log.info("Synchronizing daily attendance records for: {}", yesterday);
            
            operationsServiceClient.triggerMarkAbsences(yesterday);
            
            log.info("Daily attendance synchronized successfully.");
            executionService.finishJob(execution);
        } catch (Exception e) {
            log.error("Failed to synchronize daily attendance", e);
            executionService.failJob(execution, e);
        }
    }
}
