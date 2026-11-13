package com.example.hr.gateway.auth;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AccountControllerTest {

    private static final String DARA_AFTER_CHANGE = """
            {"accountId":12,"userName":"dara","email":"dara@company.com","role":"HR_STAFF",
             "employeeId":5,"isFirstLogin":false}""";

    private final FakeAuthService auth = new FakeAuthService();
    private final AccountController controller = new AccountController(TestTokens.tokenService(), auth.webClient());

    private final Jwt daraFirstLogin = TestTokens.principal(12, "dara", "HR_STAFF", true);

    // ---- PUT /api/auth/change-password ----

    @Test
    void changePassword_sendsUserNameFromTokenToAuth() {
        auth.replies(HttpStatus.OK, DARA_AFTER_CHANGE);

        controller.changePassword(daraFirstLogin,
                new AccountController.ChangePasswordRequest("Temp-Pass-1", "My-New-Pass-2")).block();

        assertThat(auth.sentMethod).isEqualTo(HttpMethod.PUT);
        assertThat(auth.sentPath).isEqualTo("/api/internal/auth/change-password");
        assertThat(auth.sentBody)
                .contains("\"userName\":\"dara\"")
                .contains("\"oldPassword\":\"Temp-Pass-1\"")
                .contains("\"newPassword\":\"My-New-Pass-2\"");
    }

    @Test
    void changePassword_returnsFreshTokenWithoutTheChangeRequiredFlag() {
        auth.replies(HttpStatus.OK, DARA_AFTER_CHANGE);

        ResponseEntity<Object> response = controller.changePassword(daraFirstLogin,
                new AccountController.ChangePasswordRequest("Temp-Pass-1", "My-New-Pass-2")).block();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        TokenController.TokenResponse body = (TokenController.TokenResponse) response.getBody();
        assertThat(body.isFirstLogin()).isFalse();
        Jwt newToken = TestTokens.decode(body.token());
        assertThat(newToken.getSubject()).isEqualTo("12");
        assertThat(newToken.hasClaim("pwdChangeRequired")).isFalse();
    }

    @Test
    void changePassword_passesAuthErrorBack() {
        auth.replies(HttpStatus.BAD_REQUEST, "{\"success\":false,\"message\":\"Old password is incorrect.\"}");

        ResponseEntity<Object> response = controller.changePassword(daraFirstLogin,
                new AccountController.ChangePasswordRequest("wrong", "My-New-Pass-2")).block();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(((Map<?, ?>) response.getBody()).get("message")).isEqualTo("Old password is incorrect.");
    }

    @Test
    void changePassword_missingFieldsIsBadRequestWithoutCallingAuth() {
        ResponseEntity<Object> response = controller.changePassword(daraFirstLogin,
                new AccountController.ChangePasswordRequest("Temp-Pass-1", null)).block();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(auth.sentPath).isNull();
    }

    @Test
    void changePassword_authDownIs503() {
        auth.isDown();

        ResponseEntity<Object> response = controller.changePassword(daraFirstLogin,
                new AccountController.ChangePasswordRequest("Temp-Pass-1", "My-New-Pass-2")).block();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    // ---- GET /api/auth/me ----

    @Test
    void me_asksAuthForTheAccountInTheToken() {
        auth.replies(HttpStatus.OK, DARA_AFTER_CHANGE);

        controller.me(daraFirstLogin).block();

        assertThat(auth.sentMethod).isEqualTo(HttpMethod.GET);
        assertThat(auth.sentPath).isEqualTo("/api/internal/auth/accounts/12");
    }

    @Test
    void me_returnsCurrentDetailsFromAuth() {
        auth.replies(HttpStatus.OK, """
                {"accountId":12,"userName":"dara","email":"dara@company.com","role":"HR_MANAGER",
                 "employeeId":5,"isFirstLogin":false}""");

        ResponseEntity<Object> response = controller.me(daraFirstLogin).block();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        AccountController.MeResponse me = (AccountController.MeResponse) response.getBody();
        assertThat(me.success()).isTrue();
        assertThat(me.accountId()).isEqualTo(12);
        assertThat(me.userName()).isEqualTo("dara");
        assertThat(me.email()).isEqualTo("dara@company.com");
        assertThat(me.role()).isEqualTo("HR_MANAGER"); // the role now, not the one in the token
        assertThat(me.employeeId()).isEqualTo(5);
        assertThat(me.isFirstLogin()).isFalse();
    }

    @Test
    void me_deletedOrInactiveAccountIs401() {
        auth.replies(HttpStatus.UNAUTHORIZED,
                "{\"success\":false,\"message\":\"This account no longer exists or is inactive. Please log in again.\"}");

        ResponseEntity<Object> response = controller.me(daraFirstLogin).block();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void me_authDownIs503() {
        auth.isDown();

        ResponseEntity<Object> response = controller.me(daraFirstLogin).block();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }
}
