package com.example.hr.gateway.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/** HTTP client for the Auth service's /api/internal/** endpoints, which need the internal API key. */
@Configuration
public class AuthClientConfig {

    @Bean
    WebClient authWebClient(@Value("${app.auth-service-url}") String authServiceUrl,
                            @Value("${app.internal-api-key}") String internalApiKey) {
        return configure(WebClient.builder(), authServiceUrl, internalApiKey);
    }

    /** Profile photos are up to 3 MB; the default 256 KB buffer would refuse to pass them back. */
    static final int MAX_RESPONSE_BYTES = 4 * 1024 * 1024;

    static WebClient configure(WebClient.Builder builder, String authServiceUrl, String internalApiKey) {
        return builder
                .baseUrl(authServiceUrl)
                .defaultHeader("X-Internal-Api-Key", internalApiKey)
                .codecs(codecs -> codecs.defaultCodecs().maxInMemorySize(MAX_RESPONSE_BYTES))
                .build();
    }
}
