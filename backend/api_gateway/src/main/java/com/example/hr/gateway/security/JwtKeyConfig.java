package com.example.hr.gateway.security;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * The RSA key pair used to sign (private key) and check (public key) JWTs.
 * Created once on first start and saved as PEM files, so tokens survive restarts.
 * The public key is published at /.well-known/jwks.json for the Operation service.
 */
@Configuration
public class JwtKeyConfig {

    private static final Logger log = LoggerFactory.getLogger(JwtKeyConfig.class);
    private static final String PRIVATE_FILE = "jwt-private.pem";
    private static final String PUBLIC_FILE = "jwt-public.pem";

    @Bean
    RSAKey rsaKey(@Value("${app.jwt.key-dir}") String keyDir) throws IOException, GeneralSecurityException, JOSEException {
        KeyPair keyPair = loadOrCreate(Path.of(keyDir));
        return new RSAKey.Builder((RSAPublicKey) keyPair.getPublic())
                .privateKey((RSAPrivateKey) keyPair.getPrivate())
                .keyIDFromThumbprint()
                .build();
    }

    @Bean
    JwtEncoder jwtEncoder(RSAKey rsaKey) {
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(rsaKey)));
    }

    /** Checks tokens locally with the public key (no network call), plus issuer and expiry. */
    @Bean
    ReactiveJwtDecoder jwtDecoder(RSAKey rsaKey, @Value("${app.jwt.issuer}") String issuer) throws JOSEException {
        NimbusReactiveJwtDecoder decoder = NimbusReactiveJwtDecoder.withPublicKey(rsaKey.toRSAPublicKey()).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(issuer)));
        return decoder;
    }

    private static KeyPair loadOrCreate(Path dir) throws IOException, GeneralSecurityException {
        Path privatePath = dir.resolve(PRIVATE_FILE);
        Path publicPath = dir.resolve(PUBLIC_FILE);
        KeyFactory factory = KeyFactory.getInstance("RSA");

        if (Files.exists(privatePath) && Files.exists(publicPath)) {
            log.info("Loading JWT signing keys from {}", dir.toAbsolutePath());
            return new KeyPair(
                    factory.generatePublic(new X509EncodedKeySpec(readPem(publicPath))),
                    factory.generatePrivate(new PKCS8EncodedKeySpec(readPem(privatePath))));
        }

        log.info("No JWT signing keys found; creating a new RSA key pair in {}", dir.toAbsolutePath());
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair keyPair = generator.generateKeyPair();
        Files.createDirectories(dir);
        writePem(privatePath, "PRIVATE KEY", keyPair.getPrivate().getEncoded());
        writePem(publicPath, "PUBLIC KEY", keyPair.getPublic().getEncoded());
        return keyPair;
    }

    private static byte[] readPem(Path path) throws IOException {
        String base64 = Files.readString(path, StandardCharsets.US_ASCII)
                .replaceAll("-----(BEGIN|END) [A-Z ]+-----", "")
                .replaceAll("\\s", "");
        return Base64.getDecoder().decode(base64);
    }

    private static void writePem(Path path, String type, byte[] der) throws IOException {
        String body = Base64.getMimeEncoder(64, "\n".getBytes(StandardCharsets.US_ASCII)).encodeToString(der);
        Files.writeString(path, "-----BEGIN " + type + "-----\n" + body + "\n-----END " + type + "-----\n",
                StandardCharsets.US_ASCII);
    }
}
