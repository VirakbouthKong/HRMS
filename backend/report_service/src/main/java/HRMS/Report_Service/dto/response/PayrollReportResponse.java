package HRMS.Report_Service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PayrollReportResponse {

    private Integer payrollId;
    private String employeeName;
    private LocalDate period;
    private LocalDate generatedDate;
    private BigDecimal baseSalary;
    private Integer totalLateMinutes;
    private BigDecimal lateDeduction;
    private Integer unpaidLeaveDays;
    private BigDecimal unpaidLeaveDeduction;
    private BigDecimal netSalary;

}
