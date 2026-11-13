package com.example.hr.gateway.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.buffer.DataBufferLimitException;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.http.codec.multipart.Part;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * The logged-in user's own profile photo. Whose photo comes from the JWT; the image itself is stored by
 * the Auth service. Other people's photos: GET /api/photos/employees/{employeeId}.
 */
@RestController
public class MyPhotoController {

    private static final Logger log = LoggerFactory.getLogger(MyPhotoController.class);

    /** 3 MB. Auth enforces the same limit. */
    static final int MAX_BYTES = 3 * 1024 * 1024;
    private static final String PATH = "/api/internal/photos/accounts/{accountId}";
    private static final List<String> COPIED_HEADERS = List.of(HttpHeaders.CONTENT_TYPE, "X-Default-Avatar");

    private final WebClient authClient;

    public MyPhotoController(@Qualifier("authWebClient") WebClient authClient) {
        this.authClient = authClient;
    }

    @Operation(tags = "My account", summary = "My profile photo",
            description = "Your photo, or an initials avatar if you have not uploaded one "
                    + "(header X-Default-Avatar: true). Allowed before a first-login password change.")
    @ApiResponse(responseCode = "200", description = "JPG/PNG/WebP photo or SVG default avatar",
            content = @Content(mediaType = "image/*", schema = @Schema(type = "string", format = "binary")))
    @GetMapping("/api/auth/me/photo")
    public Mono<ResponseEntity<byte[]>> myPhoto(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return authClient.get()
                .uri(PATH, jwt.getSubject())
                .exchangeToMono(response -> response.bodyToMono(byte[].class)
                        .defaultIfEmpty(new byte[0])
                        .map(body -> {
                            ResponseEntity.BodyBuilder out = ResponseEntity.status(response.statusCode());
                            COPIED_HEADERS.forEach(name -> response.headers().header(name)
                                    .forEach(value -> out.header(name, value)));
                            // Same URL for every user: a shared browser must not show the last user's photo.
                            out.header(HttpHeaders.CACHE_CONTROL, "private, no-cache");
                            out.header(HttpHeaders.VARY, HttpHeaders.AUTHORIZATION);
                            return out.body(body);
                        }))
                .onErrorResume(e -> {
                    log.error("Could not reach Auth service for my photo", e);
                    return Mono.just(ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                            .contentType(MediaType.APPLICATION_JSON)
                            .body("{\"success\":false,\"message\":\"Auth service is unavailable. Please try again later.\"}"
                                    .getBytes(StandardCharsets.UTF_8)));
                });
    }

    @Operation(tags = "My account", summary = "Upload or replace my profile photo",
            description = "multipart/form-data with the image in field `file`. JPG, PNG or WebP, at most 3 MB. "
                    + "The same photo becomes your icon in HR's employee screens.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Photo updated"),
            @ApiResponse(responseCode = "400", description = "No file, empty file, or not a JPG/PNG/WebP image"),
            @ApiResponse(responseCode = "413", description = "Larger than 3 MB"),
            @ApiResponse(responseCode = "403", description = "PASSWORD_CHANGE_REQUIRED: change your password first")
    })
    @PutMapping(value = "/api/auth/me/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<ResponseEntity<Object>> upload(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                               @RequestPart(value = "file", required = false) Part part) {
        // A text field named "file" (e.g. form.append("file", undefined)) is not a file.
        if (!(part instanceof FilePart file)) {
            return Mono.just(AuthReplies.error(HttpStatus.BAD_REQUEST, "Please choose an image file to upload."));
        }
        return DataBufferUtils.join(file.content(), MAX_BYTES)
                .map(buffer -> {
                    byte[] bytes = new byte[buffer.readableByteCount()];
                    buffer.read(bytes);
                    DataBufferUtils.release(buffer);
                    return bytes;
                })
                .defaultIfEmpty(new byte[0])
                .flatMap(bytes -> authClient.put()
                        .uri(PATH, jwt.getSubject())
                        .contentType(MediaType.APPLICATION_OCTET_STREAM)
                        .bodyValue(bytes)
                        .exchangeToMono(response -> AuthReplies.passThrough(response, "Could not save the photo."))
                        .onErrorResume(e -> {
                            log.error("Could not reach Auth service to save a photo", e);
                            return Mono.just(AuthReplies.authUnavailable());
                        }))
                .onErrorResume(DataBufferLimitException.class, e -> Mono.just(
                        AuthReplies.error(HttpStatus.PAYLOAD_TOO_LARGE, "The photo must be 3 MB or smaller.")));
    }

    /** A far-too-big upload is stopped while the request is read (spring.webflux.multipart limit). */
    @ExceptionHandler(DataBufferLimitException.class)
    ResponseEntity<Object> partTooLarge(DataBufferLimitException e) {
        return AuthReplies.error(HttpStatus.PAYLOAD_TOO_LARGE, "The photo must be 3 MB or smaller.");
    }

    @Operation(tags = "My account", summary = "Remove my profile photo (back to the default avatar)")
    @DeleteMapping(value = "/api/auth/me/photo", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<ResponseEntity<Object>> delete(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return authClient.delete()
                .uri(PATH, jwt.getSubject())
                .exchangeToMono(response -> AuthReplies.passThrough(response, "Could not remove the photo."))
                .onErrorResume(e -> {
                    log.error("Could not reach Auth service to remove a photo", e);
                    return Mono.just(AuthReplies.authUnavailable());
                });
    }
}
