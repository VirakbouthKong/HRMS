package HRMS.Auth_Service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LoginResponse {

    private String token;

    private Integer accountId;

    private String userName;

    private String email;

    private String role;

    private Boolean isFirstLogin;
}