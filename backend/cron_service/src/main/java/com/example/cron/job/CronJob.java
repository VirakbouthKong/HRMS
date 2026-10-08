package com.example.cron.job;

public interface CronJob {
    String getJobName();
    void execute();
}
