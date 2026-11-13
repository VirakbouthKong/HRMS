package HRMS.Auth_Service.service.impl;

import HRMS.Auth_Service.dto.request.ChangePasswordRequest;
import HRMS.Auth_Service.dto.response.AuthenticatedUserResponse;
import HRMS.Auth_Service.entity.Account;
import HRMS.Auth_Service.entity.Role;
import HRMS.Auth_Service.exception.AuthException;
import HRMS.Auth_Service.repository.AccountRepository;
import HRMS.Auth_Service.repository.OTPRepository;
import HRMS.Auth_Service.service.OtpEmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** The database (repositories) and email are mocked; password hashing is real. */
class AuthServiceImplTest {

    private final PasswordEncoder encoder = new BCryptPasswordEncoder();
    private AccountRepository accounts;
    private AuthServiceImpl service;
    private Account dara;

    @BeforeEach
    void setUp() {
        accounts = mock(AccountRepository.class);
        service = new AuthServiceImpl(accounts, mock(OTPRepository.class), encoder,
                mock(OtpEmailService.class), 60, 5);

        dara = Account.builder()
                .accountId(12)
                .userName("dara")
                .userPwd(encoder.encode("Temp-Pass-1"))
                .email("dara@company.com")
                .status("ACTIVE")
                .isFirstLogin(true)
                .employeeId(5)
                .role(Role.builder().roleId(3).roleName("HR_STAFF").build())
                .build();
        when(accounts.findByUserName("dara")).thenReturn(Optional.of(dara));
        when(accounts.findById(12)).thenReturn(Optional.of(dara));
        when(accounts.save(any(Account.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static ChangePasswordRequest change(String userName, String oldPassword, String newPassword) {
        ChangePasswordRequest r = new ChangePasswordRequest();
        r.setUserName(userName);
        r.setOldPassword(oldPassword);
        r.setNewPassword(newPassword);
        return r;
    }

    // ---- change password ----

    @Test
    void changePassword_savesNewHashAndClearsFirstLogin() {
        AuthenticatedUserResponse user = service.changePassword(change("dara", "Temp-Pass-1", "My-New-Pass-2"));

        assertThat(encoder.matches("My-New-Pass-2", dara.getUserPwd())).isTrue();
        assertThat(dara.getIsFirstLogin()).isFalse();
        verify(accounts).save(dara);
        assertThat(user.accountId()).isEqualTo(12);
        assertThat(user.userName()).isEqualTo("dara");
        assertThat(user.role()).isEqualTo("HR_STAFF");
        assertThat(user.employeeId()).isEqualTo(5);
        assertThat(user.isFirstLogin()).isFalse();
    }

    @Test
    void changePassword_rejectsWrongOldPassword() {
        assertThatThrownBy(() -> service.changePassword(change("dara", "wrong-old", "My-New-Pass-2")))
                .isInstanceOfSatisfying(AuthException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        assertThat(encoder.matches("Temp-Pass-1", dara.getUserPwd())).isTrue();
        verify(accounts, never()).save(any());
    }

    @Test
    void changePassword_rejectsNewPasswordShorterThan8() {
        assertThatThrownBy(() -> service.changePassword(change("dara", "Temp-Pass-1", "Short-7")))
                .isInstanceOfSatisfying(AuthException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(accounts, never()).save(any());
    }

    @Test
    void changePassword_acceptsNewPasswordOfExactly8() {
        service.changePassword(change("dara", "Temp-Pass-1", "Exactly8"));

        assertThat(encoder.matches("Exactly8", dara.getUserPwd())).isTrue();
    }

    @Test
    void changePassword_rejectsBlankNewPassword() {
        assertThatThrownBy(() -> service.changePassword(change("dara", "Temp-Pass-1", "          ")))
                .isInstanceOfSatisfying(AuthException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(accounts, never()).save(any());
    }

    @Test
    void changePassword_rejectsSamePasswordAsOld() {
        assertThatThrownBy(() -> service.changePassword(change("dara", "Temp-Pass-1", "Temp-Pass-1")))
                .isInstanceOfSatisfying(AuthException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(accounts, never()).save(any());
    }

    @Test
    void changePassword_unknownAccountIsUnauthorized() {
        when(accounts.findByUserName("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.changePassword(change("ghost", "x", "My-New-Pass-2")))
                .isInstanceOfSatisfying(AuthException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    // ---- current user (GET /api/auth/me) ----

    @Test
    void currentUser_returnsLatestAccountDetails() {
        dara.setIsFirstLogin(false);
        dara.setRole(Role.builder().roleId(2).roleName("HR_MANAGER").build());

        AuthenticatedUserResponse user = service.currentUser(12);

        assertThat(user.accountId()).isEqualTo(12);
        assertThat(user.userName()).isEqualTo("dara");
        assertThat(user.email()).isEqualTo("dara@company.com");
        assertThat(user.role()).isEqualTo("HR_MANAGER");
        assertThat(user.employeeId()).isEqualTo(5);
        assertThat(user.isFirstLogin()).isFalse();
    }

    @Test
    void currentUser_deletedAccountIsUnauthorized() {
        when(accounts.findById(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.currentUser(99))
                .isInstanceOfSatisfying(AuthException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void currentUser_inactiveAccountIsUnauthorized() {
        dara.setStatus("INACTIVE");

        assertThatThrownBy(() -> service.currentUser(12))
                .isInstanceOfSatisfying(AuthException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }
}
