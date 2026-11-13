package com.example.hr;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://auth.example.test/.well-known/jwks.json",
		"spring.datasource.url=jdbc:h2:mem:hr-app-test;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false",
		"spring.datasource.username=sa",
		"spring.datasource.password=",
		"spring.flyway.enabled=false",
		"spring.jpa.hibernate.ddl-auto=create-drop",
		"app.internal-api-key=test-api-key"
})
class HrApplicationTests {

	@org.springframework.beans.factory.annotation.Autowired
	org.springframework.core.env.ConfigurableEnvironment env;

	@Test
	void contextLoads() {
	}

	/** Normal settings live in backend/config-repo/operation-service.yml, not in this service. */
	@Test
	void settingsComeFromConfigRepo() {
		org.assertj.core.api.Assertions.assertThat(sourceOf("server.port")).contains("operation-service.yml");
		org.assertj.core.api.Assertions.assertThat(sourceOf("app.workday-start")).contains("operation-service.yml");
	}

	private String sourceOf(String key) {
		return env.getPropertySources().stream().filter(p -> !p.getName().equals("configurationProperties")) // summary of all sources
				.filter(p -> p.containsProperty(key))
				.map(org.springframework.core.env.PropertySource::getName).findFirst().orElse("none");
	}
}
