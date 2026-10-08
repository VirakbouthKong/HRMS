package HRMS.Auth_Service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateRoleRequest {

    @NotBlank(message = "Role name is required")
    private String roleName;

    @NotBlank(message = "Description is required")
    private String description;
}
