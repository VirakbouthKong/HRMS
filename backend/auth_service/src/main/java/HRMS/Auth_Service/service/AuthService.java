package HRMS.Auth_Service.service;

import HRMS.Auth_Service.dto.request.ChangePasswordRequest;
import HRMS.Auth_Service.dto.request.LoginRequest;
import HRMS.Auth_Service.dto.request.ResetPasswordRequest;
import HRMS.Auth_Service.dto.request.VerifyOTPRequest;
import HRMS.Auth_Service.dto.response.ApiResponse;
import HRMS.Auth_Service.dto.response.AuthenticatedUserResponse;

public interface AuthService {

    /** Step 1: checks username + password and emails an OTP. Throws AuthException on failure. */
    ApiResponse login(LoginRequest request);

    /** Step 2 (called by the API Gateway only): checks the OTP and returns the user for the JWT. */
    AuthenticatedUserResponse verifyOTP(VerifyOTPRequest request);

    /**
     * Called by the API Gateway only, with the userName taken from the caller's JWT.
     * Returns the updated user so the gateway can issue a fresh token. Throws AuthException on failure.
     */
    AuthenticatedUserResponse changePassword(ChangePasswordRequest request);

    /** Called by the API Gateway only (GET /api/auth/me). Throws AuthException(401) if the account is gone or inactive. */
    AuthenticatedUserResponse currentUser(Integer accountId);

    ApiResponse resetPassword(ResetPasswordRequest request);
}
