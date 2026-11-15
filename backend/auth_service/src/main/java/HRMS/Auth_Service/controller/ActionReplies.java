package HRMS.Auth_Service.controller;
import HRMS.Auth_Service.dto.response.ApiResponse;
import org.springframework.http.*;
final class ActionReplies {
    private ActionReplies() {}
    static ResponseEntity<ApiResponse> from(ApiResponse result) {
        HttpStatus status = result.isSuccess() ? HttpStatus.OK
                : result.getMessage().toLowerCase(java.util.Locale.ROOT).contains("not found") ? HttpStatus.NOT_FOUND : HttpStatus.CONFLICT;
        return ResponseEntity.status(status).body(result);
    }
}
