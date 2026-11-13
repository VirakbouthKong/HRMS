package com.example.hr.gateway.config;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class PublicConfigControllerTest {

    private static StandardEnvironment environment(Map<String, Object> values) {
        StandardEnvironment env = new StandardEnvironment();
        env.getPropertySources().addFirst(new MapPropertySource("config-repo", values));
        return env;
    }

    @Test
    void returnsTheFrontendSectionAsNestedJson() {
        var env = environment(Map.of(
                "frontend.appName", "HRMS",
                "frontend.endpoints.myPhoto", "/api/auth/me/photo",
                "frontend.limits.photoMaxBytes", "3145728"));

        Map<String, Object> body = new PublicConfigController(env).config();

        assertThat(body).containsEntry("appName", "HRMS");
        assertThat(((Map<?, ?>) body.get("endpoints")).get("myPhoto")).isEqualTo("/api/auth/me/photo");
        assertThat(((Map<?, ?>) body.get("limits")).get("photoMaxBytes")).isEqualTo("3145728");
    }

    @Test
    void neverReturnsAnythingOutsideTheFrontendSection() {
        var env = environment(Map.of(
                "frontend.appName", "HRMS",
                "app.internal-api-key", "super-secret-key",
                "spring.datasource.password", "db-password"));

        Map<String, Object> body = new PublicConfigController(env).config();

        assertThat(body).containsOnlyKeys("appName");
        assertThat(body.toString()).doesNotContain("super-secret-key").doesNotContain("db-password");
    }

    @Test
    void showsTheCurrentValueAfterTheEnvironmentChanges() {
        Map<String, Object> values = new java.util.HashMap<>(Map.of("frontend.features.payroll", "true"));
        var env = environment(values);
        var controller = new PublicConfigController(env);

        values.put("frontend.features.payroll", "false"); // what a config refresh does

        assertThat(((Map<?, ?>) controller.config().get("features")).get("payroll")).isEqualTo("false");
    }

    @Test
    void emptyWhenNoFrontendSection() {
        assertThat(new PublicConfigController(environment(Map.of("x", "y"))).config()).isEmpty();
    }
}
