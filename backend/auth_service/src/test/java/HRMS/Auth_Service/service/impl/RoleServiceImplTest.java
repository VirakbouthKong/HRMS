package HRMS.Auth_Service.service.impl;

import HRMS.Auth_Service.dto.request.UpdateRoleRequest;
import HRMS.Auth_Service.dto.response.ApiResponse;
import HRMS.Auth_Service.entity.Role;
import HRMS.Auth_Service.mapper.RoleMapper;
import HRMS.Auth_Service.repository.AccountRepository;
import HRMS.Auth_Service.repository.RoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** System roles are authorised by name in the gateway and services, so they must keep their name. */
class RoleServiceImplTest {

    private RoleRepository roles;
    private AccountRepository accounts;
    private RoleServiceImpl service;

    private final Role admin = Role.builder().roleId(1).roleName("ADMIN").description("Full access").build();
    private final Role custom = Role.builder().roleId(9).roleName("TEAM_LEAD").description("Leads a team").build();

    @BeforeEach
    void setUp() {
        roles = mock(RoleRepository.class);
        accounts = mock(AccountRepository.class);
        when(roles.findById(1)).thenReturn(Optional.of(admin));
        when(roles.findById(9)).thenReturn(Optional.of(custom));
        when(roles.findByRoleName(any())).thenReturn(Optional.empty());
        service = new RoleServiceImpl(roles, accounts, new RoleMapper());
    }

    private static UpdateRoleRequest update(String name, String description) {
        UpdateRoleRequest r = new UpdateRoleRequest();
        r.setRoleName(name);
        r.setDescription(description);
        return r;
    }

    @Test
    void update_refusesRenamingSystemRole() {
        ApiResponse response = service.updateRole(1, update("SUPER_ADMIN", "Full access"));

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("cannot be renamed");
        verify(roles, never()).save(any());
    }

    @Test
    void update_allowsChangingSystemRoleDescription() {
        ApiResponse response = service.updateRole(1, update("ADMIN", "Everything, including accounts"));

        assertThat(response.isSuccess()).isTrue();
        assertThat(admin.getDescription()).isEqualTo("Everything, including accounts");
        verify(roles).save(admin);
    }

    @Test
    void update_allowsRenamingCustomRole() {
        ApiResponse response = service.updateRole(9, update("SQUAD_LEAD", "Leads a squad"));

        assertThat(response.isSuccess()).isTrue();
        assertThat(custom.getRoleName()).isEqualTo("SQUAD_LEAD");
    }

    @Test
    void delete_refusesSystemRoleEvenWhenUnused() {
        when(accounts.existsByRole(admin)).thenReturn(false);

        ApiResponse response = service.deleteRole(1);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).isEqualTo("System roles cannot be deleted.");
        verify(roles, never()).delete(any());
    }

    @Test
    void delete_refusesCustomRoleInUse() {
        when(accounts.existsByRole(custom)).thenReturn(true);

        ApiResponse response = service.deleteRole(9);

        assertThat(response.isSuccess()).isFalse();
        verify(roles, never()).delete(any());
    }

    @Test
    void delete_allowsUnusedCustomRole() {
        when(accounts.existsByRole(custom)).thenReturn(false);

        ApiResponse response = service.deleteRole(9);

        assertThat(response.isSuccess()).isTrue();
        verify(roles).delete(custom);
    }
}
