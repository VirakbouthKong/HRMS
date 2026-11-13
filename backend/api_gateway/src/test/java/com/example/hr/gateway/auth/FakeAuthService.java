package com.example.hr.gateway.auth;

import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.core.io.buffer.DefaultDataBufferFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.HttpMessageWriter;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.mock.http.client.reactive.MockClientHttpRequest;
import org.springframework.web.reactive.function.BodyInserter;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.net.ConnectException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Stands in for the Auth service at the network level: the gateway's real WebClient code runs,
 * but no HTTP request leaves the test. Records what the gateway sent.
 */
public class FakeAuthService implements ExchangeFunction {

    private HttpStatus status = HttpStatus.OK;
    private String contentType = MediaType.APPLICATION_JSON_VALUE;
    private byte[] responseBody = "{}".getBytes(StandardCharsets.UTF_8);
    private final Map<String, String> responseHeaders = new LinkedHashMap<>();
    private boolean down;

    public HttpMethod sentMethod;
    public String sentPath;
    public String sentContentType;
    public byte[] sentBytes;
    public String sentBody;

    public FakeAuthService replies(HttpStatus status, String json) {
        return replies(status, MediaType.APPLICATION_JSON_VALUE, json.getBytes(StandardCharsets.UTF_8), Map.of());
    }

    public FakeAuthService replies(HttpStatus status, String contentType, byte[] body, Map<String, String> headers) {
        this.status = status;
        this.contentType = contentType;
        this.responseBody = body;
        this.responseHeaders.clear();
        this.responseHeaders.putAll(headers);
        return this;
    }

    public FakeAuthService isDown() {
        this.down = true;
        return this;
    }

    public WebClient webClient() {
        return WebClient.builder().baseUrl("http://auth-service:8081").exchangeFunction(this).build();
    }

    @Override
    public Mono<ClientResponse> exchange(ClientRequest request) {
        sentMethod = request.method();
        sentPath = request.url().getPath();
        sentContentType = request.headers().getFirst("Content-Type");
        MockClientHttpRequest captured = new MockClientHttpRequest(request.method(), request.url());
        request.body().insert(captured, new BodyInserter.Context() {
            private final ExchangeStrategies strategies = ExchangeStrategies.withDefaults();

            @Override
            public List<HttpMessageWriter<?>> messageWriters() {
                return strategies.messageWriters();
            }

            @Override
            public Optional<ServerHttpRequest> serverRequest() {
                return Optional.empty();
            }

            @Override
            public Map<String, Object> hints() {
                return Map.of();
            }
        }).block();
        sentBytes = DataBufferUtils.join(captured.getBody())
                .map(buffer -> {
                    byte[] bytes = new byte[buffer.readableByteCount()];
                    buffer.read(bytes);
                    DataBufferUtils.release(buffer);
                    return bytes;
                })
                .defaultIfEmpty(new byte[0])
                .block();
        sentBody = new String(sentBytes, StandardCharsets.UTF_8);

        if (down) {
            return Mono.error(new ConnectException("Connection refused"));
        }
        ClientResponse.Builder response = ClientResponse.create(status)
                .header("Content-Type", contentType)
                .body(Flux.<DataBuffer>just(DefaultDataBufferFactory.sharedInstance.wrap(responseBody)));
        responseHeaders.forEach(response::header);
        return Mono.just(response.build());
    }
}
