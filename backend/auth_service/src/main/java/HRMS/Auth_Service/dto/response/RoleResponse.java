package HRMS.Auth_Service.dto.response;

import lombok.Data;

@Data
public class RoleResponse {

    private Integer roleId;
    private String roleName;
    private String description;
}
