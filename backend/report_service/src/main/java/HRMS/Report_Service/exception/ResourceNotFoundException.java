package HRMS.Report_Service.exception;

/** Thrown when a requested record does not exist; GlobalExceptionHandler turns it into a 404. */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
