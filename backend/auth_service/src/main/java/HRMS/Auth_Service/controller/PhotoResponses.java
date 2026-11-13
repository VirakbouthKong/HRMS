package HRMS.Auth_Service.controller;

import HRMS.Auth_Service.dto.response.PhotoResult;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.concurrent.TimeUnit;

/** Image responses shared by the photo controllers. */
final class PhotoResponses {

    static final String DEFAULT_AVATAR_HEADER = "X-Default-Avatar";

    private PhotoResponses() {
    }

    static ResponseEntity<byte[]> image(PhotoResult photo) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.contentType()))
                .cacheControl(CacheControl.maxAge(300, TimeUnit.SECONDS).cachePrivate())
                .header(DEFAULT_AVATAR_HEADER, String.valueOf(photo.isDefault()))
                .body(photo.data());
    }
}
