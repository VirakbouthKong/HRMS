package com.example.hr.gateway.security;

import com.example.hr.gateway.auth.TokenService;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

/**
 * A user who logs in with a password set by the admin (first login, or after a reset) gets a token
 * marked "pwdChangeRequired". With that token they may only change their password, call /me or view
 * their own photo;
 * everything else is refused until they do. Changing the password returns a new, unmarked token.
 */
public class PasswordChangeRequiredFilter implements WebFilter {

    private static final byte[] BLOCKED_BODY = ("{\"success\":false,\"code\":\"PASSWORD_CHANGE_REQUIRED\","
            + "\"message\":\"Please change your password before using the system.\"}")
            .getBytes(StandardCharsets.UTF_8);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .filter(JwtAuthenticationToken.class::isInstance)
                .map(auth -> Boolean.TRUE.equals(((JwtAuthenticationToken) auth).getToken()
                        .getClaimAsBoolean(TokenService.PASSWORD_CHANGE_REQUIRED_CLAIM)))
                .defaultIfEmpty(false)
                .flatMap(mustChange -> mustChange && !isAllowed(exchange.getRequest())
                        ? block(exchange.getResponse())
                        : chain.filter(exchange));
    }

    private static boolean isAllowed(ServerHttpRequest request) {
        String path = request.getPath().pathWithinApplication().value();
        HttpMethod method = request.getMethod();
        return (HttpMethod.PUT.equals(method) && path.equals("/api/auth/change-password"))
                || (HttpMethod.GET.equals(method) && (path.equals("/api/auth/me") || path.equals("/api/auth/me/photo")));
    }

    private static Mono<Void> block(ServerHttpResponse response) {
        response.setStatusCode(HttpStatus.FORBIDDEN);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        DataBuffer buffer = response.bufferFactory().wrap(BLOCKED_BODY);
        return response.writeWith(Mono.just(buffer));
    }
}
