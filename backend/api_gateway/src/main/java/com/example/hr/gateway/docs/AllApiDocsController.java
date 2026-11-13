package com.example.hr.gateway.docs;

import io.swagger.v3.oas.annotations.Hidden;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

/**
 * One OpenAPI document with every endpoint of every service, for the "All endpoints" view in Swagger UI.
 * Fetches each service's /v3/api-docs (directly, inside the Docker network) and merges them:
 * - tags become "Auth - Account", "Operation - Leave", ... so endpoints stay grouped by service
 * - schema names get a service prefix (Auth_ApiResponse, Report_ApiResponse) so they cannot clash
 * - a service that is down is skipped and listed in the description
 */
@RestController
public class AllApiDocsController {

    private static final Logger log = LoggerFactory.getLogger(AllApiDocsController.class);
    private static final String SCHEMA_REF = "#/components/schemas/";
    private static final Set<String> HTTP_METHODS = Set.of("get", "put", "post", "delete", "options", "head", "patch", "trace");
    private static final ParameterizedTypeReference<Map<String, Object>> JSON_MAP = new ParameterizedTypeReference<>() {
    };

    private record Source(String name, String url, boolean gatewayItself) {
    }

    private record Fetched(Source source, Map<String, Object> doc) {
    }

    private final List<Source> sources;
    private final WebClient client = WebClient.builder()
            .codecs(c -> c.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
            .build();

    public AllApiDocsController(@Value("${server.port:8080}") int port,
                                // Service addresses from the Config Server (config-repo/api-gateway*.yml)
                                @Value("${hrms.services.auth}") String authUrl,
                                @Value("${hrms.services.operation}") String operationUrl,
                                @Value("${hrms.services.report}") String reportUrl,
                                @Value("${hrms.services.cron}") String cronUrl) {
        // Order here = order of the sections in Swagger UI.
        this.sources = List.of(
                new Source("Gateway", "http://localhost:" + port + "/v3/api-docs", true),
                new Source("Auth", authUrl + "/v3/api-docs", false),
                new Source("Operation", operationUrl + "/v3/api-docs", false),
                new Source("Report", reportUrl + "/v3/api-docs", false),
                new Source("CRON", cronUrl + "/v3/api-docs", false));
    }

    /*
     * Do not end this path with "/v3/api-docs": springdoc looks for a handler whose path ends with
     * the api-docs path to guess a prefix, and would then put "/docs/all" in front of every Swagger URL.
     */
    @Hidden
    @GetMapping(value = "/docs/all/openapi.json", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> allApiDocs() {
        return Flux.fromIterable(sources)
                .concatMap(source -> client.get().uri(source.url()).retrieve()
                        .bodyToMono(JSON_MAP)
                        .timeout(Duration.ofSeconds(10))
                        .map(doc -> new Fetched(source, doc))
                        .onErrorResume(e -> {
                            log.warn("Could not load API docs of {} from {}: {}", source.name(), source.url(), e.getMessage());
                            return Mono.just(new Fetched(source, null));
                        }))
                .collectList()
                .map(this::merge);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> merge(List<Fetched> fetched) {
        Map<String, Object> paths = new LinkedHashMap<>();
        Map<String, Object> schemas = new LinkedHashMap<>();
        Set<String> tagOrder = new LinkedHashSet<>();
        List<String> unavailable = new ArrayList<>();
        String openapiVersion = "3.1.0";

        for (Fetched f : fetched) {
            Source source = f.source();
            if (f.doc() == null) {
                unavailable.add(source.name());
                continue;
            }
            if (f.doc().get("openapi") instanceof String v) {
                openapiVersion = v;
            }
            String prefix = source.gatewayItself() ? "Gateway" : source.name();
            Set<String> serviceTags = source.gatewayItself() ? new LinkedHashSet<>() : new TreeSet<>();

            Map<String, Object> docPaths = (Map<String, Object>) f.doc().getOrDefault("paths", Map.of());
            docPaths.forEach((path, item) -> {
                if (paths.containsKey(path)) {
                    return; // e.g. /api/auth/login is already in the gateway's "Login" section
                }
                Map<String, Object> pathItem = (Map<String, Object>) rewriteRefs(item, prefix);
                pathItem.forEach((method, op) -> {
                    if (!HTTP_METHODS.contains(method) || !(op instanceof Map)) {
                        return;
                    }
                    Map<String, Object> operation = (Map<String, Object>) op;
                    List<String> tags = operation.get("tags") instanceof List<?> t && !t.isEmpty()
                            ? t.stream().map(Object::toString).toList()
                            : List.of(source.name());
                    List<String> newTags = tags.stream()
                            .map(tag -> source.gatewayItself() ? tag : source.name() + " - " + prettyTag(tag))
                            .toList();
                    operation.put("tags", newTags);
                    serviceTags.addAll(newTags);
                    if (operation.get("operationId") instanceof String id) {
                        operation.put("operationId", prefix.toLowerCase() + "_" + id);
                    }
                });
                paths.put(path, pathItem);
            });
            tagOrder.addAll(serviceTags);

            Map<String, Object> components = (Map<String, Object>) f.doc().getOrDefault("components", Map.of());
            Map<String, Object> docSchemas = (Map<String, Object>) components.getOrDefault("schemas", Map.of());
            docSchemas.forEach((name, schema) -> schemas.put(prefix + "_" + name, rewriteRefs(schema, prefix)));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("openapi", openapiVersion);
        result.put("info", Map.of(
                "title", "HRMS API: all endpoints",
                "version", "1.0",
                "description", description(unavailable)));
        result.put("servers", List.of(Map.of("url", "/", "description", "API Gateway")));
        result.put("security", List.of(Map.of("bearerAuth", List.of())));
        result.put("tags", tagOrder.stream().map(name -> Map.of("name", name)).toList());
        result.put("paths", paths);
        result.put("components", Map.of(
                "schemas", schemas,
                "securitySchemes", Map.of("bearerAuth", Map.of(
                        "type", "http", "scheme", "bearer", "bearerFormat", "JWT"))));
        return result;
    }

    /** Changes "$ref": "#/components/schemas/ApiResponse" to "#/components/schemas/Auth_ApiResponse". */
    private static Object rewriteRefs(Object node, String prefix) {
        if (node instanceof Map<?, ?> map) {
            Map<String, Object> out = new LinkedHashMap<>();
            map.forEach((k, v) -> {
                if ("$ref".equals(k) && v instanceof String ref && ref.startsWith(SCHEMA_REF)) {
                    out.put("$ref", SCHEMA_REF + prefix + "_" + ref.substring(SCHEMA_REF.length()));
                } else {
                    out.put(String.valueOf(k), rewriteRefs(v, prefix));
                }
            });
            return out;
        }
        if (node instanceof List<?> list) {
            List<Object> out = new ArrayList<>(list.size());
            list.forEach(item -> out.add(rewriteRefs(item, prefix)));
            return out;
        }
        return node;
    }

    /** "attendance-correction-controller" -> "Attendance Correction" */
    private static String prettyTag(String tag) {
        String base = tag.replaceFirst("-controller$", "");
        return Arrays.stream(base.split("-"))
                .filter(w -> !w.isEmpty())
                .map(w -> Character.toUpperCase(w.charAt(0)) + w.substring(1))
                .collect(Collectors.joining(" "));
    }

    private static String description(List<String> unavailable) {
        String text = """
                Every endpoint of every service, all called through the gateway at http://localhost:8080.

                **How to test**
                1. **Login: POST /api/auth/login** with username + password. The OTP is emailed \
                (development: Mailpit inbox at http://localhost:8025).
                2. **Login: POST /api/auth/verify-otp** with the 6-digit code. Copy `token` from the response.
                3. Click **Authorize** (top right), paste the token (without "Bearer"), click Authorize.
                4. Use any endpoint below. Type in the **Filter by tag** box to find a section quickly \
                (e.g. "Report" or "Leave").

                Sections are named "Service - Area". A 403 means your role is not allowed. \
                Careful: **CRON - Job Execution: trigger** really runs the job.""";
        if (!unavailable.isEmpty()) {
            text += "\n\n**Note:** not shown because the service did not respond: **" + String.join(", ", unavailable)
                    + "**. Start it and refresh this page.";
        }
        return text;
    }
}
