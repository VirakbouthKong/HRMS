package com.example.hr.gateway.security;

import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationResult;
import org.springframework.security.authorization.ReactiveAuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.server.authorization.AuthorizationContext;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.Optional;
import java.util.Set;

/**
 * Applies the configured access rules: the first matching rule decides which roles may call a path;
 * a path with no rule needs any valid token. A missing token is never granted (the gateway answers 401).
 */
@Component
public class ConfigAccessManager implements ReactiveAuthorizationManager<AuthorizationContext> {

    private final AccessRulesHolder rules;

    public ConfigAccessManager(AccessRulesHolder rules) {
        this.rules = rules;
    }

    @Override
    public Mono<AuthorizationResult> authorize(Mono<Authentication> authentication, AuthorizationContext context) {
        var request = context.getExchange().getRequest();
        Optional<Set<String>> allowed = rules.current()
                .decide(request.getMethod(), request.getPath().pathWithinApplication().value());
        return authentication
                .filter(Authentication::isAuthenticated)
                .map(auth -> (AuthorizationResult) new AuthorizationDecision(
                        allowed.map(roles -> hasAnyRole(auth, roles)).orElse(true)))
                .defaultIfEmpty(new AuthorizationDecision(false));
    }

    private static boolean hasAnyRole(Authentication auth, Set<String> roles) {
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a.startsWith("ROLE_") && roles.contains(a.substring("ROLE_".length())));
    }
}
