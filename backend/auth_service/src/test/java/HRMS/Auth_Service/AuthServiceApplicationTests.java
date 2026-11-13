package HRMS.Auth_Service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertySource;

import static org.assertj.core.api.Assertions.assertThat;

// INTERNAL_API_KEY normally comes from Docker Compose (backend/.env); give the test its own value.
@SpringBootTest(properties = "app.internal-api-key=test-internal-key")
class AuthServiceApplicationTests {

	@Autowired
	ConfigurableEnvironment env;

	@Test
	void contextLoads() {
	}

	/** Normal settings live in backend/config-repo/auth-service.yml, not in this service. */
	@Test
	void settingsComeFromConfigRepo() {
		assertThat(env.getProperty("spring.application.name")).isEqualTo("auth-service");
		assertThat(sourceOf("server.port")).contains("auth-service.yml");
		assertThat(sourceOf("app.otp.max-attempts")).contains("auth-service.yml");
		assertThat(env.getProperty("app.otp.max-attempts")).isEqualTo("5");
	}

	private String sourceOf(String key) {
		return env.getPropertySources().stream().filter(p -> !p.getName().equals("configurationProperties")) // summary of all sources
				.filter(p -> p.containsProperty(key))
				.map(PropertySource::getName).findFirst().orElse("none");
	}
}
