package com.example.hr.common.security;

import com.example.hr.employee.exception.EmployeeNotLinkedException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CurrentEmployeeTest {

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private static void loginWith(Jwt.Builder jwt) {
        Jwt token = jwt.header("alg", "RS256").issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(token));
    }

    @Test
    void returnsTheEmployeeIdClaim() {
        loginWith(Jwt.withTokenValue("t").subject("12").claim("employeeId", 18));

        assertThat(CurrentEmployee.id()).isEqualTo(18);
    }

    @Test
    void neverFallsBackToTheAccountId() {
        // sysadmin: account 4, no employee. Account 4 is NOT employee 4.
        loginWith(Jwt.withTokenValue("t").subject("4"));

        assertThatThrownBy(CurrentEmployee::id).isInstanceOf(EmployeeNotLinkedException.class);
    }

    @Test
    void noLoginIsNotLinked() {
        assertThatThrownBy(CurrentEmployee::id).isInstanceOf(EmployeeNotLinkedException.class);
    }

    @Test
    void garbageClaimIsNotLinked() {
        loginWith(Jwt.withTokenValue("t").subject("4").claim("employeeId", "abc"));

        assertThatThrownBy(CurrentEmployee::id).isInstanceOf(EmployeeNotLinkedException.class);
    }

    @Test
    void orNullGivesNullInsteadOfThrowing() {
        loginWith(Jwt.withTokenValue("t").subject("4"));

        assertThat(CurrentEmployee.idOrNull()).isNull();
    }
}
