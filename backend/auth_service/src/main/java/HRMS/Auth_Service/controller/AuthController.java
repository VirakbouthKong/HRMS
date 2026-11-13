package HRMS.Auth_Service.controller;

import HRMS.Auth_Service.dto.request.LoginRequest;
import HRMS.Auth_Service.dto.request.ResetPasswordRequest;
import HRMS.Auth_Service.dto.response.ApiResponse;
import HRMS.Auth_Service.exception.AuthException;
import HRMS.Auth_Service.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public auth endpoints, reached through the API Gateway.
 * POST /api/auth/verify-otp, PUT /api/auth/change-password and GET /api/auth/me are handled by the
 * gateway itself (it issues JWTs and knows who is logged in) and call InternalAuthController here.
 */
@Tag(name = "Password", description = "Login step 1, reset password")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /** Step 1 of login: checks the password and emails an OTP. Call again to resend the code. */
    @Operation(summary = "Login step 1: check password and email an OTP",
            description = "No token needed. Sends a 6-digit code (valid 5 minutes) to the account's email. "
                    + "Call again to resend (max once per 60 seconds). Then call POST /api/auth/verify-otp "
                    + "(in '1. Login & Token (Gateway)') to get the JWT.")
    @SecurityRequirements
    @PostMapping("/login")
    public ResponseEntity<ApiResponse> login(
            @Valid @RequestBody LoginRequest request) {

        try {
            return ResponseEntity.ok(authService.login(request));
        } catch (AuthException e) {
            return ResponseEntity.status(e.getStatus()).body(new ApiResponse(false, e.getMessage()));
        }
    }

    @PutMapping("/reset-password")
    public ResponseEntity<ApiResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        ApiResponse response = authService.resetPassword(request);

        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }

        return ResponseEntity.badRequest().body(response);
    }
}
