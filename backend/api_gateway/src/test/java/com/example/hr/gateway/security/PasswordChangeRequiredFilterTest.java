package com.example.hr.gateway.security;

import com.example.hr.gateway.auth.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordChangeRequiredFilterTest {

    private final PasswordChangeRequiredFilter filter = new PasswordChangeRequiredFilter();

    /** Runs the filter; returns true if the request was allowed to continue. */
    private boolean passes(MockServerWebExchange exchange, Authentication auth) {
        AtomicBoolean continued = new AtomicBoolean(false);
        WebFilterChain chain = ex -> {
            continued.set(true);
            return Mono.empty();
        };
        Mono<Void> result = filter.filter(exchange, chain);
        if (auth != null) {
            result = result.contextWrite(ReactiveSecurityContextHolder.withAuthentication(auth));
        }
        result.block();
        return continued.get();
    }

    private static MockServerWebExchange request(HttpMethod method, String path) {
        return MockServerWebExchange.from(MockServerHttpRequest.method(method, path));
    }

    private static Authentication firstLoginUser() {
        return new JwtAuthenticationToken(TestTokens.principal(12, "dara", "HR_STAFF", true));
    }

    private static Authentication normalUser() {
        return new JwtAuthenticationToken(TestTokens.principal(12, "dara", "HR_STAFF", false));
    }

    @Test
    void firstLoginUser_isBlockedFromOtherEndpoints() {
        MockServerWebExchange exchange = request(HttpMethod.GET, "/api/employees");

        assertThat(passes(exchange, firstLoginUser())).isFalse();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(exchange.getResponse().getBodyAsString().block()).contains("\"code\":\"PASSWORD_CHANGE_REQUIRED\"");
    }

    @Test
    void firstLoginUser_canChangePassword() {
        assertThat(passes(request(HttpMethod.PUT, "/api/auth/change-password"), firstLoginUser())).isTrue();
    }

    @Test
    void firstLoginUser_canAskWhoAmI() {
        assertThat(passes(request(HttpMethod.GET, "/api/auth/me"), firstLoginUser())).isTrue();
    }

    @Test
    void firstLoginUser_canViewOwnPhoto() {
        assertThat(passes(request(HttpMethod.GET, "/api/auth/me/photo"), firstLoginUser())).isTrue();
    }

    @Test
    void firstLoginUser_cannotUploadPhoto() {
        assertThat(passes(request(HttpMethod.PUT, "/api/auth/me/photo"), firstLoginUser())).isFalse();
    }

    @Test
    void firstLoginUser_cannotUseOtherMethodsOnTheAllowedPaths() {
        assertThat(passes(request(HttpMethod.DELETE, "/api/auth/me"), firstLoginUser())).isFalse();
    }

    @Test
    void normalUser_isNotAffected() {
        assertThat(passes(request(HttpMethod.GET, "/api/employees"), normalUser())).isTrue();
    }

    @Test
    void anonymousRequest_isLeftToTheSecurityRules() {
        assertThat(passes(request(HttpMethod.POST, "/api/auth/login"), null)).isTrue();
    }
}
