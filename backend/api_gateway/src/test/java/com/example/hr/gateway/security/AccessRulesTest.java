package com.example.hr.gateway.security;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AccessRulesTest {

    static AccessRuleProperties.Rule rule(List<String> paths, List<String> methods, List<String> roles) {
        AccessRuleProperties.Rule r = new AccessRuleProperties.Rule();
        r.setPaths(paths);
        r.setMethods(methods);
        r.setRoles(roles);
        return r;
    }

    /** The rules that were Java code in SecurityConfig before, as written in config-repo/api-gateway.yml. */
    static List<AccessRuleProperties.Rule> todaysRules() {
        return List.of(
                rule(List.of("/api/auth/reset-password"), List.of("PUT"), List.of("ADMIN")),
                rule(List.of("/api/accounts/**", "/api/roles/**"), List.of(), List.of("ADMIN")),
                rule(List.of("/api/report/**"), List.of(), List.of("ADMIN", "HR_MANAGER", "HR_STAFF")),
                rule(List.of("/api/v1/jobs/history"), List.of("GET"), List.of("ADMIN", "HR_MANAGER")),
                rule(List.of("/api/v1/jobs/**"), List.of(), List.of("ADMIN")));
    }

    private final AccessRules.CompiledRules rules = AccessRules.compile(todaysRules());

    @Test
    void resetPasswordIsAdminOnlyForPut() {
        assertThat(rules.decide(HttpMethod.PUT, "/api/auth/reset-password")).contains(Set.of("ADMIN"));
    }

    @Test
    void accountsAndRolesAreAdminOnlyForEveryMethod() {
        assertThat(rules.decide(HttpMethod.GET, "/api/accounts/3")).contains(Set.of("ADMIN"));
        assertThat(rules.decide(HttpMethod.DELETE, "/api/roles/7")).contains(Set.of("ADMIN"));
        assertThat(rules.decide(HttpMethod.GET, "/api/accounts")).contains(Set.of("ADMIN"));
    }

    @Test
    void reportsAreForHrRoles() {
        assertThat(rules.decide(HttpMethod.GET, "/api/report/dashboard"))
                .contains(Set.of("ADMIN", "HR_MANAGER", "HR_STAFF"));
    }

    @Test
    void jobHistoryGetIsAdminOrManager_firstMatchWins() {
        assertThat(rules.decide(HttpMethod.GET, "/api/v1/jobs/history")).contains(Set.of("ADMIN", "HR_MANAGER"));
    }

    @Test
    void otherJobCallsAreAdminOnly() {
        assertThat(rules.decide(HttpMethod.POST, "/api/v1/jobs/MonthlyPayrollJob/trigger")).contains(Set.of("ADMIN"));
        assertThat(rules.decide(HttpMethod.POST, "/api/v1/jobs/history")).contains(Set.of("ADMIN"));
    }

    @Test
    void pathWithoutRuleNeedsOnlyALogin() {
        assertThat(rules.decide(HttpMethod.GET, "/api/employees")).isEqualTo(Optional.empty());
        assertThat(rules.decide(HttpMethod.GET, "/api/auth/reset-password")).isEqualTo(Optional.empty());
    }

    @Test
    void unknownRoleIsRefused() {
        assertThatThrownBy(() -> AccessRules.compile(List.of(rule(List.of("/api/x/**"), List.of(), List.of("BOSS")))))
                .isInstanceOf(InvalidAccessRulesException.class).hasMessageContaining("BOSS");
    }

    @Test
    void emptyRoleListIsRefused() {
        assertThatThrownBy(() -> AccessRules.compile(List.of(rule(List.of("/api/x/**"), List.of(), List.of()))))
                .isInstanceOf(InvalidAccessRulesException.class).hasMessageContaining("roles");
    }

    @Test
    void emptyPathListIsRefused() {
        assertThatThrownBy(() -> AccessRules.compile(List.of(rule(List.of(), List.of(), List.of("ADMIN")))))
                .isInstanceOf(InvalidAccessRulesException.class).hasMessageContaining("paths");
    }

    @Test
    void unknownMethodIsRefused() {
        assertThatThrownBy(() -> AccessRules.compile(List.of(rule(List.of("/api/x"), List.of("FETCH"), List.of("ADMIN")))))
                .isInstanceOf(InvalidAccessRulesException.class).hasMessageContaining("FETCH");
    }

    @Test
    void invalidPathPatternIsRefused() {
        assertThatThrownBy(() -> AccessRules.compile(List.of(rule(List.of("/api/**/x"), List.of(), List.of("ADMIN")))))
                .isInstanceOf(InvalidAccessRulesException.class).hasMessageContaining("/api/**/x");
        assertThatThrownBy(() -> AccessRules.compile(List.of(rule(List.of("api/x"), List.of(), List.of("ADMIN")))))
                .isInstanceOf(InvalidAccessRulesException.class).hasMessageContaining("api/x");
    }
}
