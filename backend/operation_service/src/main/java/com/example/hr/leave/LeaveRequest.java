package com.example.hr.leave;

import com.example.hr.employee.Employee;
import com.example.hr.leave.exception.InvalidLeaveStateException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDate;

// tracks leave workflow
@Entity
@Table(name = "tbl_leave")
public class LeaveRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "leave_id")
    private Integer leaveId;

    @Column(name = "leave_type")
    private String leaveType;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "reason")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private LeaveStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private Employee approvedBy;

    protected LeaveRequest() {
    }

    public LeaveRequest(Employee employee, String leaveType, LocalDate startDate,
                        LocalDate endDate, String reason) {
        this.employee = employee;
        this.leaveType = leaveType;
        this.startDate = startDate;
        this.endDate = endDate;
        this.reason = reason;
        this.status = LeaveStatus.PENDING;
    }


    public Integer getLeaveId() {
        return leaveId;
    }

    public String getLeaveType() {
        return leaveType;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public String getReason() {
        return reason;
    }

    public LeaveStatus getStatus() {
        return status;
    }

    public Employee getEmployee() {
        return employee;
    }

    public Employee getApprovedBy() {
        return approvedBy;
    }


    public void approve(Employee approver) {
        requirePending();
        this.status = LeaveStatus.APPROVED;
        this.approvedBy = approver;
    }

    public void reject(Employee approver) {
        requirePending();
        this.status = LeaveStatus.REJECTED;
        this.approvedBy = approver;
    }

    public void cancel() {
        requirePending();
        this.status = LeaveStatus.CANCELLED;
    }

    private void requirePending() {
        if (this.status != LeaveStatus.PENDING) {
            throw new InvalidLeaveStateException(this.leaveId, this.status);
        }
    }
}
