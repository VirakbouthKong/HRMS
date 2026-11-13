package HRMS.Auth_Service.service.impl;

import HRMS.Auth_Service.dto.request.ChangePasswordRequest;
import HRMS.Auth_Service.dto.request.LoginRequest;
import HRMS.Auth_Service.dto.request.ResetPasswordRequest;
import HRMS.Auth_Service.dto.request.VerifyOTPRequest;
import HRMS.Auth_Service.dto.response.ApiResponse;
import HRMS.Auth_Service.dto.response.AuthenticatedUserResponse;
import HRMS.Auth_Service.entity.Account;
import HRMS.Auth_Service.entity.OTPVerification;
import HRMS.Auth_Service.exception.AuthException;
import HRMS.Auth_Service.exception.ResourceNotFoundException;
import HRMS.Auth_Service.repository.AccountRepository;
import HRMS.Auth_Service.repository.OTPRepository;
import HRMS.Auth_Service.service.AuthService;
import HRMS.Auth_Service.service.OtpEmailService;
import HRMS.Auth_Service.util.OTPGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);

    /** Must match the expiry set in OTPVerification#onCreate. */
    private static final int OTP_VALID_MINUTES = 5;
    private static final String INVALID_CREDENTIALS = "Invalid username or password.";
    private static final int MIN_PASSWORD_LENGTH = 8;

    private final AccountRepository accountRepository;
    private final OTPRepository otpRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpEmailService otpEmailService;
    private final int resendCooldownSeconds;
    private final int maxAttempts;

    /** Wrong guesses per OTP id. Kept in memory: a restart only resets the counter, the OTP still expires. */
    private final Map<Integer, Integer> failedAttempts = new ConcurrentHashMap<>();

    public AuthServiceImpl(AccountRepository accountRepository,
                           OTPRepository otpRepository,
                           PasswordEncoder passwordEncoder,
                           OtpEmailService otpEmailService,
                           @Value("${app.otp.resend-cooldown-seconds}") int resendCooldownSeconds,
                           @Value("${app.otp.max-attempts}") int maxAttempts) {
        this.accountRepository = accountRepository;
        this.otpRepository = otpRepository;
        this.passwordEncoder = passwordEncoder;
        this.otpEmailService = otpEmailService;
        this.resendCooldownSeconds = resendCooldownSeconds;
        this.maxAttempts = maxAttempts;
    }

    @Override
    public ApiResponse login(LoginRequest request) {

        // Same message for "no such user" and "wrong password", so usernames cannot be guessed.
        Account account = accountRepository.findByUserName(request.getUserName())
                .filter(a -> passwordEncoder.matches(request.getPassword(), a.getUserPwd()))
                .orElseThrow(() -> new AuthException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS));

        if (!"ACTIVE".equalsIgnoreCase(account.getStatus())) {
            throw new AuthException(HttpStatus.FORBIDDEN, "Account is inactive.");
        }

        String maskedEmail = maskEmail(account.getEmail());

        // Calling login again is how the user asks for a new code; limit it to one email per cooldown.
        Optional<OTPVerification> latest = otpRepository.findTopByAccountOrderByCreatedDateDesc(account);
        if (latest.isPresent() && isUsable(latest.get())) {
            long secondsSinceSent = Duration.between(latest.get().getCreatedDate(), LocalDateTime.now()).toSeconds();
            if (secondsSinceSent < resendCooldownSeconds) {
                return new ApiResponse(true,
                        "An OTP was already sent to " + maskedEmail + ". You can request a new one in "
                                + (resendCooldownSeconds - secondsSinceSent) + " seconds.");
            }
        }

        // Only the newest code is valid.
        otpRepository.findUnusedByAccount(account).forEach(old -> {
            old.setIsUsed(true);
            failedAttempts.remove(old.getOtpId());
        });

        OTPVerification otp = otpRepository.save(OTPVerification.builder()
                .otpCode(OTPGenerator.generateOTP())
                .account(account)
                .build());

        try {
            otpEmailService.sendLoginOtp(account.getEmail(), account.getUserName(), otp.getOtpCode(), OTP_VALID_MINUTES);
        } catch (MailException e) {
            log.error("Could not send OTP email for account {}", account.getAccountId(), e);
            otp.setIsUsed(true);
            otpRepository.save(otp);
            throw new AuthException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Could not send the OTP email. Please try again later.");
        }

        return new ApiResponse(true,
                "OTP sent to " + maskedEmail + ". It expires in " + OTP_VALID_MINUTES + " minutes.");
    }

    @Override
    public AuthenticatedUserResponse verifyOTP(VerifyOTPRequest request) {

        String retry = "Invalid or expired OTP. Please log in again to get a new code.";

        Account account = accountRepository.findByUserName(request.getUserName())
                .orElseThrow(() -> new AuthException(HttpStatus.UNAUTHORIZED, retry));

        OTPVerification otp = otpRepository.findTopByAccountOrderByCreatedDateDesc(account)
                .filter(this::isUsable)
                .orElseThrow(() -> new AuthException(HttpStatus.UNAUTHORIZED, retry));

        if (!constantTimeEquals(otp.getOtpCode(), request.getOtpCode())) {
            int attempts = failedAttempts.merge(otp.getOtpId(), 1, Integer::sum);
            if (attempts >= maxAttempts) {
                otp.setIsUsed(true);
                otpRepository.save(otp);
                failedAttempts.remove(otp.getOtpId());
                throw new AuthException(HttpStatus.UNAUTHORIZED,
                        "Too many wrong attempts. Please log in again to get a new code.");
            }
            throw new AuthException(HttpStatus.UNAUTHORIZED,
                    "Invalid OTP. " + (maxAttempts - attempts) + " attempt(s) left.");
        }

        if (!"ACTIVE".equalsIgnoreCase(account.getStatus())) {
            throw new AuthException(HttpStatus.FORBIDDEN, "Account is inactive.");
        }

        otp.setIsUsed(true);
        otpRepository.save(otp);
        failedAttempts.remove(otp.getOtpId());

        return toAuthenticatedUser(account);
    }

    @Override
    public AuthenticatedUserResponse changePassword(ChangePasswordRequest request) {

        // The gateway takes userName from the JWT, so a missing account means the token is stale.
        Account account = accountRepository.findByUserName(request.getUserName())
                .orElseThrow(() -> new AuthException(HttpStatus.UNAUTHORIZED,
                        "Account not found. Please log in again."));

        if (request.getOldPassword() == null
                || !passwordEncoder.matches(request.getOldPassword(), account.getUserPwd())) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "Old password is incorrect.");
        }

        String newPassword = request.getNewPassword();
        if (newPassword == null || newPassword.isBlank() || newPassword.length() < MIN_PASSWORD_LENGTH) {
            throw new AuthException(HttpStatus.BAD_REQUEST,
                    "New password must be at least " + MIN_PASSWORD_LENGTH + " characters.");
        }

        if (passwordEncoder.matches(newPassword, account.getUserPwd())) {
            throw new AuthException(HttpStatus.BAD_REQUEST,
                    "New password must be different from the old password.");
        }

        account.setUserPwd(passwordEncoder.encode(newPassword));
        account.setIsFirstLogin(false); // first login completed
        accountRepository.save(account);

        return toAuthenticatedUser(account);
    }

    @Override
    public AuthenticatedUserResponse currentUser(Integer accountId) {
        Account account = accountRepository.findById(accountId)
                .filter(a -> "ACTIVE".equalsIgnoreCase(a.getStatus()))
                .orElseThrow(() -> new AuthException(HttpStatus.UNAUTHORIZED,
                        "This account no longer exists or is inactive. Please log in again."));
        return toAuthenticatedUser(account);
    }

    private static AuthenticatedUserResponse toAuthenticatedUser(Account account) {
        return new AuthenticatedUserResponse(
                account.getAccountId(),
                account.getUserName(),
                account.getEmail(),
                account.getRole() == null ? null : account.getRole().getRoleName(),
                account.getEmployeeId(),
                Boolean.TRUE.equals(account.getIsFirstLogin()));
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

    private boolean isUsable(OTPVerification otp) {
        return !Boolean.TRUE.equals(otp.getIsUsed())
                && otp.getExpiredAt() != null
                && otp.getExpiredAt().isAfter(LocalDateTime.now());
    }

    private static boolean constantTimeEquals(String expected, String actual) {
        if (expected == null || actual == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.trim().getBytes(StandardCharsets.UTF_8));
    }

    /** kong.virakbouth@gmail.com -> k***h@gmail.com */
    private static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "your email";
        }
        int at = email.indexOf('@');
        String name = email.substring(0, at);
        String shown = name.length() <= 2
                ? name.charAt(0) + "***"
                : name.charAt(0) + "***" + name.charAt(name.length() - 1);
        return shown + email.substring(at);
    }
}
