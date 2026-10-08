package HRMS.Report_Service.dto.response;

import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DashboardSummaryResponse {

    private Long totalEmployees;

    private Long activeEmployees;

    private Long inactiveEmployees;

    private Long totalDepartments;

    private Long totalJobs;
}
