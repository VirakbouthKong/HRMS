package com.example.hr.gateway.docs;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.Paths;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.parameters.RequestBody;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * The first page of Swagger UI: how to log in and get a token.
 * Login step 1 is forwarded to the Auth service, so it is added here by hand to keep both steps together.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI gatewayOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("HRMS API Gateway: Login & Token")
                        .version("1.0")
                        .description("""
                                All requests go through the gateway at http://localhost:8080.

                                **How to test**
                                1. `POST /api/auth/login` with your username and password. An OTP is emailed \
                                (development: open the Mailpit inbox at http://localhost:8025).
                                2. `POST /api/auth/verify-otp` with the username and the 6-digit code. Copy `token` from the response.
                                3. Click **Authorize** (top right), paste the token (without "Bearer"), click Authorize.
                                4. Pick a service in the **Select a definition** box (top right) and use "Try it out".

                                The token lasts 8 hours and is kept when you refresh the page. What you can call depends on \
                                your role (ADMIN, HR_MANAGER, HR_STAFF, EMPLOYEE); a 403 means your role is not allowed."""))
                .servers(List.of(new Server().url("/").description("API Gateway")))
                .components(new Components().addSecuritySchemes("bearerAuth", new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")));
    }

    /** Puts "Login step 1" first, before the gateway's own verify-otp endpoint. */
    @Bean
    OpenApiCustomizer loginStepOne() {
        return openApi -> {
            ObjectSchema body = new ObjectSchema();
            body.addProperty("userName", new StringSchema().example("sysadmin"));
            body.addProperty("password", new StringSchema().example("your-password"));
            body.setRequired(List.of("userName", "password"));

            Operation login = new Operation()
                    .addTagsItem("Login")
                    .operationId("login")
                    .summary("Step 1: check password and email an OTP")
                    .description("Forwarded to the Auth service. Sends a 6-digit code (valid 5 minutes) to the "
                            + "account's email. Calling it again resends a code, at most once per 60 seconds.")
                    .security(List.of()) // public: no token needed
                    .requestBody(new RequestBody().required(true).content(new Content()
                            .addMediaType("application/json", new MediaType().schema(body))))
                    .responses(new ApiResponses()
                            .addApiResponse("200", new ApiResponse().description("OTP sent (or already sent recently)"))
                            .addApiResponse("401", new ApiResponse().description("Invalid username or password"))
                            .addApiResponse("403", new ApiResponse().description("Account is inactive"))
                            .addApiResponse("503", new ApiResponse().description("The OTP email could not be sent")));

            Paths paths = new Paths();
            paths.addPathItem("/api/auth/login", new PathItem().post(login));
            if (openApi.getPaths() != null) {
                paths.putAll(openApi.getPaths());
            }
            openApi.setPaths(paths);
        };
    }
}
