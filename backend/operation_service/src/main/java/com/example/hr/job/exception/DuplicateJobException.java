package com.example.hr.job.exception;

public class DuplicateJobException extends RuntimeException {

    public DuplicateJobException(String jobTitle, String departmentName) {
        super("Job already exists in " + departmentName + ": " + jobTitle);
    }
}
