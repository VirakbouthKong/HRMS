package com.example.hr.job.exception;

public class JobNotFoundException extends RuntimeException {

    public JobNotFoundException(Integer jobId) {
        super("Job not found: " + jobId);
    }
}
