package com.example.hr.gateway.auth;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferLimitException;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.core.io.buffer.DefaultDataBufferFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.security.oauth2.jwt.Jwt;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.netty.DisposableServer;
import reactor.netty.http.server.HttpServer;

import java.nio.file.Path;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MyPhotoControllerTest {

    private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3};

    private final FakeAuthService auth = new FakeAuthService();
    private final MyPhotoController controller = new MyPhotoController(auth.webClient());
    private final Jwt dara = TestTokens.principal(12, "test_dara", "EMPLOYEE", false);

    /** An uploaded multipart file, split into two chunks like a real upload. */
    private record TestFilePart(byte[] bytes) implements FilePart {
        @Override
        public String filename() {
            return "photo.png";
        }

        @Override
        public Mono<Void> transferTo(Path dest) {
            return Mono.empty();
        }

        @Override
        public String name() {
            return "file";
        }

        @Override
        public HttpHeaders headers() {
            return new HttpHeaders();
        }

        @Override
        public Flux<DataBuffer> content() {
            int half = bytes.length / 2;
            DefaultDataBufferFactory f = DefaultDataBufferFactory.sharedInstance;
            return Flux.just(f.wrap(java.util.Arrays.copyOfRange(bytes, 0, half)),
                    f.wrap(java.util.Arrays.copyOfRange(bytes, half, bytes.length)));
        }
    }

    @Test
    void myPhoto_asksAuthForAccountInTokenAndCopiesImageHeaders() {
        auth.replies(HttpStatus.OK, "image/png", PNG,
                Map.of("X-Default-Avatar", "false", "Cache-Control", "max-age=300, private"));

        ResponseEntity<byte[]> response = controller.myPhoto(dara).block();

        assertThat(auth.sentMethod).isEqualTo(HttpMethod.GET);
        assertThat(auth.sentPath).isEqualTo("/api/internal/photos/accounts/12");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(PNG);
        assertThat(response.getHeaders().getFirst("Content-Type")).isEqualTo("image/png");
        assertThat(response.getHeaders().getFirst("X-Default-Avatar")).isEqualTo("false");
        // Not Auth's max-age=300: "my photo" depends on who is logged in (see MyPhotoHttpTest).
        assertThat(response.getHeaders().getFirst("Cache-Control")).isEqualTo("private, no-cache");
    }

    /** A real local HTTP server stands in for Auth here, so the real client buffer settings are used. */
    @Test
    void myPhoto_passesBackA3MBPhotoWithTheRealAuthClientSettings() {
        byte[] big = new byte[3_145_728];
        System.arraycopy(PNG, 0, big, 0, PNG.length);
        DisposableServer fakeAuth = HttpServer.create().host("127.0.0.1").port(0)
                .route(routes -> routes.get("/api/internal/photos/accounts/12", (req, res) -> res
                        .header("Content-Type", "image/png")
                        .header("X-Default-Avatar", "false")
                        .sendByteArray(Mono.just(big))))
                .bindNow();
        try {
            WebClient realSettings = AuthClientConfig.configure(WebClient.builder(),
                    "http://127.0.0.1:" + fakeAuth.port(), "test-key");

            ResponseEntity<byte[]> response = new MyPhotoController(realSettings).myPhoto(dara).block();

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isEqualTo(big);
        } finally {
            fakeAuth.disposeNow();
        }
    }

    @Test
    void uploadThatExceedsTheMultipartLimitIs413() {
        ResponseEntity<Object> response = controller.partTooLarge(
                new DataBufferLimitException("Part exceeded the disk usage limit of 4194304 bytes"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
        assertThat(((Map<?, ?>) response.getBody()).get("message")).isEqualTo("The photo must be 3 MB or smaller.");
    }

    @Test
    void upload_sendsFileBytesForAccountInToken() {
        auth.replies(HttpStatus.OK, "{\"success\":true,\"message\":\"Photo updated.\"}");

        ResponseEntity<Object> response = controller.upload(dara, new TestFilePart(PNG)).block();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(auth.sentMethod).isEqualTo(HttpMethod.PUT);
        assertThat(auth.sentPath).isEqualTo("/api/internal/photos/accounts/12");
        assertThat(auth.sentContentType).isEqualTo("application/octet-stream");
        assertThat(auth.sentBytes).isEqualTo(PNG);
    }

    @Test
    void upload_acceptsExactly3MB() {
        auth.replies(HttpStatus.OK, "{\"success\":true,\"message\":\"Photo updated.\"}");

        controller.upload(dara, new TestFilePart(new byte[3_145_728])).block();

        assertThat(auth.sentBytes).hasSize(3_145_728);
    }

    @Test
    void upload_over3MBIs413WithoutCallingAuth() {
        ResponseEntity<Object> response = controller.upload(dara, new TestFilePart(new byte[3_145_729])).block();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
        assertThat(auth.sentPath).isNull();
    }

    @Test
    void upload_missingFileIs400() {
        ResponseEntity<Object> response = controller.upload(dara, null).block();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(auth.sentPath).isNull();
    }

    @Test
    void upload_passesAuth400Back() {
        auth.replies(HttpStatus.BAD_REQUEST, "{\"success\":false,\"message\":\"Only JPG, PNG or WebP images are allowed.\"}");

        ResponseEntity<Object> response = controller.upload(dara, new TestFilePart("%PDF-1.7".getBytes())).block();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(((Map<?, ?>) response.getBody()).get("message")).isEqualTo("Only JPG, PNG or WebP images are allowed.");
    }

    @Test
    void upload_authDownIs503() {
        auth.isDown();

        ResponseEntity<Object> response = controller.upload(dara, new TestFilePart(PNG)).block();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Test
    void delete_forAccountInToken() {
        auth.replies(HttpStatus.OK, "{\"success\":true,\"message\":\"Photo removed.\"}");

        ResponseEntity<Object> response = controller.delete(dara).block();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(auth.sentMethod).isEqualTo(HttpMethod.DELETE);
        assertThat(auth.sentPath).isEqualTo("/api/internal/photos/accounts/12");
    }
}
