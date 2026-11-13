# Job Titles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jobs become a managed part of employees in Operation: job list CRUD, job required and department-matched on employees, automatic job history, `/me` endpoints, and a Report "employees by job" endpoint.

**Architecture:** New `com.example.hr.job` package in Operation (entity `Job` → `tbl_job`, `JobHistory` → `tbl_jobhistory`, service, controller), `Employee` gains `job`; Operation's Flyway is repaired (starter added, V3/V4 idempotent) and V5 changes the schema/data; Report gets one endpoint; the gateway route comes from `config-repo/api-gateway.yml`.

**Tech Stack:** Spring Boot 4.1.0, Spring Data JPA, Flyway (PostgreSQL), JUnit 5 + `@DataJpaTest` on H2 (existing pattern), Docker.

**Spec:** `docs/superpowers/specs/2026-11-04-job-titles-design.md`

## Global Constraints
- Roles: manage jobs = `ADMIN`, `HR_MANAGER`; read jobs = any logged-in; set employee job = `ADMIN`, `HR_MANAGER`, `HR_STAFF`.
- Employee responses carry `jobTitle` only (no `jobId`). Requests carry `jobId` (required) and optional `jobChangeRemark`.
- Job must belong to the employee's department → 400 `"Job <title> belongs to <dept>, not <dept>."`.
- Delete job refused (409) if any employee or any job-history row uses it. Moving a job to another department refused (409) while employees have it. Titles trimmed, unique per department ignoring case (409).
- History: change closes open row (`end_date` = today) and opens new (`started_date` = today, remark); create writes opening row; same job → no row.
- `/me` endpoints: employee from JWT `employeeId` claim; missing claim or unknown employee → 404 `"No employee record for this account."`.
- Migration fails rather than guesses (DB ≠ V3/V4, or not exactly 1 "HR Manager" in OPERATION DEPARTMENT).
- Do not commit (user preference).

## Review Focus
1. Changing an employee's department without changing their job → 400, nothing saved. (Task 3 test `update_departmentChangeWithOldJobIs400`.)
2. Same job sent again with a remark → no extra history row. (Task 3 `update_sameJobWritesNoHistory`.)
3. Job title "  hr staff " in a department that has "HR Staff" → 409 duplicate. (Task 2 `create_duplicateTitleIgnoringCaseAndSpaces409`.)
4. Deleting a job only present in history (no current employees) → 409. (Task 2 `delete_jobInHistoryIs409`.)
5. `GET /api/employees/me` by sysadmin (no employeeId) → 404, not 500. (Task 4 E2E + controller test.)

---

### Task 1: Repair Operation Flyway + V5 migration
**Files:** `operation_service/pom.xml` (+ `org.springframework.boot:spring-boot-starter-flyway`); `db/migration/V3__…sql`, `V4__…sql` (idempotent); create `db/migration/V5__jobs_department_and_history.sql`.
- [ ] Read-only check: DB has `tbl_employee.contract_end_date` (date) and `tbl_payroll_profile`/`tbl_payroll_record` with V4's columns. If not → stop and report.
- [ ] V3: `ADD COLUMN IF NOT EXISTS`; V4: `CREATE TABLE IF NOT EXISTS`.
- [ ] V5 (plpgsql `DO` blocks where checks are needed): add `tbl_job.department_id` FK; identity default on `tbl_job.job_id` and `tbl_jobhistory.jobhistory_id` (sequence restarted after current max); insert Operation Manager (OPERATION DEPARTMENT); set every job's department per the spec mapping (by trimmed title); `department_id SET NOT NULL`; assert exactly one employee with job HR Manager in OPERATION DEPARTMENT, insert her closed HR Manager history row + open Operation Manager row (remark "Job title corrected for department rule"), switch her job; opening history row ("Starting record", today) for every other employee; final assert: no employee whose job's department ≠ employee's department.
- [ ] Run Operation's app against Neon once (`mvnw spring-boot:run` or Docker): log shows V3, V4, V5 applied; read-only query confirms mapping, Operation Manager change, 29 history rows, 0 mismatches.

### Task 2: Job entity, repository, service
**Files:** create `job/Job.java`, `job/JobRepository.java`, `job/JobHistory.java`, `job/JobHistoryRepository.java`, `job/JobService.java`, `job/dto/JobRequest.java`, `job/dto/JobResponse.java`, `job/exception/{JobNotFoundException,DuplicateJobException,JobInUseException}.java`; modify `common/exception/ApiExceptionHandler.java` (404 / 409 / 409); test `job/JobServiceTests.java` (`@DataJpaTest`, H2, flyway off, like `DepartmentServiceTests`).
**Interfaces:**
- `Job(String title, String description, Department department)`; getters `getJobId()`, `getJobTitle()`, `getDescription()`, `getDepartment()`.
- `JobHistory(Employee employee, Job job, LocalDate startedDate, String remark)`; `close(LocalDate endDate)`.
- `JobHistoryRepository.findFirstByEmployeeEmployeeIdAndEndDateIsNull(Integer)`, `findByEmployeeEmployeeIdOrderByStartedDateDescJobHistoryIdDesc(Integer)`, `existsByJobJobId(Integer)`.
- `record JobRequest(@NotBlank String jobTitle, String description, @NotNull Integer departmentId)`; `record JobResponse(Integer jobId, String jobTitle, String description, Integer departmentId, String departmentName)`.
- `JobService`: `List<JobResponse> list(Integer departmentIdOrNull)`, `JobResponse get(Integer)`, `JobResponse create(JobRequest)`, `JobResponse update(Integer, JobRequest)`, `void delete(Integer)`.
- [ ] Tests first: `create_savesTrimmedTitleInDepartment`, `create_duplicateTitleIgnoringCaseAndSpaces409`, `create_sameTitleInOtherDepartmentAllowed`, `update_renameAllowedWithEmployees`, `update_moveDepartmentWithEmployees409`, `delete_unusedJob`, `delete_jobWithEmployeesIs409` (message contains "2 employee"), `delete_jobInHistoryIs409`, `list_filtersByDepartment`. Run → FAIL. Implement. Run → PASS.

### Task 3: Employees get a job (+ history)
**Files:** modify `employee/Employee.java` (`@ManyToOne job`, `changeJob(Job)`), `employee/dto/EmployeeRequest.java` (+ `@NotNull Integer jobId`, `String jobChangeRemark`), `employee/dto/EmployeeResponse.java` (+ `String jobTitle`), `employee/EmployeeService.java`; test `employee/EmployeeJobTests.java` (`@DataJpaTest`).
**Interfaces:** `EmployeeService.getMyEmployee(Integer employeeIdOrNull)`; `List<JobHistoryResponse> jobHistory(Integer employeeId)` with `record JobHistoryResponse(String jobTitle, String departmentName, LocalDate startedDate, LocalDate endDate, String remark)`; `EmployeeNotLinkedException` → 404 "No employee record for this account.".
- [ ] Tests first: `create_requiresJobOfSameDepartment` (other-dept job → `IllegalArgumentException`/400), `create_writesOpeningHistory`, `update_jobChangeClosesAndOpensHistoryWithRemark`, `update_sameJobWritesNoHistory`, `update_departmentChangeWithOldJobIs400` (and nothing saved), `response_hasJobTitle`, `me_withoutEmployeeIdIs404`. Existing Operation tests updated where they build `Employee`/`EmployeeRequest`. Run → FAIL → implement → PASS; full Operation suite green.

### Task 4: Endpoints, gateway route, report, frontend config
**Files:** create `job/JobController.java` (`/api/jobs`), modify `employee/EmployeeController.java` (`/me`, `/me/job-history`, `/{id}/job-history`, mapped before `/{employeeId}`), Report `EmployeeReportController` + service + repository (`findByJob_JobId`), `config-repo/api-gateway.yml` (operation route + `/api/jobs/**`), `config-repo/frontend.yml` (`jobs`, `myProfile`, `myJobHistory`), README.
- [ ] Report test first (unit, Mockito repository, matching existing report style) for `getEmployeesByJob(jobId)`.
- [ ] Docker rebuild operation, report; refresh gateway config (no restart).
- [ ] E2E script: EMPLOYEE `GET /api/jobs` 200; HR_STAFF `POST /api/jobs` 403; HR_MANAGER create/rename/delete 201/200/204; delete in-use 409; create employee with other-dept job 400 (via guard-safe body; no permanent employee created unless cleaned up — use an existing employee PATCH back-and-forth); job change → `/{id}/job-history` shows closed + open rows; `/me` + `/me/job-history` for a temp EMPLOYEE account; sysadmin `/me` 404; `GET /api/report/employees/job/{id}` 200; Swagger lists new endpoints; regression write 56 / read 182 / photo 33 / config-demo 21 pass.
