package com.example.cron.job;

import com.example.cron.client.OperationsServiceClient;
import com.example.cron.execution.JobExecution;
import com.example.cron.execution.JobExecutionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ContractExpiryJob implements CronJob {

    private static final Logger logger = LoggerFactory.getLogger(ContractExpiryJob.class);

    private final OperationsServiceClient operationsServiceClient;
    private final JobExecutionService executionService;

    public ContractExpiryJob(OperationsServiceClient operationsServiceClient, JobExecutionService executionService) {
        this.operationsServiceClient = operationsServiceClient;
        this.executionService = executionService;
    }

    @Override
    @Scheduled(cron = "0 0 8 * * ?") // Run every day at 8AM
    public void execute() {
        JobExecution execution = executionService.startJob(getJobName());
        try {
            logger.info("Executing Contract Expiry Alerts Job...");
            // Check contract expiring 30 days
            operationsServiceClient.triggerContractExpiryCheck(30);
            logger.info("Contract Expiry Alerts Job completed successfully.");
            executionService.finishJob(execution);
        } catch (Exception e) {
            logger.error("Failed to execute Contract Expiry Alerts Job", e);
            executionService.failJob(execution, e);
        }
    }

    @Override
    public String getJobName() {
        return "ContractExpiryJob";
    }
}
