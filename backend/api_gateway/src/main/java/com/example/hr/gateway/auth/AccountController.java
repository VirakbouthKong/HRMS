package com.example.hr.gateway.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * Endpoints about the logged-in user. Who the user is comes from their JWT, never from the request body.
 */
@RestController
public class AccountController {

    private static final Logger log = LoggerFactory.getLogger(AccountController.class);

    private final TokenService tokenService;
    private final WebClient authClient;

    public AccountController(TokenService tokenService, @Qualifier("authWebClient") WebClient authClient) {
        this.tokenService = tokenService;
        this.authClient = authClient;
    }

    @Operation(tags = "My account", summary = "Who am I? Current details of the logged-in user",
            description = "Call this when the app opens to know who is logged in. Details are read from the "
                    + "Auth service now, so a role change shows here (permissions follow at the next login). "
                    + "401 means the token expired or the account was deleted or deactivated: go to the login page.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "The logged-in user",
                    content = @Content(schema = @Schema(implementation = MeResponse.class))),
            @ApiResponse(responseCode = "401", description = "Token expired, or account deleted or inactive"),
            @ApiResponse(responseCode = "503", description = "Auth service unavailable")
    })
    @GetMapping(value = "/api/auth/me", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<ResponseEntity<Object>> me(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return authClient.get()
                .uri("/api/internal/auth/accounts/{accountId}", jwt.getSubject())
                .exchangeToMono(response -> response.statusCode().is2xxSuccessful()
                        ? response.bodyToMono(TokenController.AuthenticatedUser.class)
                                .map(user -> ResponseEntity.<Object>ok(new MeResponse(true, user.accountId(),
                                        user.userName(), user.email(), user.role(), user.employeeId(),
                                        user.isFirstLogin())))
                        : AuthReplies.passThrough(response, "Could not load your account."))
                .onErrorResume(e -> {
                    log.error("Could not reach Auth service for /me", e);
                    return Mono.just(AuthReplies.authUnavailable());
                });
    }

    @Operation(tags = "My account", summary = "Change my password (returns a new token)",
            description = "Changes the password of the logged-in user. Required on first login and after an "
                    + "admin reset: until then every other endpoint answers 403 PASSWORD_CHANGE_REQUIRED. "
                    + "The new password needs at least 8 characters. On success, replace the old token with "
                    + "`token` from the response (click Authorize again in Swagger).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Password changed; new token issued",
                    content = @Content(schema = @Schema(implementation = TokenController.TokenResponse.class))),
            @ApiResponse(responseCode = "400", description = "Old password wrong, or new password too short or unchanged"),
            @ApiResponse(responseCode = "401", description = "Token expired or account no longer exists"),
            @ApiResponse(responseCode = "503", description = "Auth service unavailable")
    })
    @PutMapping(value = "/api/auth/change-password", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<ResponseEntity<Object>> changePassword(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                                       @RequestBody ChangePasswordRequest request) {
        if (request == null || request.oldPassword() == null || request.newPassword() == null) {
            return Mono.just(AuthReplies.error(HttpStatus.BAD_REQUEST, "oldPassword and newPassword are required."));
        }

        Map<String, String> body = Map.of(
                "userName", jwt.getClaimAsString("username"),
                "oldPassword", request.oldPassword(),
                "newPassword", request.newPassword());

        return authClient.put()
                .uri("/api/internal/auth/change-password")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .exchangeToMono(response -> response.statusCode().is2xxSuccessful()
                        ? response.bodyToMono(TokenController.AuthenticatedUser.class)
                                .map(user -> AuthReplies.token(tokenService, user, "Password changed successfully."))
                        : AuthReplies.passThrough(response, "Could not change the password."))
                .onErrorResume(e -> {
                    log.error("Could not reach Auth service to change password", e);
                    return Mono.just(AuthReplies.authUnavailable());
                });
    }

    public record ChangePasswordRequest(
            @Schema(example = "Temp-Pass-1") String oldPassword,
            @Schema(example = "My-New-Pass-2", minLength = 8) String newPassword) {
    }

    public record MeResponse(boolean success, Integer accountId, String userName, String email, String role,
                             Integer employeeId, Boolean isFirstLogin) {
    }
}
