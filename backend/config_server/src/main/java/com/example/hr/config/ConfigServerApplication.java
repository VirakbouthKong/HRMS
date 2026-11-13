package com.example.hr.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.config.server.EnableConfigServer;

/**
 * Central settings for all HRMS services, read from backend/config-repo (one YAML file per service).
 * Holds no secrets: passwords and keys stay in each service's .env and are referenced as ${NAME}.
 */
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}
