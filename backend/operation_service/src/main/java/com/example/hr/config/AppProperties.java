package com.example.hr.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.LocalTime;

// Binds app.* properties from application.yaml to typed fields (immutable configuration record)
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String timeZone,
        LocalTime workdayStart,
        LocalTime workdayEnd,
        int lateGraceMinutes,
        String internalApiKey
) {
}
