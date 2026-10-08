package HRMS.Report_Service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "tbl_payroll_record")
public class PayrollRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payroll_id")
    private Integer payrollId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @Column(name = "period")
    private LocalDate period;

    @Column(name = "generated_date")
    private LocalDate generatedDate;

    @Column(name = "base_salary")
    private BigDecimal baseSalary;

    @Column(name = "total_late_minutes")
    private Integer totalLateMinutes;

    @Column(name = "late_deduction")
    private BigDecimal lateDeduction;

    @Column(name = "unpaid_leave_days")
    private Integer unpaidLeaveDays;

    @Column(name = "unpaid_leave_deduction")
    private BigDecimal unpaidLeaveDeduction;

    @Column(name = "net_salary")
    private BigDecimal netSalary;
}
