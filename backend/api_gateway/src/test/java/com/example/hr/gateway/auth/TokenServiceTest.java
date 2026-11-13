package com.example.hr.gateway.auth;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TokenServiceTest {

    private final TokenService tokenService = TestTokens.tokenService();

    @Test
    void firstLoginUser_getsPasswordChangeRequiredClaim() {
        var user = new TokenController.AuthenticatedUser(12, "dara", "dara@company.com", "HR_STAFF", 5, true);

        Jwt jwt = TestTokens.decode(tokenService.issue(user).value());

        assertThat(jwt.getClaimAsBoolean("pwdChangeRequired")).isTrue();
    }

    @Test
    void normalUser_hasNoPasswordChangeRequiredClaim() {
        var user = new TokenController.AuthenticatedUser(12, "dara", "dara@company.com", "HR_STAFF", 5, false);

        Jwt jwt = TestTokens.decode(tokenService.issue(user).value());

        assertThat(jwt.hasClaim("pwdChangeRequired")).isFalse();
        assertThat(jwt.getSubject()).isEqualTo("12");
        assertThat(jwt.getClaimAsString("username")).isEqualTo("dara");
        assertThat(jwt.getClaimAsStringList("roles")).isEqualTo(List.of("HR_STAFF"));
        assertThat(jwt.getClaimAsString("employeeId")).isEqualTo("5");
    }
}
