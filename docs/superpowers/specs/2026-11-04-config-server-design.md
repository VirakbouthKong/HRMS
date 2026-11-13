# Spring Cloud Config Server — design

Date: 2026-11-04 · Status: builder-checked, waiting for approval

## Why
The teacher's point: without central configuration, changing where an endpoint lives means editing
and redeploying code — including the frontend. With a Config Server, settings live in one place,
the gateway's routes can change **without restarting it**, and the frontend reads its endpoint
paths and switches from the server at start-up, so a moved endpoint needs no frontend redeploy.
It also adds a second Spring Cloud component (Config) next to Spring Cloud Gateway.

## Goals
1. A new **Config Server** service (Spring Cloud Config Server), port **8888**, 7th container.
2. **All 5 services** (api-gateway, auth-service, operation-service, report-service, cron-service)
   load their normal settings from it at start-up instead of from their own `.env`/`application.yaml`.
3. **Gateway routes** live in the Config Server and can be changed **without restarting the gateway**.
4. A public **`GET /api/public/config`** on the gateway returns safe frontend settings, also
   changeable without restarting the gateway.
5. An **admin-only `POST /api/admin/config/refresh`** on the gateway reloads routes, their access
   rules (which roles may call which path) and frontend settings from the Config Server.

## Non-goals
- Live reload of settings inside Auth, Operation, Report or CRON (they read config at start-up;
  a change there needs a restart of that service). No Spring Cloud Bus / RabbitMQ / Kafka.
- Secrets in the Config Server.
- A separate GitHub config repo (option B) — possible later by changing one Config Server setting.
- Building the frontend.

## Anti-goals (would make this a failure even if it works)
- The Config Server, `/api/public/config` or any log handing out a secret.
- Anyone without an ADMIN token being able to change or reload routes.
- Breaking any existing endpoint, the login flow, or the regression tests (write 56, read 182, photo 33).

## Constraints found in the code
- Settings today: each service imports its own `.env` (`spring.config.import: optional:file:...`);
  `docker-compose.yml` also injects values (ports, service URLs, INTERNAL_API_KEY, mail, JWT_TTL, CORS).
- **Secrets** (stay in `.env`, never in the Config Server): `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
  (Neon URL carries credentials), `INTERNAL_API_KEY`, `MAIL_USERNAME`, `MAIL_PASSWORD`,
  `BOOTSTRAP_ADMIN_PASSWORD`. Config files may *reference* them as `${DB_PASSWORD}`; Spring resolves
  the placeholder inside the client service from its own environment.
- `spring.application.name` is inconsistent today: `Auth_Service`, `Report_Service`,
  `operation-service`, `cron-service`, `api-gateway`. The Config Server picks files by this name.
- Operation runs with profile `docker` in Docker (`local-dev` mocks security).
- Gateway routes are in `api_gateway/application.yaml` (4 service routes + 4 Swagger-docs routes),
  plus default filters that strip `X-Internal-Api-Key` / `X-Mock-*` (security-relevant).
- Spring Boot 4.1.0, Spring Cloud 2025.1.3 (gateway already uses its BOM).
- The `frontend` folder is empty: `/api/public/config` only avoids redeploys once the frontend reads it.

## Approaches (where config files live)
| | A. Folder in this repo (chosen) | B. Separate GitHub repo |
|---|---|---|
| How | Config Server "native" profile reads `backend/config-repo/`, mounted into its container | Config Server "git" backend clones e.g. `hrms-config` |
| Change a setting | edit file → admin reload | edit, commit, push → admin reload |
| Setup | none | new repo, token if private, internet |
| Teammate | gets it with `git pull` | immediately on GitHub |

**Chosen: A** (by you) — no new accounts, everything in one project for the teacher; B later = one setting.

## Decided design

### Config Server (`backend/config_server`)
- Spring Boot 4.1.0 + `spring-cloud-config-server` (Spring Cloud 2025.1.3), `@EnableConfigServer`,
  profile `native`, search location = the mounted `config-repo` folder. Port 8888. Actuator health.
- Holds **no secrets**. In Docker: published only on `127.0.0.1:8888` (so services started from
  IntelliJ can use it); everything else reaches it as `http://config-server:8888`.

### Config files (`backend/config-repo/`)
- `application.yml` — shared by all services (e.g. time zone, JPA `show-sql`, common logging).
- `api-gateway.yml` — routes (moved from `application.yaml`, unchanged behaviour, including the
  default filters), JWT issuer/TTL, CORS origins, springdoc settings, service URLs.
- `auth-service.yml`, `operation-service.yml`, `report-service.yml`, `cron-service.yml` — each
  service's non-secret settings; datasource lines reference `${DB_URL}` etc.
- `operation-service-docker.yml` if the Docker profile needs different values.
- `frontend.yml` — the frontend's settings (see below). Read by the gateway only.

### Services
- Each service adds `spring-cloud-starter-config` and
  `spring.config.import: configserver:${CONFIG_SERVER_URL:http://localhost:8888}` (**required**, not
  optional: a missing Config Server stops start-up with a clear error instead of running half-configured).
  Their own `.env` keeps only secrets.
- `spring.application.name` is normalised to `auth-service`, `report-service` (others already fine).
- Docker: every service `depends_on: config-server` with `condition: service_healthy`.
  Values now in `docker-compose.yml` that are not secrets move to the config files.

### Live reload (gateway only)
- `POST /api/admin/config/refresh` (gateway, ADMIN token): asks Spring Cloud to re-read its config
  from the Config Server; routes and `frontend` settings update in place. Response lists which keys
  changed (e.g. `{"success":true,"changed":["frontend.features.payroll", ...]}`).
- Routes are re-read from config, so a route added/changed in `api-gateway.yml` works after the
  refresh, and a route removed stops working — no gateway restart.
- `/actuator/refresh` and other actuator endpoints stay **not exposed**; the admin endpoint is the
  only way in.

### Who may call which path — rules in config (your choice: option 2)
- The role rules that are Java code in `SecurityConfig` today move into `api-gateway.yml` and reload
  with the routes, e.g.
  ```yaml
  app:
    access-rules:            # checked top to bottom, first match wins
      - paths: [/api/auth/reset-password]
        methods: [PUT]
        roles: [ADMIN]
      - paths: [/api/accounts/**, /api/roles/**]
        roles: [ADMIN]
      - paths: [/api/report/**]
        roles: [ADMIN, HR_MANAGER, HR_STAFF]
      - paths: [/api/v1/jobs/history]
        methods: [GET]
        roles: [ADMIN, HR_MANAGER]
      - paths: [/api/v1/jobs/**]
        roles: [ADMIN]
  ```
  A path matching no rule needs any valid token (same as today). The migrated rules must give
  exactly today's results (the 182-check read test proves it).
- **Fixed in Java, never from config** (so a config mistake can't lock everyone out or open
  internals): OPTIONS preflight; health and JWKS; Swagger/docs; `POST /api/auth/login` and
  `/api/auth/verify-otp` public; `GET /api/public/config` public; `/api/internal/**` denied;
  `POST /api/admin/config/refresh` ADMIN; the first-login `PasswordChangeRequiredFilter`.
  These are checked before the config rules.
- **Bad rules are refused:** on refresh, if a rule has an unknown role (not ADMIN, HR_MANAGER,
  HR_STAFF, EMPLOYEE), an empty role list, an invalid path pattern or an unknown HTTP method, the
  refresh answers 400 with the reason and the gateway keeps the previous routes and rules. At start-up
  the same mistake stops the gateway with a clear error.

### `GET /api/public/config` (gateway, no token)
- Returns exactly the `frontend:` section of `frontend.yml`, for example:
  `appName`, `endpoints` (logical name → path, e.g. `myPhoto: /api/auth/me/photo`),
  `features` (on/off switches), `limits` (`photoMaxBytes: 3145728`, `otpResendSeconds: 60`,
  `otpValidMinutes: 5`).
- Never includes anything outside the `frontend:` section.

### Decisions from the builder check (my calls unless marked)
- **Docker vs IntelliJ service URLs:** `api-gateway.yml` holds the `localhost` targets (IntelliJ);
  `api-gateway-docker.yml` overrides them with Docker names (`http://auth-service:8081`, ...). The gateway
  runs with profile `docker` in compose. So "where an endpoint lives" is changed in the config files only.
- **What reloads on refresh (yours, already said):** only routes (incl. default filters) and the
  `frontend` section. JWT issuer/TTL, CORS origins, springdoc and everything else are read once at
  start-up; changing them needs a gateway restart. Documented in the README.
- **No silent overrides:** environment variables beat Config Server values in Spring, so every
  non-secret key is removed from `docker-compose.yml`, the `.env.example` files and the local `.env`
  files; `.env` keeps secrets only. (I will show the `.env` changes before making them.)
- **Baseline:** the current working tree (uncommitted gateway/auth/photo work included).
- **`/api/public/config`:** `permitAll` GET in `SecurityConfig`, answered by a gateway controller
  (controllers win over routes), normal CORS rules apply.
- **Regression tests:** the executor's scratchpad PowerShell scripts (write 56, read 182, photo 33),
  run against Docker as before.

### Running from IntelliJ
- Start the Config Server first (`docker compose up -d config-server`, or run it from IntelliJ),
  then the services as before. README explains this.

## Testing
- Config Server: starts and serves `api-gateway` config; serves no value whose key looks secret.
- Gateway unit tests: `/api/public/config` returns only `frontend` values; refresh endpoint is
  ADMIN-only (401 without token, 403 for other roles) and reports changed keys.
- End-to-end in Docker:
  1. all 7 containers healthy; every existing test still passes (write 56, read 182, photo 33);
  2. **live route demo**: add a new route plus an access rule in `api-gateway.yml` → before refresh
     404, after `POST /api/admin/config/refresh` it works for the allowed role and is 403 for others,
     gateway container start time unchanged; a refresh with a bad rule is refused (400) and the old
     rules keep working;
  3. change a value in `frontend.yml` → refresh → `/api/public/config` shows it;
  4. no secret appears in any Config Server response.

## Left to the builder
Exact list of which non-secret keys move into which file; the demo route used in the test;
how the refresh endpoint triggers Spring Cloud's refresh; Dockerfile/health check details;
README wording.
