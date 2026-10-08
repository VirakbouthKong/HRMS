package HRMS.Auth_Service.mapper;

import HRMS.Auth_Service.dto.request.CreateRoleRequest;
import HRMS.Auth_Service.dto.response.RoleResponse;
import HRMS.Auth_Service.entity.Role;
import org.springframework.stereotype.Component;

@Component
public class RoleMapper {

    public Role toEntity(CreateRoleRequest request) {

        Role role = new Role();

        role.setRoleName(request.getRoleName());
        role.setDescription(request.getDescription());

        return role;
    }

    public RoleResponse toResponse(Role role) {

        RoleResponse response = new RoleResponse();

        response.setRoleId(role.getRoleId());
        response.setRoleName(role.getRoleName());
        response.setDescription(role.getDescription());

        return response;
    }
}
