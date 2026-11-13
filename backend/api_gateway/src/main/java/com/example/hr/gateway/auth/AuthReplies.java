package com.example.hr.gateway.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.reactive.function.client.ClientResponse;
import reactor.core.publisher.Mono;

import java.util.Map;

/** Turning Auth service replies into gateway responses, shared by the gateway's auth controllers. */
final class AuthReplies {

    private AuthReplies() {
    }

    /** Auth's error (e.g. "Old password is incorrect.") goes back to the caller with the same status. */
    static Mono<ResponseEntity<Object>> passThrough(ClientResponse response, String fallbackMessage) {
        return response.bodyToMono(Object.class)
                .defaultIfEmpty(Map.of("success", false, "message", fallbackMessage))
                .map(body -> ResponseEntity.status(response.statusCode()).body(body));
    }

    static ResponseEntity<Object> authUnavailable() {
        return error(HttpStatus.SERVICE_UNAVAILABLE, "Auth service is unavailable. Please try again later.");
    }

    /** Signs a token for the user and wraps it in the login response the frontend expects. */
    static ResponseEntity<Object> token(TokenService tokenService, TokenController.AuthenticatedUser user,
                                        String message) {
        if (user.role() == null || user.role().isBlank()) {
            return error(HttpStatus.FORBIDDEN, "This account has no role assigned. Please contact your administrator.");
        }
        TokenService.IssuedToken token = tokenService.issue(user);
        return ResponseEntity.ok(new TokenController.TokenResponse(
                true,
                message,
                token.value(),
                "Bearer",
                token.expiresInSeconds(),
                user.accountId(),
                user.userName(),
                user.email(),
                user.role(),
                user.employeeId(),
                user.isFirstLogin()));
    }

    static ResponseEntity<Object> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("success", false, "message", message));
    }
}
