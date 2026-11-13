package com.example.hr.gateway.config;

import com.example.hr.gateway.security.AccessRulesHolder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cloud.gateway.event.RefreshRoutesEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Supplier;

/**
 * Re-reads the gateway's settings from the Config Server without a restart. Routes, access rules and
 * frontend settings take effect at once; other gateway settings are read only at start-up.
 */
@RestController
public class ConfigAdminController {

    private final Supplier<Set<String>> refresher;
    private final AccessRulesHolder accessRules;
    private final ApplicationEventPublisher events;

    public ConfigAdminController(@Qualifier("configRefresher") Supplier<Set<String>> refresher,
                                 AccessRulesHolder accessRules,
                                 ApplicationEventPublisher events) {
        this.refresher = refresher;
        this.accessRules = accessRules;
        this.events = events;
    }

    @Operation(tags = "Config (admin)", summary = "Reload routes, access rules and frontend settings",
            description = "ADMIN only. After editing backend/config-repo/api-gateway.yml or frontend.yml, call "
                    + "this: new routes and rules work immediately, without restarting the gateway. "
                    + "`changed` lists the settings that changed. If the new access rules contain a mistake, "
                    + "the answer is 400 and the previous rules stay in force.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Reloaded"),
            @ApiResponse(responseCode = "400", description = "New access rules refused; previous rules kept"),
            @ApiResponse(responseCode = "403", description = "Not an ADMIN")
    })
    @PostMapping(value = "/api/admin/config/refresh", produces = MediaType.APPLICATION_JSON_VALUE)
    public synchronized ResponseEntity<Map<String, Object>> refresh() { // one reload at a time
        Set<String> changed = refresher.get();          // re-read settings; live routes untouched
        Optional<String> refused = accessRules.reload(); // swap rules in only if valid

        Map<String, Object> body = new LinkedHashMap<>();
        if (refused.isPresent()) {
            // Routes are NOT rebuilt: a new route must never be live without a valid rule.
            body.put("success", false);
            body.put("message", "New access rules refused, the previous rules are still in force: " + refused.get());
            body.put("changed", changed.stream().sorted().toList());
            return ResponseEntity.badRequest().body(body);
        }
        events.publishEvent(new RefreshRoutesEvent(this)); // rules are in force; now rebuild the routes
        body.put("success", true);
        body.put("message", "Configuration reloaded.");
        body.put("changed", changed.stream().sorted().toList());
        return ResponseEntity.ok(body);
    }
}
