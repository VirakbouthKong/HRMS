package HRMS.Auth_Service.service.impl;

import HRMS.Auth_Service.dto.request.CreateRoleRequest;
import HRMS.Auth_Service.dto.request.UpdateRoleRequest;
import HRMS.Auth_Service.dto.response.ApiResponse;
import HRMS.Auth_Service.dto.response.RoleResponse;
import HRMS.Auth_Service.entity.Role;
import HRMS.Auth_Service.mapper.RoleMapper;
import HRMS.Auth_Service.repository.AccountRepository;
import HRMS.Auth_Service.repository.RoleRepository;
import HRMS.Auth_Service.service.RoleService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final AccountRepository accountRepository;
    private final RoleMapper roleMapper;

    public RoleServiceImpl(RoleRepository roleRepository,
                           AccountRepository accountRepository,
                           RoleMapper roleMapper) {
        this.roleRepository = roleRepository;
        this.accountRepository = accountRepository;
        this.roleMapper = roleMapper;
    }

    @Override
    public ApiResponse createRole(CreateRoleRequest request) {

        if (roleRepository.findByRoleName(request.getRoleName()).isPresent()) {
            return new ApiResponse(false, "Role already exists.");
        }

        Role role = roleMapper.toEntity(request);

        roleRepository.save(role);

        return new ApiResponse(true, "Role created successfully.");
    }

    @Override
    public List<RoleResponse> getAllRoles() {

        List<Role> roles = roleRepository.findAll();

        return roles.stream()
                .map(roleMapper::toResponse)
                .toList();
    }

    @Override
    public RoleResponse getRoleById(Integer roleId) {

        Optional<Role> role = roleRepository.findById(roleId);

        if (role.isEmpty()) {
            throw new RuntimeException("Role not found.");
        }

        return roleMapper.toResponse(role.get());
    }

    @Override
    public ApiResponse updateRole(Integer roleId, UpdateRoleRequest request) {

        Optional<Role> optionalRole = roleRepository.findById(roleId);

        if (optionalRole.isEmpty()) {
            return new ApiResponse(false, "Role not found.");
        }

        Optional<Role> duplicateRole =
                roleRepository.findByRoleName(request.getRoleName());

        if (duplicateRole.isPresent()
                && !duplicateRole.get().getRoleId().equals(roleId)) {
            return new ApiResponse(false, "Role name already exists.");
        }

        Role role = optionalRole.get();

        role.setRoleName(request.getRoleName());
        role.setDescription(request.getDescription());

        roleRepository.save(role);

        return new ApiResponse(true, "Role updated successfully.");
    }

    @Override
    public ApiResponse deleteRole(Integer roleId) {

        Optional<Role> role = roleRepository.findById(roleId);

        if (role.isEmpty()) {
            return new ApiResponse(false, "Role not found.");
        }

        if (accountRepository.existsByRole(role.get())) {
            return new ApiResponse(false,
                    "Cannot delete role because it is assigned to one or more accounts.");
        }

        roleRepository.delete(role.get());

        return new ApiResponse(true, "Role deleted successfully.");
    }
}
