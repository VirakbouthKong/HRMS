package HRMS.Auth_Service.service.impl;

import HRMS.Auth_Service.dto.request.CreateAccountRequest;
import HRMS.Auth_Service.dto.response.ApiResponse;
import HRMS.Auth_Service.entity.Account;
import HRMS.Auth_Service.entity.Role;
import HRMS.Auth_Service.mapper.AccountMapper;
import HRMS.Auth_Service.repository.AccountRepository;
import HRMS.Auth_Service.repository.RoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AccountServiceImplTest {

    private AccountRepository accounts;
    private AccountServiceImpl service;

    @BeforeEach
    void setUp() {
        accounts = mock(AccountRepository.class);
        RoleRepository roles = mock(RoleRepository.class);
        when(roles.findById(7)).thenReturn(Optional.of(Role.builder().roleId(7).roleName("EMPLOYEE").build()));
        service = new AccountServiceImpl(accounts, roles, new AccountMapper(), new BCryptPasswordEncoder());
    }

    private static CreateAccountRequest request(int employeeId) {
        CreateAccountRequest r = new CreateAccountRequest();
        r.setUserName("test_dara");
        r.setUserPwd("Temp-Pass-1");
        r.setEmail("test_dara@hrms.local");
        r.setStatus("ACTIVE");
        r.setEmployeeId(employeeId);
        r.setRoleId(7);
        return r;
    }

    @Test
    void create_refusesEmployeeThatAlreadyHasAccount() {
        when(accounts.existsByEmployeeId(1)).thenReturn(true);

        ApiResponse response = service.createAccount(request(1));

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).isEqualTo("This employee already has an account.");
        verify(accounts, never()).save(any());
    }

    @Test
    void create_allowsEmployeeWithoutAccount() {
        when(accounts.existsByEmployeeId(18)).thenReturn(false);

        ApiResponse response = service.createAccount(request(18));

        assertThat(response.isSuccess()).isTrue();
        verify(accounts, times(1)).save(any(Account.class));
    }
}
