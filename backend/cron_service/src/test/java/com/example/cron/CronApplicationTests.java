package com.example.cron;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "internal.api.key=test-internal-key")
class CronApplicationTests {

    @Autowired
    ConfigurableEnvironment env;

    @Test
    void contextLoads() {
    }

    /** Normal settings live in backend/config-repo/cron-service.yml, not in this service. */
    @Test
    void settingsComeFromConfigRepo() {
        assertThat(env.getProperty("spring.application.name")).isEqualTo("cron-service");
        assertThat(sourceOf("server.port")).contains("cron-service.yml");
        assertThat(sourceOf("operation.service.base-url")).contains("cron-service.yml");
    }

    private String sourceOf(String key) {
        return env.getPropertySources().stream().filter(p -> !p.getName().equals("configurationProperties")) // summary of all sources
				.filter(p -> p.containsProperty(key))
                .map(PropertySource::getName).findFirst().orElse("none");
    }
}
