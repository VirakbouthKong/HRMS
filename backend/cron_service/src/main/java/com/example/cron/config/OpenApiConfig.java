package com.example.cron.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/** API description at /v3/api-docs, shown in the gateway's Swagger UI (http://localhost:8080/swagger-ui.html). */
@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI cronServiceOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("CRON Service")
                        .version("1.0")
                        .description("Scheduled jobs run automatically (Asia/Phnom_Penh time). "
                                + "Job history: ADMIN or HR_MANAGER. Manual trigger: ADMIN only. "
                                + "Job names: DailyAttendanceSyncJob, ContractExpiryJob, WeeklyReportJob, MonthlyPayrollJob. "
                                + "Warning: triggering a job really runs it on the shared database."))
                // Relative URL: "Try it out" calls go to wherever these docs were loaded from (the gateway).
                .servers(List.of(new Server().url("/").description("API Gateway")))
                .components(new Components().addSecuritySchemes("bearerAuth", new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
