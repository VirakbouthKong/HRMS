package HRMS.Auth_Service.exception;

import org.springframework.http.HttpStatus;

/** A login/OTP failure that should be returned to the caller with a specific HTTP status. */
public class AuthException extends RuntimeException {

    private final HttpStatus status;

    public AuthException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
