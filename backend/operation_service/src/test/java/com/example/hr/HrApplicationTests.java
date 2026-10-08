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

	@Test
	void contextLoads() {
	}

}
