package HRMS.Auth_Service.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AccountResponse {
    private Integer accountId;

    private String userName;

    private String email;

    private String status;

    private Boolean isFirstLogin;

    private Integer employeeId;

    private String roleName;

    private LocalDateTime createdDate;

    private LocalDateTime updatedDate;
}
