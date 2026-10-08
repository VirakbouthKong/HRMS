package com.example.cron.job;

import com.example.cron.execution.JobExecution;
import com.example.cron.execution.JobExecutionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class WeeklyReportJob implements CronJob {

    private static final Logger log = LoggerFactory.getLogger(WeeklyReportJob.class);
    private static final String JOB_NAME = "WeeklyReportJob";
    private final JobExecutionService executionService;

    public WeeklyReportJob(JobExecutionService executionService) {
        this.executionService = executionService;
    }

    @Override
    public String getJobName() {
        return JOB_NAME;
    }

    // Run every Monday at 8:00 AM
    @Scheduled(cron = "0 0 8 * * MON")
    @Override
    public void execute() {
        JobExecution execution = executionService.startJob(JOB_NAME);
        try {
            log.info("Generating weekly report...");
            
            // TODO: generate report and email it
            // Simulate work
            Thread.sleep(2000); 
            
            log.info("Weekly report generated successfully.");
            executionService.finishJob(execution);
        } catch (Exception e) {
            executionService.failJob(execution, e);
        }
    }
}
