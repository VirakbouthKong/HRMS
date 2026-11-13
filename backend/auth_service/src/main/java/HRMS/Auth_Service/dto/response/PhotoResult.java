package HRMS.Auth_Service.dto.response;

/** An image to send back: an uploaded photo, or a default avatar when isDefault is true. */
public record PhotoResult(byte[] data, String contentType, boolean isDefault) {
}
