package HRMS.Report_Service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeReportResponse {

    private Integer employeeId;
    private String fullName;
    private String gender;
    private String email;
    private String phoneNumber;
    private String department;
    private String jobTitle;
    private String status;

}
