package com.example.hr.payroll;

import com.example.hr.employee.Employee;
import jakarta.persistence.*;

import java.math.BigDecimal;

// holds base salary settings
@Entity
@Table(name = "tbl_payroll_profile")
public class PayrollProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer profileId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false, unique = true)
    private Employee employee;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal baseSalary;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal dailyRate;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal latePenaltyPerMinute;

    protected PayrollProfile() {
    }

    public static PayrollProfile create(Employee employee, BigDecimal baseSalary, BigDecimal dailyRate, BigDecimal latePenaltyPerMinute) {
        PayrollProfile profile = new PayrollProfile();
        profile.employee = employee;
        profile.baseSalary = baseSalary;
        profile.dailyRate = dailyRate;
        profile.latePenaltyPerMinute = latePenaltyPerMinute;
        return profile;
    }

    public Integer getProfileId() { return profileId; }
    public Employee getEmployee() { return employee; }
    public BigDecimal getBaseSalary() { return baseSalary; }
    public BigDecimal getDailyRate() { return dailyRate; }
    public BigDecimal getLatePenaltyPerMinute() { return latePenaltyPerMinute; }

    public void updateSalary(BigDecimal baseSalary, BigDecimal dailyRate, BigDecimal latePenaltyPerMinute) {
        if (baseSalary == null || baseSalary.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Base salary must be zero or positive");
        }
        this.baseSalary = baseSalary;
        this.dailyRate = dailyRate;
        this.latePenaltyPerMinute = latePenaltyPerMinute;
    }
}
