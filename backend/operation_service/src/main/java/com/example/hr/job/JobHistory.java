package com.example.hr.job;

import com.example.hr.employee.Employee;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDate;

/** One period in an employee's career. The current job has no end date. */
@Entity
@Table(name = "tbl_jobhistory")
public class JobHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "jobhistory_id")
    private Integer jobHistoryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id")
    private Job job;

    @Column(name = "started_date")
    private LocalDate startedDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "remark")
    private String remark;

    protected JobHistory() {
    }

    public JobHistory(Employee employee, Job job, LocalDate startedDate, String remark) {
        this.employee = employee;
        this.job = job;
        this.startedDate = startedDate;
        this.remark = remark;
    }

    public void close(LocalDate endDate) {
        this.endDate = endDate;
    }

    public Integer getJobHistoryId() {
        return jobHistoryId;
    }

    public Employee getEmployee() {
        return employee;
    }

    public Job getJob() {
        return job;
    }

    public LocalDate getStartedDate() {
        return startedDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public String getRemark() {
        return remark;
    }
}
