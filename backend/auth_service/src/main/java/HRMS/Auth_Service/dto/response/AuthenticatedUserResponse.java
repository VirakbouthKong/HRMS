package HRMS.Auth_Service.dto.response;

/**
 * Returned to the API Gateway after a correct OTP. The gateway puts these values into the JWT.
 */
public record AuthenticatedUserResponse(
        Integer accountId,
        String userName,
        String email,
        String role,
        Integer employeeId,
        Boolean isFirstLogin
) {
}
