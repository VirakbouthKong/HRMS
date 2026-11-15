# HRMS fixes and verification - November 13, 2026

Status (updated November 14): fixes deployed and HRMS started at the user's request, with sequential service startup and per-service memory limits. Frontend port 3000 and API port 8080 respond. Admin login/OTP and authenticated employee, department, leave and attendance-request reads passed. The final exhaustive workflow rerun and visual browser verification remain pending.

## Fixes

| Feature | Change |
|---|---|
| Employee creation | Restored the original V6-V9 migration history and mapped required employee code/hire date fields. New employee records can be inserted against the existing schema. |
| Employee deactivation | Frontend sends the supported INACTIVE status. |
| Leave requests | Maps configured leave types and required database fields, accepts UI labels, records working days excluding weekends/holidays, and allows an administrator without an employee profile to approve/reject with their username recorded. |
| Payroll | Paid leave no longer reduces salary. Payment status/date are saved through an API and survive refresh. Regeneration preserves paid records. Inactive employees are excluded from new payroll. |
| Attendance corrections | Requests and reviews are persisted. Employees can only submit their own requests. Duplicate pending requests, invalid time order and changed punches are rejected. Approval records the reviewer and updates attendance. API errors reach the UI. |
| Account access | Gateway validates the current account and role so deactivated accounts cannot continue using existing tokens. Missing account/role writes return 404; conflicts return 409. |
| Department deletion | Departments containing jobs return a clear 409 instead of a database error. |
| Database schema lookup | Operation Hibernate queries explicitly use the public schema to address intermittent unqualified-table failures. |
| Automations | Weekly reports and contract alerts now send actual messages to the configured SMTP inbox. Delivery errors fail the job instead of reporting false completion. |

V10 adds persisted payroll payments and attendance requests. V11 records leave-review usernames. These are additive migrations; no shared database reset or existing-account password reset is needed.

## Verification

November 14 code-only checks, run sequentially without Docker or a database: **14 backend tests and 5 frontend store checks passed**. Three new leave tests cover UI type labels/working-day persistence, rejection of zero-working-day requests, and administrator approval without an employee link. PowerShell script syntax and git whitespace checks passed.

- Frontend TypeScript/Vite production build: passed (bundle-size warning only).
- Frontend store regression contracts: 5 passed, covering payment persistence, server submission, failure propagation and employee status.
- Earlier fixed-stack workflow run: 225 passed, 0 failed. The latest leave-review changes require the final rerun.
- Backend automated tests: 169 passed (Auth 48, Operation 45, Gateway 66, CRON 2, Report 4, Config Server 4). Logs are in `*-fixed-tests.log` (ignored local evidence).

## Scope and limitations

The disposable `hrms-qa` Docker project uses a local database snapshot, API port 18080 and Mailpit port 18025. Mutating feature workflows run only there, using test accounts. Successful employee and leave creation must go through the API; the workflow script has no direct-insert fallback.

The live demo uses frontend port 3000, gateway 8080 and Mailpit 8025. Live checks cover authentication, reads, authorization, invalid inputs and temporary role/department/job fixtures. No live payroll generation or job trigger is used by the verification scripts.

Chrome access was denied by Computer Use. Visual layout, browser clicks, mobile behavior, browser downloads, printing and language switching remain unverified. Frontend store checks run in Node with controlled API doubles. Passing endpoint checks do not prove every report calculation or chart is correct. SMTP delivery is verified in Mailpit, not an external recipient inbox.

## Initial findings

The initial pass had 158 passing backend tests, a live sweep of 173/179, isolated workflows of 181/191, and five failing frontend contracts. Failures included required employee/leave fields missing from entity inserts, paid annual leave deducted from salary, payment/correction state held only in frontend memory, unsupported TERMINATED status, invalid attendance times, continued access after account deactivation, department foreign-key errors, misleading account/role HTTP statuses and placeholder report automation. The fixes above address these findings.

## Lightweight checks (no Docker)

Run `powershell -ExecutionPolicy Bypass -File backend/tests/verify-code.ps1` from the project. Set `JAVA_HOME` to an installed JDK 21 or newer. Requires Node, frontend dependencies, and cached Maven dependencies. It runs selected regression tests one module at a time in offline mode, with 384 MB Java heap limits, then the frontend store checks. It starts no servers and makes no database changes. This is focused verification, not a replacement for full integration testing.

The interrupted earlier build produced corrupt `hrms-fixed-*` packages; do not use those tags. Current `hrms-*` images were rebuilt from locally packaged JARs using Dockerfile.prebuilt. The live Operation service validated 11 migrations and successfully applied V10 and V11. Full login testing requires several services together; starting them sequentially alone does not reduce their combined running memory.

## Rerunning full verification

- [feature-workflows.mjs](feature-workflows.mjs): real HTTP workflows restricted to disposable QA ports/container names; requires the isolated cloned stack and QA bootstrap account. Do not redirect to the live database.
- [frontend-store-contracts.mjs](frontend-store-contracts.mjs): bundles and exercises the real store with API doubles; run with Node after frontend dependencies are installed.
- [gateway-smoke.ps1](gateway-smoke.ps1): live API sweep; pass a PSCredential for the current administrator because the bootstrap password in `.env` may be stale.
- `feature-workflows-results.json`, `frontend-store-contracts-results.json`, `gateway-smoke-results.json` and local logs are ignored evidence files. This report contains no real passwords or tokens.
