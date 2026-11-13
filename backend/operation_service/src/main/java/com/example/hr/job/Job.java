package com.example.hr.job;

import com.example.hr.department.Department;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** A job title. Every job belongs to one department; an employee's job must be in their department. */
@Entity
@Table(name = "tbl_job")
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "job_id")
    private Integer jobId;

    @Column(name = "job_title")
    private String jobTitle;

    @Column(name = "description")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    protected Job() {
    }

    public Job(String jobTitle, String description, Department department) {
        this.jobTitle = jobTitle;
        this.description = description;
        this.department = department;
    }

    public Integer getJobId() {
        return jobId;
    }

    /** Trimmed: some titles in the database were typed with trailing spaces. */
    public String getJobTitle() {
        return jobTitle == null ? null : jobTitle.trim();
    }

    public String getDescription() {
        return description == null ? null : description.trim();
    }

    public Department getDepartment() {
        return department;
    }

    public void updateDetails(String jobTitle, String description, Department department) {
        this.jobTitle = jobTitle;
        this.description = description;
        this.department = department;
    }
}
