package com.example.hr.gateway.security;

import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.*;
import reactor.core.publisher.Mono;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Component
@Order(-90) // After Spring Security authentication/authorization, before controllers and routed requests.
public class ActiveAccountFilter implements WebFilter {
    private final ActiveAccountService accounts;
    public ActiveAccountFilter(ActiveAccountService accounts) { this.accounts = accounts; }
    @Override public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        return exchange.getPrincipal().ofType(JwtAuthenticationToken.class)
                .map(a -> Optional.of(a.getToken())).defaultIfEmpty(Optional.empty()).flatMap(jwt -> {
                    if (jwt.isEmpty()) return chain.filter(exchange);
                    return accounts.isActive(jwt.get()).map(active -> active ? HttpStatus.OK : HttpStatus.UNAUTHORIZED)
                            .onErrorReturn(HttpStatus.SERVICE_UNAVAILABLE).flatMap(status -> {
                                if (status == HttpStatus.OK) return chain.filter(exchange);
                                exchange.getResponse().setStatusCode(status);
                                exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
                                String message = status == HttpStatus.UNAUTHORIZED ? "Account or permissions changed. Please log in again." : "Account validation is temporarily unavailable.";
                                byte[] bytes = ("{\"success\":false,\"message\":\"" + message + "\"}").getBytes(StandardCharsets.UTF_8);
                                return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(bytes)));
                            });
                });
    }
}
