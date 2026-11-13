package com.example.hr.gateway.security;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.cors.CorsConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

class CorsConfigTest {

    @Test
    void browserFrontendCanReadTheDefaultAvatarHeader() {
        CorsConfiguration config = new SecurityConfig().corsConfigurationSource("http://localhost:5173")
                .getCorsConfiguration(MockServerWebExchange.from(
                        MockServerHttpRequest.method(HttpMethod.GET, "/api/auth/me/photo")
                                .header("Origin", "http://localhost:5173")));

        assertThat(config.getExposedHeaders()).contains("X-Default-Avatar");
    }
}
