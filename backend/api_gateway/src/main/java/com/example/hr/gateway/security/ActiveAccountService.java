package com.example.hr.gateway.security;

import com.example.hr.gateway.auth.TokenController;
import com.example.hr.gateway.auth.TokenService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
public class ActiveAccountService {
    private final WebClient auth;
    public ActiveAccountService(@Qualifier("authWebClient") WebClient auth) { this.auth = auth; }
    public Mono<Boolean> isActive(Jwt jwt) {
        return auth.get().uri("/api/internal/auth/accounts/{id}", jwt.getSubject()).exchangeToMono(response -> {
            if (response.statusCode().value() == 401 || response.statusCode().value() == 404) return Mono.just(false);
            if (!response.statusCode().is2xxSuccessful()) return Mono.error(new IllegalStateException("Account validation unavailable"));
            return response.bodyToMono(TokenController.AuthenticatedUser.class).map(account ->
                    java.util.Objects.equals(account.userName(), jwt.getClaimAsString("username"))
                    && jwt.getClaimAsStringList("roles") != null
                    && jwt.getClaimAsStringList("roles").contains(account.role())
                    && (!Boolean.TRUE.equals(account.isFirstLogin()) || Boolean.TRUE.equals(jwt.getClaimAsBoolean(TokenService.PASSWORD_CHANGE_REQUIRED_CLAIM))));
        }).defaultIfEmpty(false).timeout(java.time.Duration.ofSeconds(5));
    }
}
