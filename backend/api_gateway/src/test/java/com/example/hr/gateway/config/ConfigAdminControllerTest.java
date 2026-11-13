package com.example.hr.gateway.config;

import com.example.hr.gateway.security.AccessRuleProperties;
import com.example.hr.gateway.security.AccessRulesHolder;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.event.RefreshRoutesEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;

class ConfigAdminControllerTest {

    private static AccessRuleProperties.Rule rule(String path, String role) {
        AccessRuleProperties.Rule r = new AccessRuleProperties.Rule();
        r.setPaths(new ArrayList<>(List.of(path)));
        r.setRoles(new ArrayList<>(List.of(role)));
        return r;
    }

    private final AccessRuleProperties properties = new AccessRuleProperties();
    private final AccessRulesHolder holder;

    /** Records route rebuilds, and which rules were in force at that moment. */
    private final List<Object> published = new ArrayList<>();
    private final List<Optional<Set<String>>> demoRuleWhenRoutesRebuilt = new ArrayList<>();
    private final ApplicationEventPublisher publisher = event -> {
        published.add(event);
        demoRuleWhenRoutesRebuilt.add(holder().current().decide(HttpMethod.GET, "/api/demo/x"));
    };

    ConfigAdminControllerTest() {
        properties.setAccessRules(new ArrayList<>(List.of(rule("/api/report/**", "HR_STAFF"))));
        holder = new AccessRulesHolder(properties);
    }

    private AccessRulesHolder holder() {
        return holder;
    }

    @Test
    void refreshReportsTheChangedKeysSorted() {
        Supplier<Set<String>> refresher = () -> Set.of("frontend.features.payroll", "app.access-rules[0].roles[0]");

        ResponseEntity<Map<String, Object>> response = new ConfigAdminController(refresher, holder, publisher).refresh();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("success", true);
        assertThat(response.getBody().get("changed"))
                .isEqualTo(List.of("app.access-rules[0].roles[0]", "frontend.features.payroll"));
    }

    @Test
    void validRefreshRebuildsRoutesOnlyAfterTheNewRulesAreInForce() {
        Supplier<Set<String>> refresher = () -> {
            properties.setAccessRules(List.of(rule("/api/demo/**", "ADMIN"))); // what Spring's rebinding does
            return Set.of("app.access-rules[0].paths[0]");
        };

        new ConfigAdminController(refresher, holder, publisher).refresh();

        assertThat(published).hasSize(1).first().isInstanceOf(RefreshRoutesEvent.class);
        // no window where a new route is live without its rule
        assertThat(demoRuleWhenRoutesRebuilt).containsExactly(Optional.of(Set.of("ADMIN")));
    }

    @Test
    void refusedRefreshDoesNotRebuildRoutes() {
        Supplier<Set<String>> refresher = () -> {
            properties.setAccessRules(List.of(rule("/api/salary/**", "ADMN")));   // typo
            return Set.of("app.access-rules[0].roles[0]", "spring.cloud.gateway.server.webflux.routes[8].id");
        };

        ResponseEntity<Map<String, Object>> response = new ConfigAdminController(refresher, holder, publisher).refresh();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat((String) response.getBody().get("message")).contains("ADMN").contains("previous");
        assertThat(published).isEmpty();   // the new route does NOT go live
        assertThat(holder.current().decide(HttpMethod.GET, "/api/report/x")).contains(Set.of("HR_STAFF"));
    }
}
