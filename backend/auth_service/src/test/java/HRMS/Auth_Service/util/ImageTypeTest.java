package HRMS.Auth_Service.util;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class ImageTypeTest {

    private static byte[] bytes(int... values) {
        byte[] b = new byte[values.length];
        for (int i = 0; i < values.length; i++) {
            b[i] = (byte) values[i];
        }
        return b;
    }

    private static byte[] ascii(String s) {
        return s.getBytes(StandardCharsets.US_ASCII);
    }

    @Test
    void detect_jpeg() {
        assertThat(ImageType.detect(bytes(0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10))).contains(ImageType.JPEG);
        assertThat(ImageType.JPEG.contentType()).isEqualTo("image/jpeg");
    }

    @Test
    void detect_png() {
        assertThat(ImageType.detect(bytes(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00))).contains(ImageType.PNG);
        assertThat(ImageType.PNG.contentType()).isEqualTo("image/png");
    }

    @Test
    void detect_webp() {
        assertThat(ImageType.detect(ascii("RIFF\u0001\u0002\u0003\u0004WEBPVP8 "))).contains(ImageType.WEBP);
        assertThat(ImageType.WEBP.contentType()).isEqualTo("image/webp");
    }

    @Test
    void detect_rejectsPdfRenamedPng() {
        assertThat(ImageType.detect(ascii("%PDF-1.7\n%..."))).isEmpty();
    }

    @Test
    void detect_rejectsRiffThatIsNotWebp() {
        assertThat(ImageType.detect(ascii("RIFF\u0001\u0002\u0003\u0004WAVEfmt "))).isEmpty();
    }

    @Test
    void detect_tooShort() {
        assertThat(ImageType.detect(bytes(0xFF, 0xD8))).isEmpty();
    }

    @Test
    void detect_null() {
        assertThat(ImageType.detect(null)).isEmpty();
    }
}
