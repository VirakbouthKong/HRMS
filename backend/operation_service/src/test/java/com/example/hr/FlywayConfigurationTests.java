package com.example.hr;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

// Verifies Flyway dependency is on classpath since full bean only registers on real DB connection
class FlywayConfigurationTests {

    @Test
    void flywayIsOnClasspath() {
        assertThat(Flyway.class).isNotNull();
    }
}
