package HRMS.Auth_Service.service.impl;

import HRMS.Auth_Service.dto.request.ChangePasswordRequest;
import HRMS.Auth_Service.dto.request.LoginRequest;
import HRMS.Auth_Service.dto.request.ResetPasswordRequest;
import HRMS.Auth_Service.dto.request.VerifyOTPRequest;
import HRMS.Auth_Service.dto.response.ApiResponse;
import HRMS.Auth_Service.entity.Account;
import HRMS.Auth_Service.entity.OTPVerification;
import HRMS.Auth_Service.exception.ResourceNotFoundException;
import HRMS.Auth_Service.repository.AccountRepository;
import HRMS.Auth_Service.repository.OTPRepository;
import HRMS.Auth_Service.service.AuthService;
import HRMS.Auth_Service.util.OTPGenerator;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class AuthServiceImpl implements AuthService {

    private final AccountRepository accountRepository;
    private final OTPRepository otpRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthServiceImpl(AccountRepository accountRepository,
                           OTPRepository otpRepository,
                           PasswordEncoder passwordEncoder) {
        this.accountRepository = accountRepository;
        this.otpRepository = otpRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public ApiResponse login(LoginRequest request) {

        Optional<Account> optionalAccount =
                accountRepository.findByUserName(request.getUserName());

        if (optionalAccount.isEmpty()) {
            return new ApiResponse(false,
                    "Username does not exist.");
        }

        Account account = optionalAccount.get();

        if (!passwordEncoder.matches(
                request.getPassword(),
                account.getUserPwd())) {

            return new ApiResponse(false,
                    "Wrong password.");
        }

        // Check account status
        if (!"ACTIVE".equalsIgnoreCase(account.getStatus())) {
            return new ApiResponse(false,
                    "Account is inactive.");
        }

        // Check first login
        if (Boolean.TRUE.equals(account.getIsFirstLogin())) {

            Optional<OTPVerification> latestOTP =
                    otpRepository.findTopByAccountOrderByCreatedDateDesc(account);

            if (latestOTP.isPresent()) {

                OTPVerification otp = latestOTP.get();

                boolean notExpired =
                        otp.getExpiredAt().isAfter(LocalDateTime.now());

                boolean notUsed =
                        !Boolean.TRUE.equals(otp.getIsUsed());

                if (notExpired && notUsed) {

                    return new ApiResponse(
                            true,
                            "Existing OTP = " + otp.getOtpCode());
                }
            }

            String otpCode = OTPGenerator.generateOTP();

            OTPVerification otp = OTPVerification.builder()
                    .otpCode(otpCode)
                    .account(account)
                    .build();

            otpRepository.save(otp);

            return new ApiResponse(
                    true,
                    "New OTP generated. OTP = " + otpCode);
        }

        // Login success
        return new ApiResponse(true,
                "Login successful.");
    }


    @Override
    public ApiResponse verifyOTP(VerifyOTPRequest request) {

        Optional<Account> optionalAccount =
                accountRepository.findByUserName(request.getUserName());

        if (optionalAccount.isEmpty()) {
            return new ApiResponse(false, "Account not found.");
        }

        Account account = optionalAccount.get();

        Optional<OTPVerification> optionalOTP =
                otpRepository.findByAccountAndOtpCode(account, request.getOtpCode());

        if (optionalOTP.isEmpty()) {
            return new ApiResponse(false, "Invalid OTP.");
        }

        OTPVerification otp = optionalOTP.get();

        // Check used
        if (Boolean.TRUE.equals(otp.getIsUsed())) {
            return new ApiResponse(false, "OTP already used.");
        }

        // Check expired
        if (otp.getExpiredAt().isBefore(LocalDateTime.now())) {
            return new ApiResponse(false, "OTP expired.");
        }

        // Mark as used
        otp.setIsUsed(true);
        otpRepository.save(otp);

        return new ApiResponse(true, "OTP verified successfully.");
    }

    @Override
    public ApiResponse changePassword(ChangePasswordRequest request) {

        Optional<Account> optionalAccount =
                accountRepository.findByUserName(request.getUserName());

        if (optionalAccount.isEmpty()) {
            return new ApiResponse(false,
                    "Account not found.");
        }

        Account account = optionalAccount.get();

        // Check old password
        if (!passwordEncoder.matches(
                request.getOldPassword(),
                account.getUserPwd())) {

            return new ApiResponse(false,
                    "Old password is incorrect.");
        }

        // Prevent using the same password again
        if (passwordEncoder.matches(
                request.getNewPassword(),
                account.getUserPwd())) {

            return new ApiResponse(false,
                    "New password must be different from the old password.");
        }

        // Update password
        account.setUserPwd(passwordEncoder.encode(request.getNewPassword()));

        // First login completed
        account.setIsFirstLogin(false);

        accountRepository.save(account);

        return new ApiResponse(true,
                "Password changed successfully.");
    }

    @Override
    public ApiResponse resetPassword(ResetPasswordRequest request) {

        Account account = accountRepository.findByUserName(request.getUserName())
                .orElseThrow(() -> new ResourceNotFoundException("Account not found."));

        account.setUserPwd(passwordEncoder.encode(request.getNewPassword()));
        account.setIsFirstLogin(true);

        accountRepository.save(account);

        return new ApiResponse(true, "Password reset successfully.");
    }


}
