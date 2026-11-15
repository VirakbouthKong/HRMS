package com.example.hr.gateway.security;
import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.http.HttpStatus;
import reactor.core.publisher.Mono;
import java.util.concurrent.atomic.AtomicInteger;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ActiveAccountFilterTest {
    @Test void inactiveTokenIsRejectedBeforeRouting() { verifyResult(Mono.just(false),HttpStatus.UNAUTHORIZED,0); }
    @Test void activeTokenRoutesExactlyOnce() { verifyResult(Mono.just(true),null,1); }
    @Test void authOutageFailsClosed() { verifyResult(Mono.error(new IllegalStateException("offline")),HttpStatus.SERVICE_UNAVAILABLE,0); }
    private void verifyResult(Mono<Boolean> result,HttpStatus status,int calls) {
        var service=mock(ActiveAccountService.class);
        Jwt jwt=Jwt.withTokenValue("test").header("alg","RS256").subject("1").build();
        when(service.isActive(jwt)).thenReturn(result);
        var original=MockServerWebExchange.from(MockServerHttpRequest.get("/api/employees"));
        var exchange=original.mutate().principal(Mono.just(new JwtAuthenticationToken(jwt))).build();
        var counter=new AtomicInteger();
        new ActiveAccountFilter(service).filter(exchange,e->{counter.incrementAndGet();return Mono.empty();}).block();
        assertThat(original.getResponse().getStatusCode()).isEqualTo(status);assertThat(counter.get()).isEqualTo(calls);
    }
}
