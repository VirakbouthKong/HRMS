package HRMS.Auth_Service.controller;

import HRMS.Auth_Service.dto.response.ApiResponse;
import HRMS.Auth_Service.exception.AuthException;
import HRMS.Auth_Service.service.PhotoService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Called only by the API Gateway (X-Internal-Api-Key) for GET/PUT/DELETE /api/auth/me/photo.
 * The gateway takes accountId from the caller's JWT.
 */
@RestController
@RequestMapping("/api/internal/photos/accounts/{accountId}")
public class InternalPhotoController {

    private final PhotoService photoService;

    public InternalPhotoController(PhotoService photoService) {
        this.photoService = photoService;
    }

    @GetMapping
    public ResponseEntity<?> photo(@PathVariable Integer accountId) {
        try {
            return PhotoResponses.image(photoService.forAccount(accountId));
        } catch (AuthException e) {
            return error(e);
        }
    }

    /** Body = the raw image bytes. */
    @PutMapping(consumes = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<ApiResponse> upload(@PathVariable Integer accountId,
                                              @RequestBody(required = false) byte[] image) {
        try {
            photoService.save(accountId, image);
            return ResponseEntity.ok(new ApiResponse(true, "Photo updated."));
        } catch (AuthException e) {
            return error(e);
        }
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse> delete(@PathVariable Integer accountId) {
        photoService.delete(accountId);
        return ResponseEntity.ok(new ApiResponse(true, "Photo removed."));
    }

    private static ResponseEntity<ApiResponse> error(AuthException e) {
        return ResponseEntity.status(e.getStatus()).body(new ApiResponse(false, e.getMessage()));
    }
}
