# HRMS API Gateway

Spring Boot 4.1.0, Java 21, Spring Cloud Gateway Server WebFlux, Spring Security (OAuth2 resource server).

The gateway is the single entry point (`http://localhost:8080`). It:

1. **Issues JWTs.** `POST /api/auth/verify-otp` asks the Auth service whether the emailed
   OTP is correct, then signs an RS256 token (`TokenController`, `TokenService`).
2. **Checks JWTs** on every other request and applies role rules (`security/SecurityConfig`).
3. **Forwards** requests to the right service.
4. **Publishes its public key** at `/.well-known/jwks.json` so the Operation service can check tokens too.

The RSA key pair is created on first start (`security/JwtKeyConfig`) in `JWT_KEY_DIR`
(Docker: the `jwt-keys` volume; IntelliJ: `~/.hrms/jwt-keys`). Never commit it.

## Token contents

```json
{
  "iss": "hrms-api-gateway",
  "sub": "<accountId>",
  "username": "admin",
  "email": "admin@hrms.local",
  "roles": ["ADMIN"],
  "employeeId": 12,
  "iat": 1730000000,
  "exp": 1730028800
}
```

`employeeId` is left out for accounts that are not linked to an employee.

## Routes

| Path | Service | URL variable | Default |
| --- | --- | --- | --- |
| `/api/auth/**`, `/api/accounts/**`, `/api/roles/**` | Auth | `AUTH_SERVICE_URL` | `http://localhost:8081` |
| `/api/report/**` | Report | `REPORT_SERVICE_URL` | `http://localhost:8082` |
| `/api/employees/**`, `/api/departments/**`, `/api/attendance/**`, `/api/leaves/**`, `/api/payroll/**` | Operation | `OPERATION_SERVICE_URL` | `http://localhost:8083` |
| `/api/v1/jobs/**` | CRON | `CRON_SERVICE_URL` | `http://localhost:8084` |

`/api/internal/**` is never routed. The gateway also strips `X-Internal-Api-Key` and
`X-Mock-*` headers from incoming requests.

Role rules, Docker instructions and testing steps are in [`../README.md`](../README.md).
The Postman collection is `HRMS API Gateway.postman_collection.json`.

## Settings

See `.env.example`: `INTERNAL_API_KEY` (must match Auth), `JWT_TTL` (default `8h`),
`JWT_ISSUER`, `JWT_KEY_DIR`, `CORS_ALLOWED_ORIGINS` (frontend URLs).
