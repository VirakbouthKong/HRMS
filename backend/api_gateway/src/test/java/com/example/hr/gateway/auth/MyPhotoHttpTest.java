package com.example.hr.gateway.auth;

import org.junit.jupiter.api.Test;
import org.springframework.core.ReactiveAdapterRegistry;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.reactive.result.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.netty.DisposableServer;
import reactor.netty.http.server.HttpServer;

/**
 * Real HTTP binding (multipart parsing, @RequestPart, @AuthenticationPrincipal, @ExceptionHandler) for the
 * my-photo endpoints. Where Auth is needed, a real local HTTP server stands in for it.
 */
class MyPhotoHttpTest {

    private WebTestClient client() {
        // Requests in these tests never reach Auth; any client will do.
        return client(WebClient.create("http://127.0.0.1:1"));
    }

    private WebTestClient client(WebClient authClient) {
        JwtAuthenticationToken login = new JwtAuthenticationToken(TestTokens.principal(12, "test_dara", "EMPLOYEE", false));
        return WebTestClient.bindToController(new MyPhotoController(authClient))
                .argumentResolvers(r -> r.addCustomResolver(
                        new AuthenticationPrincipalArgumentResolver(ReactiveAdapterRegistry.getSharedInstance())))
                .webFilter((exchange, chain) -> chain.filter(exchange)
                        .contextWrite(ReactiveSecurityContextHolder.withAuthentication(login)))
                .build();
    }

    @Test
    void upload_textFieldNamedFileIs400NotServerError() {
        MultipartBodyBuilder form = new MultipartBodyBuilder();
        form.part("file", "undefined"); // what form.append("file", undefined) sends

        client().put().uri("/api/auth/me/photo")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(form.build()))
                .exchange()
                .expectStatus().isEqualTo(HttpStatus.BAD_REQUEST)
                .expectBody().jsonPath("$.message").isEqualTo("Please choose an image file to upload.");
    }

    /** "My photo" depends on who is logged in, so a shared browser must not reuse it for the next user. */
    @Test
    void myPhoto_isNotReusedFromTheBrowserCacheByTheNextUser() {
        DisposableServer fakeAuth = HttpServer.create().host("127.0.0.1").port(0)
                .route(routes -> routes.get("/api/internal/photos/accounts/12", (req, res) -> res
                        .header("Content-Type", "image/png")
                        .header("Cache-Control", "max-age=300, private")
                        .header("X-Default-Avatar", "false")
                        .sendByteArray(Mono.just(new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47}))))
                .bindNow();
        try {
            WebClient toFakeAuth = AuthClientConfig.configure(WebClient.builder(),
                    "http://127.0.0.1:" + fakeAuth.port(), "test-key");

            client(toFakeAuth).get().uri("/api/auth/me/photo")
                    .exchange()
                    .expectStatus().isOk()
                    .expectHeader().valueEquals("Cache-Control", "private, no-cache")
                    .expectHeader().valueEquals("Vary", "Authorization")
                    .expectHeader().valueEquals("X-Default-Avatar", "false");
        } finally {
            fakeAuth.disposeNow();
        }
    }
}
