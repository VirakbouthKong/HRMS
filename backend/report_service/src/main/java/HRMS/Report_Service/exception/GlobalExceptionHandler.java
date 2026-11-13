package HRMS.Report_Service.exception;

import HRMS.Report_Service.dto.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Returns errors as the same JSON shape as normal responses: { success, message, data }. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> notFound(ResourceNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse<>(false, e.getMessage(), null));
    }

    /** e.g. /attendance/date/not-a-date or /employees/abc */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> badParameter(MethodArgumentTypeMismatchException e) {
        return ResponseEntity.badRequest().body(new ApiResponse<>(false,
                "Invalid value '" + e.getValue() + "' for '" + e.getName() + "'. Dates use the format yyyy-MM-dd.", null));
    }

    /** e.g. /range without endDate */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> missingParameter(MissingServletRequestParameterException e) {
        return ResponseEntity.badRequest().body(new ApiResponse<>(false,
                "Missing required parameter '" + e.getParameterName() + "'.", null));
    }
}
