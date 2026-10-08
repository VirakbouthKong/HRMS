package HRMS.Report_Service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceReportResponse {

    private Integer attendanceId;
    private String employeeName;
    private String attendanceDate;
    private String checkIn;
    private String checkOut;
    private Integer lateMinutes;
    private Integer otHours;
    private String status;

}
