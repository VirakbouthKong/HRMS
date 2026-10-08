package HRMS.Report_Service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "tbl_payroll")
public class Payroll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payroll_id")
    private Integer payrollId;

    @Column(name = "month", length = 255)
    private String month;

    @Column(name = "year", length = 255)
    private String year;

    @Column(name = "basic_salary")
    private Double basicSalary;

    @Column(name = "bonus")
    private Double bonus;

    @Column(name = "deduction")
    private Double deduction;

    @Column(name = "net_salary")
    private Double netSalary;

    @Column(name = "generate_date")
    private LocalDate generateDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;
}
