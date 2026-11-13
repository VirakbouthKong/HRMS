# Gateway verification

Latest verification: 2026-11-05, Docker Compose, gateway at `http://localhost:8080`.

## Verified

- All seven Compose services running (Config Server, Mailpit, and five application services).
- Health, Swagger UI, merged OpenAPI, four downstream OpenAPI documents, public frontend
  configuration, gateway OpenAPI, and JWKS return HTTP 200.
- The merged OpenAPI document contains 83 HTTP operations.
- All 79 protected documented operations reject requests without a token (HTTP 401).
- Automated Maven tests: Auth 45, Report 4, Operation 35, CRON 2, Gateway 63.
  Total: **149 tests, no failures or errors**.

## Pending

The configured bootstrap admin password is rejected by the existing account (HTTP 401).
Bootstrap configuration creates missing accounts; it does not reset an existing password.
Authenticated live reads and write workflows have **not** been verified in this run.
No existing account password was reset and no valid payroll generation or scheduled job
was triggered by this verification.

## Resume the live checks

From `backend`, with the current admin credentials:

```powershell
$credential = Get-Credential -UserName sysadmin
./tests/gateway-smoke.ps1 -Credential $credential
```

The script tests public endpoints and unauthenticated access for every protected documented
operation, then logs in, obtains the OTP from local Mailpit, tests authenticated reads and
invalid requests, and creates/deletes uniquely named role, department and job fixtures.
It writes `gateway-smoke-results.json` (ignored by Git) without logging tokens or passwords.
It requires Mailpit as the configured SMTP destination. It does not perform valid payroll/job
execution, attendance changes, account/password changes, or upload/delete an existing photo.
Those workflows require additional isolated test fixtures and are not full success-path
coverage merely because their unauthenticated requests are rejected.

Service Maven output is saved in the ignored `*_service.log` and `api_gateway.log` files.
