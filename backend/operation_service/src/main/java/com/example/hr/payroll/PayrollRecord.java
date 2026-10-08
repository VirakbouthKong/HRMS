package com.example.hr.payroll;

import com.example.hr.employee.Employee;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.LocalDate;

// generated payslip record
@Entity
@Table(name = "tbl_payroll_record")
public class PayrollRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer payrollId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(nullable = false)
    private LocalDate period;

    @Column(nullable = false)
    private LocalDate generatedDate;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal baseSalary;

    @Column(nullable = false)
    private int totalLateMinutes;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal lateDeduction;

    @Column(nullable = false)
    private int unpaidLeaveDays;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal unpaidLeaveDeduction;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal netSalary;

    protected PayrollRecord() {
    }

    public static PayrollRecord create(Employee employee, LocalDate period, LocalDate generatedDate,
                                       BigDecimal baseSalary, int totalLateMinutes, BigDecimal lateDeduction,
                                       int unpaidLeaveDays, BigDecimal unpaidLeaveDeduction, BigDecimal netSalary) {
        PayrollRecord record = new PayrollRecord();
        record.employee = employee;
        record.period = period;
        record.generatedDate = generatedDate;
        record.baseSalary = baseSalary;
        record.totalLateMinutes = totalLateMinutes;
        record.lateDeduction = lateDeduction;
        record.unpaidLeaveDays = unpaidLeaveDays;
        record.unpaidLeaveDeduction = unpaidLeaveDeduction;
        record.netSalary = netSalary;
        return record;
    }

    public Integer getPayrollId() { return payrollId; }
    public Employee getEmployee() { return employee; }
    public LocalDate getPeriod() { return period; }
    public LocalDate getGeneratedDate() { return generatedDate; }
    public BigDecimal getBaseSalary() { return baseSalary; }
    public int getTotalLateMinutes() { return totalLateMinutes; }
    public BigDecimal getLateDeduction() { return lateDeduction; }
    public int getUnpaidLeaveDays() { return unpaidLeaveDays; }
    public BigDecimal getUnpaidLeaveDeduction() { return unpaidLeaveDeduction; }
    public BigDecimal getNetSalary() { return netSalary; }
}
