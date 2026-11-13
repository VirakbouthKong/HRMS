package HRMS.Auth_Service.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Protects /api/internal/** so that only the API Gateway (which knows the shared key)
 * can call it. The gateway never routes /api/internal/** from outside.
 */
public class InternalApiKeyFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Internal-Api-Key";
    private final byte[] expectedKey;

    public InternalApiKeyFilter(String expectedKey) {
        this.expectedKey = expectedKey == null ? null : expectedKey.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String key = request.getHeader(HEADER);
        boolean valid = expectedKey != null && expectedKey.length > 0 && key != null
                && MessageDigest.isEqual(expectedKey, key.getBytes(StandardCharsets.UTF_8));
        if (!valid) {
            response.sendError(HttpStatus.UNAUTHORIZED.value(), "Invalid or missing API key");
            return;
        }
        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/internal/");
    }
}
