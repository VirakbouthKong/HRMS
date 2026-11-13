package HRMS.Auth_Service.controller;

import HRMS.Auth_Service.dto.request.ChangePasswordRequest;
import HRMS.Auth_Service.dto.request.VerifyOTPRequest;
import HRMS.Auth_Service.dto.response.ApiResponse;
import HRMS.Auth_Service.exception.AuthException;
import HRMS.Auth_Service.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.function.Supplier;

/**
 * Called only by the API Gateway, with the X-Internal-Api-Key header (see InternalApiKeyFilter).
 * The gateway has already checked the caller's JWT, and it signs any new token itself.
 */
@RestController
@RequestMapping("/api/internal/auth")
public class InternalAuthController {

    private final AuthService authService;

    public InternalAuthController(AuthService authService) {
        this.authService = authService;
    }

    /** Login step 2: on a correct OTP, returns the user's details for the JWT. */
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOTPRequest request) {
        return handle(() -> authService.verifyOTP(request));
    }

    /** userName comes from the caller's JWT (set by the gateway), never from the user. */
    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request) {
        return handle(() -> authService.changePassword(request));
    }

    /** Current details of the logged-in account, for GET /api/auth/me. */
    @GetMapping("/accounts/{accountId}")
    public ResponseEntity<?> currentUser(@PathVariable Integer accountId) {
        return handle(() -> authService.currentUser(accountId));
    }

    private static ResponseEntity<?> handle(Supplier<?> action) {
        try {
            return ResponseEntity.ok(action.get());
        } catch (AuthException e) {
            return ResponseEntity.status(e.getStatus()).body(new ApiResponse(false, e.getMessage()));
        }
    }
}
