package com.example.hr.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

/** Serves the real files in backend/config-repo, as Docker does. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.cloud.config.server.native.search-locations=file:../config-repo")
class ConfigServerApplicationTests {

    /** Keys whose values are secrets: they must never appear in config-repo, only as ${PLACEHOLDERS}. */
    private static final List<String> SECRET_KEYS = List.of("DB_URL", "DB_USERNAME", "DB_PASSWORD",
            "SPRING_DATASOURCE_URL", "SPRING_DATASOURCE_USERNAME", "SPRING_DATASOURCE_PASSWORD",
            "INTERNAL_API_KEY", "MAIL_USERNAME", "MAIL_PASSWORD", "BOOTSTRAP_ADMIN_PASSWORD");

    @LocalServerPort
    int port;

    private String get(String path) {
        return RestClient.create("http://localhost:" + port).get().uri(path).retrieve().body(String.class);
    }

    @Test
    void servesGatewayRoutesForDocker() {
        String body = get("/api-gateway/docker");

        assertThat(body).contains("spring.cloud.gateway.server.webflux.routes[0].id");
        assertThat(body).contains("http://auth-service:8081");   // Docker override
        assertThat(body).contains("app.access-rules[0].roles[0]");
    }

    @Test
    void servesFrontendSettings() {
        assertThat(get("/frontend/default")).contains("frontend.endpoints.myPhoto");
    }

    @Test
    void servesEveryService() {
        for (String app : List.of("auth-service", "operation-service", "report-service", "cron-service")) {
            assertThat(get("/" + app + "/docker")).as(app).contains(app + ".yml");
        }
    }

    @Test
    void containsNoSecretValues() throws IOException {
        StringBuilder all = new StringBuilder();
        for (String app : List.of("api-gateway", "auth-service", "operation-service", "report-service",
                "cron-service", "frontend")) {
            all.append(get("/" + app + "/docker"));
        }
        for (String service : List.of("auth_service", "operation_service", "report_service", "cron_service")) {
            Path env = Path.of("..", service, ".env");
            if (!Files.exists(env)) {
                continue;
            }
            Properties secrets = new Properties();
            try (var in = Files.newBufferedReader(env)) {
                secrets.load(in);
            }
            for (String key : SECRET_KEYS) {
                String value = secrets.getProperty(key);
                if (value != null && value.length() >= 6) {
                    assertThat(all.toString()).as(service + " " + key).doesNotContain(value);
                }
            }
        }
    }
}
