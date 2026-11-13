package com.example.hr.gateway.config;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Frontend settings from the Config Server (config-repo/frontend.yml). Read live from the environment,
 * so a config refresh shows here immediately. Only the "frontend" section is ever returned.
 */
@RestController
public class PublicConfigController {

    private final ConfigurableEnvironment environment;

    public PublicConfigController(ConfigurableEnvironment environment) {
        this.environment = environment;
    }

    @Operation(tags = "Public config", summary = "Frontend settings (endpoint paths, features, limits)",
            description = "No token needed. The frontend reads this when it starts, so endpoint paths and "
                    + "feature switches can change in config-repo/frontend.yml without redeploying the frontend "
                    + "(admin: POST /api/admin/config/refresh after editing).")
    @SecurityRequirements
    @GetMapping(value = "/api/public/config", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> config() {
        return Binder.get(environment)
                .bind("frontend", Bindable.mapOf(String.class, Object.class))
                .orElse(Map.of());
    }
}
