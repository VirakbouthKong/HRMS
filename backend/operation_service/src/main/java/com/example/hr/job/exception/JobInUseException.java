package com.example.hr.job.exception;

/** The job cannot be deleted or moved because employees have it or it appears in job history. */
public class JobInUseException extends RuntimeException {

    public JobInUseException(String message) {
        super(message);
    }
}
