package com.example.hr.gateway.auth;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/** Test helpers: a real RSA key, a real TokenService, and a decoder to read tokens it issues. */
public final class TestTokens {

    public static final RSAKey KEY = generate();

    private TestTokens() {
    }

    public static TokenService tokenService() {
        return new TokenService(new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(KEY))), KEY,
                "hrms-api-gateway", Duration.ofHours(8));
    }

    public static Jwt decode(String token) {
        try {
            JwtDecoder decoder = NimbusJwtDecoder.withPublicKey(KEY.toRSAPublicKey()).build();
            return decoder.decode(token);
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }

    /** The already-validated JWT Spring hands to a controller for a logged-in user. */
    public static Jwt principal(int accountId, String userName, String role, boolean pwdChangeRequired) {
        Jwt.Builder jwt = Jwt.withTokenValue("token-from-request")
                .header("alg", "RS256")
                .issuer("hrms-api-gateway")
                .subject(String.valueOf(accountId))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .claim("username", userName)
                .claim("roles", List.of(role));
        if (pwdChangeRequired) {
            jwt.claim("pwdChangeRequired", true);
        }
        return jwt.build();
    }

    private static RSAKey generate() {
        try {
            return new RSAKeyGenerator(2048).keyID("test-key").generate();
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }
}
