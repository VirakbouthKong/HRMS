package HRMS.Auth_Service.util;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Optional;

/**
 * The image formats a profile photo may have. The format is read from the file's first bytes
 * ("magic numbers"), so a PDF renamed to .png is still recognised as not-an-image.
 */
public enum ImageType {
    JPEG("image/jpeg"),
    PNG("image/png"),
    WEBP("image/webp");

    private static final byte[] JPEG_START = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_START = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] RIFF = "RIFF".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] WEBP_MARK = "WEBP".getBytes(StandardCharsets.US_ASCII);

    private final String contentType;

    ImageType(String contentType) {
        this.contentType = contentType;
    }

    public String contentType() {
        return contentType;
    }

    public static Optional<ImageType> detect(byte[] bytes) {
        if (bytes == null) {
            return Optional.empty();
        }
        if (startsWith(bytes, 0, JPEG_START)) {
            return Optional.of(JPEG);
        }
        if (startsWith(bytes, 0, PNG_START)) {
            return Optional.of(PNG);
        }
        // WebP: "RIFF" <4-byte size> "WEBP"
        if (startsWith(bytes, 0, RIFF) && startsWith(bytes, 8, WEBP_MARK)) {
            return Optional.of(WEBP);
        }
        return Optional.empty();
    }

    private static boolean startsWith(byte[] bytes, int offset, byte[] prefix) {
        return bytes.length >= offset + prefix.length
                && Arrays.equals(bytes, offset, offset + prefix.length, prefix, 0, prefix.length);
    }
}
