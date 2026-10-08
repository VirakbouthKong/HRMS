package HRMS.Auth_Service.service;

import HRMS.Auth_Service.dto.request.CreateRoleRequest;
import HRMS.Auth_Service.dto.request.UpdateRoleRequest;
import HRMS.Auth_Service.dto.response.ApiResponse;
import HRMS.Auth_Service.dto.response.RoleResponse;

import java.util.List;

public interface RoleService {

    ApiResponse createRole(CreateRoleRequest request);

    List<RoleResponse> getAllRoles();

    RoleResponse getRoleById(Integer roleId);

    ApiResponse updateRole(Integer roleId,
                           UpdateRoleRequest request);

    ApiResponse deleteRole(Integer roleId);

}
