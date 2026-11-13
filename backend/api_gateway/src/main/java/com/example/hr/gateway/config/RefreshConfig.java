package com.example.hr.gateway.config;

import org.springframework.cloud.context.refresh.ContextRefresher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Set;
import java.util.function.Supplier;

@Configuration
public class RefreshConfig {

    /**
     * Fetches the config again and re-binds settings (routes definitions, access rules, frontend), but does
     * NOT rebuild the live routes: ConfigAdminController does that only after the new access rules are
     * accepted, so a new route can never be live without its rule. Returns the keys that changed.
     */
    @Bean
    Supplier<Set<String>> configRefresher(ContextRefresher contextRefresher) {
        return contextRefresher::refreshEnvironment;
    }
}
