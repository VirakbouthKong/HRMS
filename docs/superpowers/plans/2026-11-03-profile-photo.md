# Profile Photo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every user can upload/replace/remove their own profile photo (stored with their account), and anyone logged in can see any employee's photo as their icon, with a default avatar when there is none.

**Architecture:** Photos live in a new Auth table `tbl_account_photo`. Auth gains Flyway (own history table) for the table and a unique rule "one account per employee". The gateway owns the "me" endpoints (account id from the JWT) and forwards image bytes to new Auth internal endpoints; `GET /api/photos/employees/{id}` is a normal Auth endpoint routed by the gateway.

**Tech Stack:** Spring Boot 4.1.0, Java 21, Spring MVC + JPA (Auth), Spring Cloud Gateway WebFlux (gateway), Flyway, PostgreSQL (Neon), JUnit 5 + Mockito + AssertJ.

**Spec:** `docs/superpowers/specs/2026-11-03-profile-photo-design.md`

## Global Constraints

- Allowed types: JPG, PNG, WebP, detected from the file's first bytes (never the name or declared type).
- Max size: **3 MB** = 3 × 1024 × 1024 = **3,145,728 bytes**. Bigger → `413`; empty or wrong type → `400`; body `{success:false, message}`.
- Whose photo is changed always comes from the JWT (`sub` = accountId), never from the request.
- Default avatar headers: `X-Default-Avatar: true|false`; all photo responses `Cache-Control: private, max-age=300`.
- Auth Flyway history table: `flyway_auth_history`; never touch Operation's `flyway_schema_history`.
- One employee → at most one account; accounts with `employee_id NULL` stay allowed (e.g. `sysadmin`).
- First-login tokens (`pwdChangeRequired`) may call `GET /api/auth/me/photo` but not upload/delete.
- Do **not** commit until the user says so (user preference overrides the commit steps below: stage nothing, just run tests).

## Review Focus

1. A file renamed `.png` that is really a PDF/ZIP → `400`, nothing stored. (Task 2 test `detect_rejectsPdfRenamedPng`.)
2. Exactly 3,145,728 bytes is accepted; 3,145,729 → `413`. (Task 3 tests at the boundary; Task 6 gateway limit test.)
3. Upload with no `file` part or an empty file → `400`, not `500`. (Task 6 `upload_missingFileIs400`, Task 3 `save_emptyIs400`.)
4. `GET /api/photos/employees/{id}` for an employee with no account, or an id that does not exist → `200` silhouette, never 404/500. (Task 3 `employeePhoto_noAccountIsSilhouette`.)
5. Usernames that are not plain ASCII words (Khmer `សុខា`, `___`, `admin2`) still produce a valid avatar. (Task 2 initials tests.)

---

### Task 0: Remove the duplicate test account

**Files:** none (data only, shared Neon DB)

- [ ] **Step 1:** As `sysadmin` (token via login + verify-otp), call `DELETE /api/accounts/2` (`admin2`). Expected: `{"success":true,"message":"Account deleted successfully."}`.
- [ ] **Step 2:** Read-only query (scratchpad `FirstLogins.java`): no two accounts share an `employee_id`. Expected: `admin` → 1, `sysadmin` → null, nothing else duplicated.

### Task 1: Auth schema — Flyway, photo table, one-account-per-employee index

**Files:**
- Modify: `backend/auth_service/pom.xml` (add `org.springframework.boot:spring-boot-starter-flyway`, `org.flywaydb:flyway-database-postgresql`)
- Modify: `backend/auth_service/src/main/resources/application.yaml` (`spring.flyway.table: flyway_auth_history`, `baseline-on-migrate: true`, `baseline-version: 1`)
- Create: `backend/auth_service/src/main/resources/db/migration/V2__account_photo_and_one_account_per_employee.sql`
- Create: `backend/auth_service/src/main/java/HRMS/Auth_Service/entity/AccountPhoto.java`
- Create: `backend/auth_service/src/main/java/HRMS/Auth_Service/repository/AccountPhotoRepository.java`
- Modify: `backend/auth_service/src/main/java/HRMS/Auth_Service/repository/AccountRepository.java`

**Interfaces:**
- Produces: `AccountPhoto { Integer accountId (@Id); String contentType; byte[] data (bytea); LocalDateTime updatedDate }`, table `tbl_account_photo`.
- Produces: `AccountPhotoRepository extends JpaRepository<AccountPhoto, Integer>`.
- Produces: `AccountRepository.findByEmployeeId(Integer): Optional<Account>`, `AccountRepository.existsByEmployeeId(Integer): boolean`.

- [ ] **Step 1:** Write the migration:
  `tbl_account_photo(account_id INTEGER PRIMARY KEY REFERENCES tbl_account(account_id) ON DELETE CASCADE, content_type VARCHAR(20) NOT NULL, data BYTEA NOT NULL, updated_date TIMESTAMP NOT NULL)` and
  `CREATE UNIQUE INDEX uq_account_employee_id ON tbl_account(employee_id) WHERE employee_id IS NOT NULL`.
- [ ] **Step 2:** Run `.\mvnw.cmd test` in `auth_service` (its `contextLoads` connects to Neon, runs Flyway, then Hibernate `validate`). Expected: `Tests run: 11, Failures: 0`, log shows `Successfully applied 1 migration ... v2` and `flyway_auth_history` exists.
- [ ] **Step 3:** Run again. Expected: Flyway reports schema up to date (no re-apply), still green.

### Task 2: Image type detection and default avatar (pure functions)

**Files:**
- Create: `backend/auth_service/src/main/java/HRMS/Auth_Service/util/ImageType.java`
- Create: `backend/auth_service/src/main/java/HRMS/Auth_Service/util/DefaultAvatar.java`
- Test: `backend/auth_service/src/test/java/HRMS/Auth_Service/util/ImageTypeTest.java`, `DefaultAvatarTest.java`

**Interfaces:**
- Produces: `enum ImageType { JPEG("image/jpeg"), PNG("image/png"), WEBP("image/webp"); String contentType(); static Optional<ImageType> detect(byte[] bytes) }`
- Produces: `DefaultAvatar.initials(String userName): String`, `DefaultAvatar.forUser(String userName): byte[]` (UTF-8 SVG), `DefaultAvatar.silhouette(): byte[]` (UTF-8 SVG), `DefaultAvatar.CONTENT_TYPE = "image/svg+xml"`.

- [ ] **Step 1: Write failing tests**
  - `detect_jpeg` bytes `FF D8 FF E0 ..` → `JPEG`; `detect_png` `89 50 4E 47 0D 0A 1A 0A ..` → `PNG`; `detect_webp` `"RIFF" + 4 any + "WEBP"` → `WEBP`.
  - `detect_rejectsPdfRenamedPng` `"%PDF-1.7"` → empty; `detect_rejectsRiffThatIsNotWebp` `"RIFF....WAVE"` → empty; `detect_tooShort` 2 bytes → empty; `detect_null` → empty.
  - `initials("test_dara") == "TD"`, `initials("sysadmin") == "S"`, `initials("admin2") == "A"`, `initials("rina.ly") == "RL"`, `initials("___") == "?"`, `initials("សុខា")` equals the first code point `"ស"`, `initials("a_b_c") == "AB"`.
  - `forUser("test_dara")` is an SVG containing `>TD<`; same username → identical bytes twice (stable colour); `silhouette()` starts with `<svg`.
- [ ] **Step 2:** Run `.\mvnw.cmd test "-Dtest=ImageTypeTest,DefaultAvatarTest"`. Expected: compile failure / FAIL (classes missing).
- [ ] **Step 3:** Implement. Initials: split on `[^\p{L}\p{N}]+`, keep non-empty parts, take the first **code point** of up to two parts, upper-case; none → `"?"`. Colour: one of 8 fixed hex colours chosen by `Math.floorMod(userName.hashCode(), 8)`. XML-escape the initials.
- [ ] **Step 4:** Re-run. Expected: all pass.

### Task 3: Photo service

**Files:**
- Create: `backend/auth_service/src/main/java/HRMS/Auth_Service/service/PhotoService.java`
- Create: `backend/auth_service/src/main/java/HRMS/Auth_Service/service/impl/PhotoServiceImpl.java`
- Create: `backend/auth_service/src/main/java/HRMS/Auth_Service/dto/response/PhotoResult.java`
- Test: `backend/auth_service/src/test/java/HRMS/Auth_Service/service/impl/PhotoServiceImplTest.java`

**Interfaces:**
- Consumes: Task 1 repositories; Task 2 `ImageType`, `DefaultAvatar`; existing `AuthException(HttpStatus, String)`.
- Produces: `record PhotoResult(byte[] data, String contentType, boolean isDefault)`.
- Produces: `PhotoService`:
  - `void save(Integer accountId, byte[] data)` — 400 empty/wrong type, 413 over 3,145,728 bytes, 401 unknown account; upserts.
  - `PhotoResult forAccount(Integer accountId)` — stored photo, else `DefaultAvatar.forUser(userName)`; unknown account → 401.
  - `PhotoResult forEmployee(Integer employeeId)` — photo or initials of the linked account, else `silhouette()`.
  - `void delete(Integer accountId)` — idempotent (no photo is fine).
- `static final int MAX_BYTES = 3 * 1024 * 1024;`

- [ ] **Step 1: Write failing tests** (mock repositories; real `ImageType`/`DefaultAvatar`)
  - `save_storesPngWithDetectedContentType` → saved entity has `contentType == "image/png"`, same bytes.
  - `save_acceptsExactly3MB` (3,145,728-byte array starting with PNG header) → saved.
  - `save_rejects3MBPlusOneWith413` (3,145,729 bytes) → `AuthException` status `PAYLOAD_TOO_LARGE`, nothing saved.
  - `save_emptyIs400`, `save_pdfIs400` → `BAD_REQUEST`, nothing saved.
  - `save_unknownAccountIs401`.
  - `forAccount_returnsStoredPhoto` (`isDefault == false`); `forAccount_noPhotoReturnsInitials` (`isDefault == true`, content type `image/svg+xml`, contains `>TD<` for `test_dara`).
  - `employeePhoto_returnsLinkedAccountPhoto`; `employeePhoto_noAccountIsSilhouette` (isDefault true); `employeePhoto_accountWithoutPhotoIsInitials`.
  - `delete_removesPhoto`; `delete_withoutPhotoDoesNothing`.
- [ ] **Step 2:** Run `.\mvnw.cmd test "-Dtest=PhotoServiceImplTest"`. Expected: FAIL.
- [ ] **Step 3:** Implement `PhotoServiceImpl` (`@Service`, `@Transactional` on writes).
- [ ] **Step 4:** Re-run. Expected: pass.

### Task 4: One account per employee on create

**Files:**
- Modify: `backend/auth_service/src/main/java/HRMS/Auth_Service/service/impl/AccountServiceImpl.java` (`createAccount`)
- Test: `backend/auth_service/src/test/java/HRMS/Auth_Service/service/impl/AccountServiceImplTest.java`

**Interfaces:** Consumes `AccountRepository.existsByEmployeeId(Integer)` (Task 1).

- [ ] **Step 1: Write failing tests**
  - `create_refusesEmployeeThatAlreadyHasAccount` → `ApiResponse(success=false, message="This employee already has an account.")`, `save` never called.
  - `create_allowsEmployeeWithoutAccount` → success, saved once.
- [ ] **Step 2:** Run `.\mvnw.cmd test "-Dtest=AccountServiceImplTest"`. Expected: first test FAILS (currently saved).
- [ ] **Step 3:** Add the check after the email check, before role lookup.
- [ ] **Step 4:** Re-run. Expected: pass.

### Task 5: Auth photo endpoints

**Files:**
- Create: `backend/auth_service/src/main/java/HRMS/Auth_Service/controller/InternalPhotoController.java`
- Create: `backend/auth_service/src/main/java/HRMS/Auth_Service/controller/PhotoController.java`

**Interfaces:**
- Consumes: `PhotoService`, `PhotoResult` (Task 3).
- Produces (internal, X-Internal-Api-Key, used by Task 6):
  - `GET /api/internal/photos/accounts/{accountId}` → image bytes, `Content-Type` = result type, headers per Global Constraints.
  - `PUT /api/internal/photos/accounts/{accountId}` body = raw image bytes (`application/octet-stream`) → `200 {success:true,message:"Photo updated."}`.
  - `DELETE /api/internal/photos/accounts/{accountId}` → `200 {success:true,message:"Photo removed."}`.
  - `AuthException` → its status + `{success:false,message}`.
- Produces (routed): `GET /api/photos/employees/{employeeId}` → same image response; Swagger tag `Photo`.

- [ ] **Step 1:** Implement both controllers (thin; share one `toResponse(PhotoResult)` helper). Covered end-to-end in Task 7.
- [ ] **Step 2:** `.\mvnw.cmd test` in `auth_service`. Expected: all tests pass (11 existing + Tasks 2–4).

### Task 6: Gateway — my-photo endpoints, routing, limits

**Files:**
- Create: `backend/api_gateway/src/main/java/com/example/hr/gateway/auth/MyPhotoController.java`
- Modify: `backend/api_gateway/src/main/java/com/example/hr/gateway/security/PasswordChangeRequiredFilter.java` (allow `GET /api/auth/me/photo`)
- Modify: `backend/api_gateway/src/main/resources/application.yaml` (auth route adds `/api/photos/**`; `spring.webflux.multipart.max-disk-usage-per-part: 4MB`)
- Modify: `backend/api_gateway/src/test/java/com/example/hr/gateway/auth/FakeAuthService.java` (binary replies with headers; record sent bytes)
- Test: `backend/api_gateway/src/test/java/com/example/hr/gateway/auth/MyPhotoControllerTest.java`, `PasswordChangeRequiredFilterTest.java`

**Interfaces:**
- Consumes: Task 5 internal endpoints; existing `authWebClient`, `AuthReplies`.
- Produces: `MyPhotoController(@Qualifier("authWebClient") WebClient)` with
  - `Mono<ResponseEntity<byte[]>> myPhoto(Jwt jwt)` — `GET /api/auth/me/photo`, copies `Content-Type`, `X-Default-Avatar`, `Cache-Control` from Auth.
  - `Mono<ResponseEntity<Object>> upload(Jwt jwt, FilePart file)` — `PUT /api/auth/me/photo`, `multipart/form-data`, part `file`; reads at most 3,145,728 bytes (`DataBufferUtils.join(content, MAX_BYTES)`), over → `413` without calling Auth; sends bytes to Auth.
  - `Mono<ResponseEntity<Object>> delete(Jwt jwt)` — `DELETE /api/auth/me/photo`.
  - Auth down → `503` via `AuthReplies.authUnavailable()`.

- [ ] **Step 1: Write failing tests**
  - `myPhoto_asksAuthForAccountInToken` → sent `GET /api/internal/photos/accounts/12`; response bytes, `Content-Type`, `X-Default-Avatar` equal Auth's.
  - `upload_sendsFileBytesForAccountInToken` → sent `PUT /api/internal/photos/accounts/12`, sent bytes == file bytes.
  - `upload_over3MBIs413WithoutCallingAuth` (3,145,729 bytes) → 413, `sentPath == null`.
  - `upload_missingFileIs400` (null part) → 400, Auth not called.
  - `upload_passesAuth400Back` (Auth replies 400 "Only JPG, PNG or WebP images are allowed.") → 400 same message.
  - `delete_forAccountInToken` → sent `DELETE /api/internal/photos/accounts/12`.
  - `authDownIs503` for upload.
  - Filter: `firstLoginUser_canViewOwnPhoto` (GET allowed), `firstLoginUser_cannotUploadPhoto` (PUT blocked).
- [ ] **Step 2:** `.\mvnw.cmd test` in `api_gateway`. Expected: new tests FAIL.
- [ ] **Step 3:** Implement; add route + multipart config; Swagger: tag `My account`, upload documented as multipart with a binary `file`.
- [ ] **Step 4:** Re-run. Expected: all gateway tests pass (17 existing + new).

### Task 7: Docs, Docker, end-to-end

**Files:**
- Modify: `backend/README.md` (photo endpoints, limits, default avatar, frontend `fetch` → `URL.createObjectURL` example)
- Modify: `backend/api_gateway/HRMS API Gateway.postman_collection.json` (my photo GET/PUT/DELETE, employee photo)
- Create (scratchpad, not in repo): `photo-test.ps1`

- [ ] **Step 1:** `docker compose up --build -d auth-service api-gateway`; both healthy; Auth log shows Flyway up to date.
- [ ] **Step 2:** `photo-test.ps1` (creates and deletes its own account), all PASS:
  default initials SVG for new account → upload PNG → own photo returns PNG, `X-Default-Avatar: false` → sysadmin sees it via `/api/photos/employees/{id}` → replace with JPEG → content type changes → `.png`-named PDF `400` → 3 MB + 1 byte `413` → delete → initials again → employee without account → silhouette → second account for same employee refused → first-login token: view `200`, upload `403 PASSWORD_CHANGE_REQUIRED` → delete account → employee shows silhouette.
- [ ] **Step 3:** Regression: `write-test.ps1` (56) and `full-test.ps1` (182) all PASS; `.\mvnw.cmd test` green in auth_service and api_gateway.
- [ ] **Step 4:** Swagger one-page view lists the 4 photo endpoints; upload works from "Try it out".
