package com.example.cron.job;

import com.example.cron.client.OperationsServiceClient;
import com.example.cron.execution.JobExecution;
import com.example.cron.execution.JobExecutionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.YearMonth;

@Component
public class MonthlyPayrollJob implements CronJob {

    private static final Logger log = LoggerFactory.getLogger(MonthlyPayrollJob.class);
    public static final String JOB_NAME = "MonthlyPayrollJob";

    private final OperationsServiceClient operationsServiceClient;
    private final JobExecutionService executionService;

    public MonthlyPayrollJob(OperationsServiceClient operationsServiceClient, JobExecutionService executionService) {
        this.operationsServiceClient = operationsServiceClient;
        this.executionService = executionService;
    }

    @Override
    public String getJobName() {
        return JOB_NAME;
    }

    // Run on the 28th of every month at 1:00 AM
    @Scheduled(cron = "0 0 1 28 * ?")
    @Override
    public void execute() {
        JobExecution execution = executionService.startJob(JOB_NAME);
        try {
            // Get the current month to generate payroll for
            YearMonth currentPeriod = YearMonth.now();
            log.info("Triggering payroll generation for period: {}", currentPeriod);
            
            operationsServiceClient.triggerPayrollGeneration(currentPeriod);
            
            log.info("Monthly payroll generated successfully for period {}.", currentPeriod);
            executionService.finishJob(execution);
        } catch (Exception e) {
            log.error("Failed to generate monthly payroll", e);
            executionService.failJob(execution, e);
        }
    }
}
