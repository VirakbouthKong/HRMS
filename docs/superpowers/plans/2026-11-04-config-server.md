# Config Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All 5 services read their non-secret settings from a new Spring Cloud Config Server; the gateway's routes, access rules and frontend settings reload without a restart.

**Architecture:** New `backend/config_server` (Config Server, native profile) serves YAML from `backend/config-repo/`. Each service imports `optional:configserver:` with `fail-fast: true` (required in practice; skippable in tests with `spring.cloud.config.enabled=false`). The gateway gets `ContextRefresher`-based `POST /api/admin/config/refresh`, a config-driven `ReactiveAuthorizationManager` for path→role rules, and `GET /api/public/config` reading the live `frontend` section.

**Tech Stack:** Spring Boot 4.1.0, Spring Cloud 2025.1.3 (config-server, starter-config), WebFlux gateway, JUnit 5, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-11-04-config-server-design.md`

## Global Constraints
- Secrets never in `config-repo` or any response: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `SPRING_DATASOURCE_*`, `INTERNAL_API_KEY`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `BOOTSTRAP_ADMIN_*`. Config files may reference them as `${NAME}`.
- Config file names = `spring.application.name`: `api-gateway`, `auth-service`, `operation-service`, `report-service`, `cron-service`, plus `application.yml` (shared), `frontend.yml`, and `*-docker.yml` overrides. All services run profile `docker` in Compose (Operation keeps `local-dev` as its non-Docker default).
- Live reload = gateway routes + `app.access-rules` + `frontend` only.
- Fixed Java rules (never from config): OPTIONS, health, JWKS, Swagger/docs, login + verify-otp public, `GET /api/public/config` public, `/api/internal/**` deny, `POST /api/admin/config/refresh` ADMIN, `PasswordChangeRequiredFilter`.
- Roles allowed in rules: ADMIN, HR_MANAGER, HR_STAFF, EMPLOYEE. First match wins; unmatched path → any valid token.
- Mail host/port/auth/starttls/from stay overridable from `backend/.env` (`${MAIL_HOST:...}` placeholders in config) so the Gmail switch keeps working.
- Do not commit (user preference).

## Review Focus
1. Migrated access rules give exactly today's allow/deny results (182-check read test unchanged).
2. A refresh with an invalid rule (unknown role / empty roles / bad method) → 400, previous rules still enforced.
3. Config Server down at start-up → service fails with a clear error (not half-configured).
4. Leftover env values silently overriding central config (e.g. `SERVER_PORT`, `CORS_ALLOWED_ORIGINS` still in compose/.env).
5. `/api/public/config` never returns keys outside `frontend.*`; Config Server responses contain no secret values.

---

### Task 1: Config Server service + config-repo
**Files:** Create `backend/config_server/` (pom, `ConfigServerApplication.java`, `application.yaml`, Dockerfile, `.dockerignore`, mvnw copied from gateway), `backend/config-repo/*.yml`; test `ConfigServerApplicationTests.java`.
- [ ] Test first: `@SpringBootTest(webEnvironment=RANDOM_PORT)` with `search-locations=file:../config-repo`; `GET /api-gateway/docker` returns property sources containing `spring.cloud.gateway.server.webflux.routes[0].id`; `GET /auth-service/docker` body contains none of the literal secret values from `auth_service/.env` (only `${DB_PASSWORD}`-style placeholders). Run → FAIL (no app).
- [ ] Implement; move every non-secret setting from the 5 services' `application.yaml` and from `docker-compose.yml` into the config files (Docker hostnames in `*-docker.yml`).
- [ ] Run → PASS.

### Task 2: Services become config clients
**Files:** each service `pom.xml` (+ Spring Cloud BOM where missing, `spring-cloud-starter-config`), each `application.yaml` reduced to name + profile + `.env` imports + `optional:configserver:${CONFIG_SERVER_URL:http://localhost:8888}` + `spring.cloud.config.fail-fast: true`; existing context tests get `spring.cloud.config.enabled=false` and load `../config-repo` files via `spring.config.additional-location`.
- [ ] Test first: in each service a context test asserting a value that now only exists in config-repo (e.g. Auth `app.otp.max-attempts` = 5, CRON `operation.service.base-url`) → FAIL before the yaml is trimmed/config added.
- [ ] Implement; rename `Auth_Service`→`auth-service`, `Report_Service`→`report-service`.
- [ ] `mvnw test` green in auth (44), operation (15), report (1), cron (1).

### Task 3: Gateway — config-driven access rules
**Files:** `security/AccessRules.java` (properties `app.access-rules` → compiled, validated snapshot), `security/ConfigAccessManager.java` (`ReactiveAuthorizationManager<AuthorizationContext>`), `SecurityConfig.java` (fixed rules, then `.anyExchange().access(manager)`); tests `AccessRulesTest.java`.
- **Interfaces:** `AccessRules.compile(List<RuleProperties>) -> CompiledRules` throws `InvalidAccessRulesException(message)`; `CompiledRules.decide(HttpMethod, String path) -> Optional<Set<String>>` (empty = no rule → authenticated).
- [ ] Tests first (literal tables): today's 5 rules → `PUT /api/auth/reset-password`=ADMIN, `GET /api/accounts/3`=ADMIN, `GET /api/report/dashboard`=ADMIN/HR_MANAGER/HR_STAFF, `GET /api/v1/jobs/history`=ADMIN/HR_MANAGER, `POST /api/v1/jobs/X/trigger`=ADMIN, `GET /api/employees`=none; first-match order; invalid role / empty roles / bad method / bad pattern rejected; a manager test: EMPLOYEE token on `/api/report/x` → denied, HR_STAFF → granted, no rule → granted for any token.
- [ ] Implement; on refresh keep the last valid snapshot when the new one is invalid and expose `lastError()`.

### Task 4: Gateway — refresh endpoint + public config
**Files:** `pom.xml` (+ `spring-cloud-starter-config`), `application.yaml` trimmed (`spring.cloud.config.name: api-gateway,frontend`), `config/ConfigAdminController.java` (`POST /api/admin/config/refresh`), `config/PublicConfigController.java` (`GET /api/public/config`); tests.
- **Interfaces:** refresh → `200 {success:true, changed:[keys]}` or `400 {success:false, message}` when `AccessRules.lastError()` is set after refresh.
- [ ] Tests first: public config returns only `frontend.*` from the Environment (a non-frontend property is absent); refresh controller with a stub refresher returns changed keys; returns 400 when rules invalid.
- [ ] Implement; wire fixed security rules.

### Task 5: Docker, docs, end-to-end
- [ ] Compose: `config-server` (healthcheck `curl -fs localhost:8888/actuator/health`, volume `./config-repo:/config-repo:ro`, `127.0.0.1:8888`), all services `depends_on: config-server: service_healthy`, `SPRING_PROFILES_ACTIVE: docker`, `CONFIG_SERVER_URL: http://config-server:8888`; remove non-secret env; trim `.env.example` files (show local `.env` changes to the user, do not edit them silently).
- [ ] E2E: 7 containers healthy; regression write 56 / read 182 / photo 33; live demo script: add route `/api/demo/report-dashboard/**` → report with access rule ADMIN → 404 before, 200 ADMIN / 403 EMPLOYEE after refresh, gateway StartedAt unchanged; invalid rule refresh → 400 and old rules hold; `frontend.yml` edit → `/api/public/config` changes; restore files.
- [ ] README: Config Server section (what lives where, how to change routes/rules/frontend settings, how to refresh, IntelliJ start order).
