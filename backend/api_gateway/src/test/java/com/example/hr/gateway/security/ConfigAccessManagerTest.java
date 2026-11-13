package com.example.hr.gateway.security;

import com.example.hr.gateway.auth.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.security.authorization.AuthorizationResult;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.server.authorization.AuthorizationContext;
import reactor.core.publisher.Mono;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ConfigAccessManagerTest {

    private final AccessRuleProperties properties = new AccessRuleProperties();
    private final AccessRulesHolder holder;
    private final ConfigAccessManager manager;

    ConfigAccessManagerTest() {
        properties.setAccessRules(AccessRulesTest.todaysRules());
        holder = new AccessRulesHolder(properties);
        manager = new ConfigAccessManager(holder);
    }

    private static Authentication user(String role) {
        return new JwtAuthenticationToken(TestTokens.principal(12, "dara", role, false),
                List.of(new SimpleGrantedAuthority("ROLE_" + role)));
    }

    private boolean granted(Authentication auth, HttpMethod method, String path) {
        AuthorizationContext ctx = new AuthorizationContext(
                MockServerWebExchange.from(MockServerHttpRequest.method(method, path)));
        AuthorizationResult result = manager.authorize(auth == null ? Mono.empty() : Mono.just(auth), ctx).block();
        return result != null && result.isGranted();
    }

    @Test
    void employeeCannotReadReports() {
        assertThat(granted(user("EMPLOYEE"), HttpMethod.GET, "/api/report/dashboard")).isFalse();
    }

    @Test
    void hrStaffCanReadReports() {
        assertThat(granted(user("HR_STAFF"), HttpMethod.GET, "/api/report/dashboard")).isTrue();
    }

    @Test
    void anyLoggedInUserMayCallAPathWithoutRule() {
        assertThat(granted(user("EMPLOYEE"), HttpMethod.GET, "/api/employees")).isTrue();
    }

    @Test
    void noLoginIsNeverGranted() {
        assertThat(granted(null, HttpMethod.GET, "/api/employees")).isFalse();
        assertThat(granted(null, HttpMethod.GET, "/api/report/dashboard")).isFalse();
    }

    @Test
    void reloadPicksUpNewRules() {
        AccessRuleProperties.Rule demo = AccessRulesTest.rule(List.of("/api/demo/**"), List.of(), List.of("ADMIN"));
        properties.setAccessRules(List.of(demo));

        assertThat(holder.reload()).isEmpty();
        assertThat(granted(user("EMPLOYEE"), HttpMethod.GET, "/api/demo/x")).isFalse();
        assertThat(granted(user("ADMIN"), HttpMethod.GET, "/api/demo/x")).isTrue();
    }

    @Test
    void invalidReloadKeepsThePreviousRules() {
        properties.setAccessRules(List.of(AccessRulesTest.rule(List.of("/api/report/**"), List.of(), List.of("BOSS"))));

        assertThat(holder.reload()).hasValueSatisfying(error -> assertThat(error).contains("BOSS"));
        assertThat(holder.lastError()).isPresent();
        // still today's rules: EMPLOYEE refused, HR_STAFF allowed
        assertThat(granted(user("EMPLOYEE"), HttpMethod.GET, "/api/report/dashboard")).isFalse();
        assertThat(granted(user("HR_STAFF"), HttpMethod.GET, "/api/report/dashboard")).isTrue();
    }
}
