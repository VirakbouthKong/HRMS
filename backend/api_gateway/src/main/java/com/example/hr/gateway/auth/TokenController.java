package com.example.hr.gateway.auth;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * Login step 2. The gateway is the only place that creates JWTs:
 * it asks Auth whether the OTP is correct and, if so, signs a token.
 * (Step 1, POST /api/auth/login, is forwarded to Auth unchanged and emails the OTP.)
 */
@RestController
public class TokenController {

    private static final Logger log = LoggerFactory.getLogger(TokenController.class);

    private final TokenService tokenService;
    private final RSAKey rsaKey;
    private final WebClient authClient;

    public TokenController(TokenService tokenService, RSAKey rsaKey,
                           @Qualifier("authWebClient") WebClient authClient) {
        this.tokenService = tokenService;
        this.rsaKey = rsaKey;
        this.authClient = authClient;
    }

    @Operation(tags = "Login", summary = "Step 2: verify the OTP and get a JWT",
            description = "Copy `token` from the response, click Authorize and paste it. If `isFirstLogin` is "
                    + "true, the token only allows PUT /api/auth/change-password and GET /api/auth/me "
                    + "until the password is changed.")
    @SecurityRequirements
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Token issued",
                    content = @Content(schema = @Schema(implementation = TokenResponse.class))),
            @ApiResponse(responseCode = "401", description = "Wrong, used or expired OTP (shows attempts left)"),
            @ApiResponse(responseCode = "403", description = "Account inactive or has no role"),
            @ApiResponse(responseCode = "503", description = "Auth service unavailable")
    })
    @PostMapping("/api/auth/verify-otp")
    public Mono<ResponseEntity<Object>> verifyOtp(@RequestBody VerifyOtpRequest request) {
        if (request == null || isBlank(request.userName()) || isBlank(request.otpCode())) {
            return Mono.just(AuthReplies.error(HttpStatus.BAD_REQUEST, "userName and otpCode are required."));
        }

        return authClient.post()
                .uri("/api/internal/auth/verify-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchangeToMono(response -> response.statusCode().is2xxSuccessful()
                        ? response.bodyToMono(AuthenticatedUser.class)
                                .map(user -> AuthReplies.token(tokenService, user, "Login successful."))
                        // e.g. "Invalid OTP. 4 attempt(s) left."
                        : AuthReplies.passThrough(response, "OTP verification failed."))
                .onErrorResume(e -> {
                    log.error("Could not reach Auth service for OTP verification", e);
                    return Mono.just(AuthReplies.authUnavailable());
                });
    }

    /** Public key(s) other services use to check our tokens. Contains no private key material. */
    @Operation(tags = "Public key", summary = "Public key used to check tokens (JWKS)",
            description = "Used by the Operation service. Contains no secret.")
    @SecurityRequirements
    @GetMapping(value = "/.well-known/jwks.json", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> jwks() {
        return new JWKSet(rsaKey.toPublicJWK()).toJSONObject();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    public record VerifyOtpRequest(String userName, String otpCode) {
    }

    /** What Auth returns from /api/internal/auth/verify-otp. */
    public record AuthenticatedUser(Integer accountId, String userName, String email, String role,
                                    Integer employeeId, Boolean isFirstLogin) {
    }

    public record TokenResponse(boolean success, String message, String token, String tokenType, long expiresIn,
                                Integer accountId, String userName, String email, String role,
                                Integer employeeId, Boolean isFirstLogin) {
    }
}
