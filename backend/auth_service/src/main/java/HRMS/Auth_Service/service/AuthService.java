package HRMS.Auth_Service.service;

import HRMS.Auth_Service.dto.request.ChangePasswordRequest;
import HRMS.Auth_Service.dto.request.LoginRequest;
import HRMS.Auth_Service.dto.request.ResetPasswordRequest;
import HRMS.Auth_Service.dto.request.VerifyOTPRequest;
import HRMS.Auth_Service.dto.response.ApiResponse;

public interface AuthService {

    ApiResponse login(LoginRequest request);

    ApiResponse verifyOTP(VerifyOTPRequest request);

    ApiResponse changePassword(ChangePasswordRequest request);

    ApiResponse resetPassword(ResetPasswordRequest request);

}
