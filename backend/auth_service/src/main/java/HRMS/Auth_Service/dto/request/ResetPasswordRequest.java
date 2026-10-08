package HRMS.Auth_Service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetPasswordRequest {

    @NotBlank(message = "Username is required")
    private String userName;

    @NotBlank(message = "New password is required")
    private String newPassword;
}
