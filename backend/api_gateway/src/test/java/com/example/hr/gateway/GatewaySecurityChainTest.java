package com.example.hr.gateway;

import com.example.hr.gateway.auth.TokenController;
import com.example.hr.gateway.auth.TokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.web.reactive.server.WebTestClient;

/**
 * The real gateway (real SecurityConfig, real access rules from config-repo/api-gateway.yml, real tokens).
 * Backend services are not running, so only gateway answers and security decisions are checked.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "INTERNAL_API_KEY=test-internal-key",      // referenced by config-repo/api-gateway.yml
        "app.jwt.key-dir=target/test-jwt-keys"})   // never touch the real key folder
class GatewaySecurityChainTest {

    @LocalServerPort
    int port;

    @Autowired
    TokenService tokens;

    private WebTestClient client() {
        return WebTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    private String token(String role) {
        return tokens.issue(new TokenController.AuthenticatedUser(1, "test_" + role.toLowerCase(),
                "t@hrms.local", role, 18, false)).value();
    }

    @Test
    void refreshWithoutTokenIs401() {
        client().post().uri("/api/admin/config/refresh").exchange().expectStatus().isUnauthorized();
    }

    @Test
    void refreshAsEmployeeIs403() {
        client().post().uri("/api/admin/config/refresh").header("Authorization", "Bearer " + token("EMPLOYEE"))
                .exchange().expectStatus().isForbidden();
    }

    @Test
    void refreshAsHrManagerIs403() {
        client().post().uri("/api/admin/config/refresh").header("Authorization", "Bearer " + token("HR_MANAGER"))
                .exchange().expectStatus().isForbidden();
    }

    @Test
    void refreshAsAdminIs200() {
        client().post().uri("/api/admin/config/refresh").header("Authorization", "Bearer " + token("ADMIN"))
                .exchange().expectStatus().isOk().expectBody().jsonPath("$.success").isEqualTo(true);
    }

    @Test
    void publicConfigNeedsNoTokenAndComesFromFrontendYml() {
        client().get().uri("/api/public/config").exchange()
                .expectStatus().isOk()
                .expectBody().jsonPath("$.endpoints.myPhoto").isEqualTo("/api/auth/me/photo")
                .jsonPath("$.limits.photoMaxBytes").isEqualTo(3145728);
    }

    @Test
    void configRuleFromApiGatewayYmlRefusesEmployeeOnReports() {
        client().get().uri("/api/report/dashboard").header("Authorization", "Bearer " + token("EMPLOYEE"))
                .exchange().expectStatus().isForbidden();
    }

    @Test
    void internalPathsAreBlockedEvenForAdmin() {
        client().get().uri("/api/internal/auth/accounts/1").header("Authorization", "Bearer " + token("ADMIN"))
                .exchange().expectStatus().isForbidden();
    }
}
