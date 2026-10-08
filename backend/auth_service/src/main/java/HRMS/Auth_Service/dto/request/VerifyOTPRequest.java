package HRMS.Auth_Service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerifyOTPRequest {
    @NotBlank
    private String userName;

    @NotBlank
    private String otpCode;
}
