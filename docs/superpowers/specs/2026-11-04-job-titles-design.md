# Job titles — design

Date: 2026-11-04 · Status: waiting for approval (answers collected with the "Job Title Questions" page)

## Why
Every employee has a job in the database (`tbl_employee.job_id` → `tbl_job`), and the Report service
already shows job titles, but the Operation service — where employees are created and edited — ignores
jobs: new employees get none, nobody can see or change a job through the API, and the job list cannot
be managed. Job history (`tbl_jobhistory`) exists but is empty. This makes jobs a real, managed part of
the employee record.

## Goals (the user's answers)
1. Employee responses show the **job title** (title only; no job id in employee responses).
2. **ADMIN, HR_MANAGER, HR_STAFF** set or change an employee's job — the same roles that create/edit
   employees today. A job is **required** when creating an employee.
3. **Job list management:** ADMIN and HR_MANAGER can add, rename and delete job titles; every logged-in
   user can read the list. Deleting a job that employees still have is refused with **409**
   ("Job is still used by N employee(s)").
4. **Job history, automatic:** when an employee's job changes, the current `tbl_jobhistory` row gets an
   end date and a new row starts. HR roles see anyone's history; each employee sees their own.
5. **`GET /api/employees/me`** — the logged-in employee's own record, including job title.
6. **Each job belongs to a department** (`tbl_job.department_id`, new column), and an employee's job must
   be in the employee's department — creating or editing an employee with a mismatching job is refused.
7. Job titles are **information only**: no effect on roles or permissions.
8. Report: **`GET /api/report/employees/job/{jobId}`** — employees with that job.

## Non-goals
- Other ignored `tbl_employee` columns (gender, phone, address, salary, manager) — later.
- Linking jobs to login roles.
- Frontend.

## Data changes (Operation Flyway, approach A — user's choice)
- Repair Operation's Flyway first: add `spring-boot-starter-flyway` (Spring Boot 4 needs it; without it
  Operation's migrations have not run since the upgrade). Only V1 (baseline) and V2 are recorded; V3
  (`contract_end_date`) and V4 (payroll tables) are already in the database but unrecorded. Make V3 and V4
  idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`) so Flyway records them without
  changing anything. Before switching Flyway on, verify the database matches V3/V4 exactly.
- **V5**:
  - `tbl_job.department_id` → `tbl_department(department_id)`; filled for all jobs, then `NOT NULL`.
    Mapping (user-confirmed): IT DEPARTMENT — IT Manager, FrontEnd Developer, IT Tester, BackEnd Developer,
    UX/UI Designer, Software Engineering; CYBERSECURITY — IT Staff, Cyber Manager, Cybersecurity Staff;
    SALE — Outdoor Saler, Indoor Saler, Marketer, Content Creator, Sale Manager; FINANCE — Accounting Staff,
    Finance Staff, Finance Manager; OPERATION — Worker, Team Lead Worker, **Operation Manager (new)**;
    HR — HR Staff, HR Manager; LEADER — CEO.
  - New job **Operation Manager** (OPERATION DEPARTMENT). The one employee who is "HR Manager" while in
    OPERATION DEPARTMENT becomes Operation Manager; HR Manager then has nobody.
  - `tbl_job.job_id` gets an identity default (new jobs need generated ids), like V2 did for other tables.
  - `tbl_jobhistory`: identity default on `jobhistory_id`; one starting row per employee for their current
    job (started_date = migration date, remark "Starting record"), plus for the changed employee a closed
    "HR Manager" row and an open "Operation Manager" row (remark "Job title corrected for department rule").
  - After V5, every employee's job is in their own department (checked by the migration; it fails if not).

## API (Operation; routed through the gateway)
| Method & path | Who | What |
|---|---|---|
| `GET /api/jobs` (optional `?departmentId=`) | any logged-in | job list: id, title, description, department |
| `GET /api/jobs/{jobId}` | any logged-in | one job |
| `POST /api/jobs` | ADMIN, HR_MANAGER | create (title required, unique per department; department required) |
| `PATCH /api/jobs/{jobId}` | ADMIN, HR_MANAGER | rename / change description / change department (refused 409 if employees would then mismatch) |
| `DELETE /api/jobs/{jobId}` | ADMIN, HR_MANAGER | 409 if any employee has it |
| `POST /api/employees`, `PATCH /api/employees/{id}` | HR roles (unchanged) | body gains **`jobId` (required)** and optional `jobChangeRemark`; job must belong to `departmentId` (400) |
| `GET /api/employees`, `GET /api/employees/{id}` | HR roles (unchanged) | response gains **`jobTitle`** |
| `GET /api/employees/me` | any logged-in with an employee | own record (same shape as above) |
| `GET /api/employees/{id}/job-history` | HR roles | history, newest first |
| `GET /api/employees/me/job-history` | any logged-in with an employee | own history |
| `GET /api/report/employees/job/{jobId}` (Report) | ADMIN, HR_MANAGER, HR_STAFF (existing report rule) | employees with that job |

- Roles are enforced in Operation with `@PreAuthorize`, like the existing endpoints. The gateway needs a
  route for `/api/jobs/**` → Operation, added in `config-repo/api-gateway.yml` (live reload; no new access
  rule needed — Operation checks roles).
- `config-repo/frontend.yml` gains `jobs`, `myProfile`, `myJobHistory` endpoint names.
- An account without an employee (e.g. sysadmin) calling `/me` endpoints → 404 "No employee record for this account".

## Decisions from the builder check (my calls)
- **`/me` endpoints:** the employee comes from the JWT's `employeeId` claim. Missing claim, or an employee
  that no longer exists → 404 "No employee record for this account". `/me` is mapped so it never reaches `{id}`.
- **PATCH /api/employees/{id}** already takes the full `EmployeeRequest` (all fields required today), so
  `jobId` is simply one more required field; there are no partial-PATCH callers to break. Changing the
  department means sending a job of the new department, otherwise 400.
- **History:** `started_date` / `end_date` are dates (existing columns). A change closes the open row
  (end_date = today) and opens a new one (started_date = today), even on the same day. Same job + a remark
  → nothing recorded (the remark is ignored). Creating an employee writes the opening row. History items
  show job title, department, started date, end date and remark (no "changed by" column exists — not added).
- **Migration safety:** if the database does not match V3/V4, or if there is not exactly one employee with
  job "HR Manager" in OPERATION DEPARTMENT, V5 stops with an error instead of guessing. The V1/V2 checksums
  are verified (Flyway does this itself) before V5 runs.
- **Report:** Report reads the database directly; the new endpoint returns the same shape as the other
  employee report endpoints (already includes `jobTitle`) and is covered by the existing `/api/report/**`
  access rule.
- **Job rules:** titles are trimmed and unique per department ignoring case (checked in the service).
  Renaming is always allowed; moving a job to another department is refused (409) while employees have it.
  Deleting is refused (409) while employees have it **or** while it appears in anyone's job history, so
  history is never lost.
- **Config:** route and frontend names go into `backend/config-repo/api-gateway.yml` and `frontend.yml`.

## Testing
- TDD unit tests in Operation: job validation (department required, unique title per department), delete
  refused when in use, employee create/update refused when job is in another department, job change writes
  history (closes previous, opens new, remark kept), no history row when job unchanged.
- Migration: run against the shared Neon database; verify mapping, Operation Manager change, history rows,
  and that every employee matches their job's department.
- End-to-end: job list as EMPLOYEE (200) and create as HR_STAFF (403) / HR_MANAGER (201); delete in-use job
  (409); create employee with mismatching job (400); change job → history; `/me` and `/me/job-history`;
  report by job; all earlier regression scripts still pass.

## Left to the builder
Exact error wording, DTO names, Swagger text, how `/me` finds the employee (JWT `employeeId` claim, as the
other `/me` endpoints do).
