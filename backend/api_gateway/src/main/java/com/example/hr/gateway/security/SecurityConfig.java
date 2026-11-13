package com.example.hr.gateway.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.SecurityWebFiltersOrder;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverter;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.ServerAuthenticationEntryPoint;
import org.springframework.security.web.server.authorization.ServerAccessDeniedHandler;
import org.springframework.security.web.server.context.NoOpServerSecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;

/**
 * Every request through the gateway is checked here before it is forwarded.
 * Operation also checks the token and its own per-endpoint roles; Auth, Report and CRON rely on these rules.
 */
@Configuration
@EnableWebFluxSecurity
@EnableConfigurationProperties(AccessRuleProperties.class)
public class SecurityConfig {

    @Bean
    SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http, ConfigAccessManager configRules) {
        http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
                .logout(ServerHttpSecurity.LogoutSpec::disable)
                .securityContextRepository(NoOpServerSecurityContextRepository.getInstance())
                .cors(Customizer.withDefaults())
                .authorizeExchange(ex -> ex
                        // Public
                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .pathMatchers("/actuator/health", "/.well-known/jwks.json").permitAll()
                        // Swagger UI and API descriptions (calling the endpoints still needs a token)
                        .pathMatchers("/swagger-ui.html", "/swagger-ui/**", "/webjars/**",
                                "/v3/api-docs/**", "/docs/*/v3/api-docs", "/docs/all/openapi.json").permitAll()
                        .pathMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/verify-otp").permitAll()
                        // Frontend settings from the Config Server (config-repo/frontend.yml)
                        .pathMatchers(HttpMethod.GET, "/api/public/config").permitAll()

                        // Never reachable from outside (also not routed)
                        .pathMatchers("/api/internal/**").denyAll()

                        // Reloading routes and rules from the Config Server
                        .pathMatchers("/api/admin/config/**").hasRole("ADMIN")

                        // Everything else: the rules in config-repo/api-gateway.yml (app.access-rules), which
                        // reload without a restart. A path with no rule needs any valid token; Operation then
                        // applies its own @PreAuthorize role checks.
                        .anyExchange().access(configRules))
                // After the rules above: a first-login token may only change the password or call /me.
                .addFilterAfter(new PasswordChangeRequiredFilter(), SecurityWebFiltersOrder.AUTHORIZATION)
                .exceptionHandling(e -> e
                        .authenticationEntryPoint(unauthorized())
                        .accessDeniedHandler(forbidden()))
                .oauth2ResourceServer(oauth2 -> oauth2
                        .authenticationEntryPoint(unauthorized())
                        .accessDeniedHandler(forbidden())
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));

        return http.build();
    }

    /** "roles": ["HR_MANAGER"] in the token becomes the Spring authority ROLE_HR_MANAGER. */
    private static ReactiveJwtAuthenticationConverter jwtAuthenticationConverter() {
        ReactiveJwtAuthenticationConverter converter = new ReactiveJwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            List<String> roles = jwt.getClaimAsStringList("roles");
            return roles == null
                    ? Flux.empty()
                    : Flux.fromIterable(roles).map(role -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + role));
        });
        return converter;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") String allowedOrigins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        // Lets browser JavaScript on another origin read whether a photo is a default avatar.
        config.setExposedHeaders(List.of("X-Default-Avatar"));
        config.setMaxAge(Duration.ofHours(1));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    private static ServerAuthenticationEntryPoint unauthorized() {
        return (exchange, ex) -> writeJson(exchange, HttpStatus.UNAUTHORIZED,
                "Missing, invalid or expired token. Please log in again.");
    }

    private static ServerAccessDeniedHandler forbidden() {
        return (exchange, ex) -> writeJson(exchange, HttpStatus.FORBIDDEN,
                "Your role is not allowed to access this resource.");
    }

    private static Mono<Void> writeJson(ServerWebExchange exchange, HttpStatus status, String message) {
        var response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        byte[] body = ("{\"success\":false,\"message\":\"" + message + "\"}").getBytes(StandardCharsets.UTF_8);
        DataBuffer buffer = response.bufferFactory().wrap(body);
        return response.writeWith(Mono.just(buffer));
    }
}
