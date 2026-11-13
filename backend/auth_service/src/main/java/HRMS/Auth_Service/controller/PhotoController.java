package HRMS.Auth_Service.controller;

import HRMS.Auth_Service.service.PhotoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Employee icons for HR screens. Reached through the gateway, which requires a valid token. */
@Tag(name = "Photo", description = "Profile photos used as employee icons")
@RestController
@RequestMapping("/api/photos")
public class PhotoController {

    private final PhotoService photoService;

    public PhotoController(PhotoService photoService) {
        this.photoService = photoService;
    }

    @Operation(summary = "Photo (icon) of an employee",
            description = "Any logged-in user. Returns the photo of the employee's account; if they have not "
                    + "uploaded one, an initials avatar; if the employee has no account, a person silhouette. "
                    + "Header X-Default-Avatar tells whether it is a default picture. "
                    + "Browsers: load it with fetch + the token, then URL.createObjectURL(blob).")
    @ApiResponse(responseCode = "200", description = "JPG/PNG/WebP photo, or SVG default avatar",
            content = {
                    @Content(mediaType = "image/jpeg", schema = @Schema(type = "string", format = "binary")),
                    @Content(mediaType = "image/png", schema = @Schema(type = "string", format = "binary")),
                    @Content(mediaType = "image/webp", schema = @Schema(type = "string", format = "binary")),
                    @Content(mediaType = "image/svg+xml", schema = @Schema(type = "string", format = "binary"))
            })
    @GetMapping("/employees/{employeeId}")
    public ResponseEntity<byte[]> employeePhoto(@PathVariable Integer employeeId) {
        return PhotoResponses.image(photoService.forEmployee(employeeId));
    }
}
