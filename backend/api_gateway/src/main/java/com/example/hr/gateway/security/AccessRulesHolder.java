package com.example.hr.gateway.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * The access rules currently enforced. Starts from app.access-rules (a mistake stops the gateway) and
 * swaps in new rules on reload only when they are valid; otherwise the previous rules stay in force.
 */
@Component
public class AccessRulesHolder {

    private static final Logger log = LoggerFactory.getLogger(AccessRulesHolder.class);

    private final AccessRuleProperties properties;
    private volatile AccessRules.CompiledRules current;
    private volatile String lastError;

    public AccessRulesHolder(AccessRuleProperties properties) {
        this.properties = properties;
        this.current = AccessRules.compile(properties.getAccessRules()); // throws at start-up if invalid
        log.info("Loaded {} access rule(s) from configuration", current.rules().size());
    }

    public AccessRules.CompiledRules current() {
        return current;
    }

    /** Re-reads app.access-rules (after a config refresh). Returns the error if they were refused. */
    public Optional<String> reload() {
        try {
            current = AccessRules.compile(properties.getAccessRules());
            lastError = null;
            log.info("Reloaded {} access rule(s) from configuration", current.rules().size());
            return Optional.empty();
        } catch (InvalidAccessRulesException e) {
            lastError = e.getMessage();
            log.warn("Refused new access rules, keeping the previous ones: {}", e.getMessage());
            return Optional.of(e.getMessage());
        }
    }

    public Optional<String> lastError() {
        return Optional.ofNullable(lastError);
    }
}
