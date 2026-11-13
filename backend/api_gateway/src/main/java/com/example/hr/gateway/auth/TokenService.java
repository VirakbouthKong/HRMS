package com.example.hr.gateway.auth;

import com.nimbusds.jose.jwk.RSAKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Builds and signs the JWT (RS256). Claim names match what the Operation service reads:
 * "roles" (list of role names) and "employeeId".
 */
@Service
public class TokenService {

    public static final String PASSWORD_CHANGE_REQUIRED_CLAIM = "pwdChangeRequired";

    private final JwtEncoder jwtEncoder;
    private final String keyId;
    private final String issuer;
    private final Duration ttl;

    public TokenService(JwtEncoder jwtEncoder,
                        RSAKey rsaKey,
                        @Value("${app.jwt.issuer}") String issuer,
                        @Value("${app.jwt.ttl}") Duration ttl) {
        this.jwtEncoder = jwtEncoder;
        this.keyId = rsaKey.getKeyID();
        this.issuer = issuer;
        this.ttl = ttl;
    }

    public IssuedToken issue(TokenController.AuthenticatedUser user) {
        Instant now = Instant.now();
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .subject(String.valueOf(user.accountId()))
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                .claim("username", user.userName())
                .claim("roles", List.of(user.role()));
        if (user.email() != null) {
            claims.claim("email", user.email());
        }
        if (user.employeeId() != null) {
            claims.claim("employeeId", user.employeeId());
        }
        if (Boolean.TRUE.equals(user.isFirstLogin())) {
            // PasswordChangeRequiredFilter only lets this token change the password or call /me.
            claims.claim(PASSWORD_CHANGE_REQUIRED_CLAIM, true);
        }

        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).keyId(keyId).build();
        String value = jwtEncoder.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
        return new IssuedToken(value, ttl.toSeconds());
    }

    public record IssuedToken(String value, long expiresInSeconds) {
    }
}
