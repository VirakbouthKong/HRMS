# HRMS backend

| Service | Port | Reachable from your PC in Docker? |
| --- | --- | --- |
| API Gateway | 8080 | ✅ the only entry point: call everything through `http://localhost:8080` |
| Auth | 8081 | ❌ internal |
| Report | 8082 | ❌ internal |
| Operation | 8083 | ❌ internal |
| CRON | 8084 | ❌ internal |
| Config Server | 8888 | only `127.0.0.1` (for services started from IntelliJ) |
| Mailpit (test inbox) | 8025 | ✅ `http://localhost:8025` |

All services use the shared Neon PostgreSQL database. Their settings come from the **Config Server**
(files in `backend/config-repo`); each service's `.env` holds only secrets.

## Config Server (Spring Cloud Config)

```
backend/config-repo/            <- edit settings here
  application.yml               shared by every service
  api-gateway.yml               routes, access rules, JWT, CORS, Swagger    (+ api-gateway-docker.yml)
  frontend.yml                  what the frontend may know: endpoint paths, features, limits
  auth-service.yml              (+ auth-service-docker.yml)
  operation-service.yml         (+ operation-service-docker.yml)
  report-service.yml
  cron-service.yml              (+ cron-service-docker.yml)
```

- Every service asks the Config Server (`config-server:8888`) for `<its-name>.yml` when it starts.
  In Docker they run with profile `docker`, which adds `<its-name>-docker.yml` (container host names).
- **Secrets are never in these files.** They stay in each service's `.env` / `backend/.env` and the
  files only reference them, e.g. `password: ${DB_PASSWORD}`.
- If the Config Server is not running, the services refuse to start (`fail-fast`) instead of running
  half-configured; Docker restarts them until it is back.

**Change without restarting** (gateway routes, access rules, frontend settings):
1. Edit `config-repo/api-gateway.yml` (routes under `spring.cloud.gateway...routes`, who may call which
   path under `app.access-rules`) or `config-repo/frontend.yml`.
2. Log in as ADMIN and call **`POST /api/admin/config/refresh`** (Swagger section "Config (admin)").
   The answer lists the changed settings. New routes and rules work immediately; the gateway is not restarted.
3. A mistake in the rules (unknown role, empty list, bad path or method) is refused with `400` and
   the previous rules stay in force.

Access rules are checked top to bottom (first match wins); a path with no rule needs any valid token.
Login, OTP, health, Swagger, `/api/public/config`, `/api/internal/**` (always blocked) and the refresh
endpoint itself are fixed in `SecurityConfig` and cannot be changed from config.

**Frontend:** `GET /api/public/config` (no token) returns the `frontend:` section of `frontend.yml`.
The frontend reads it when it starts, so endpoint paths and feature switches can change without
redeploying the frontend.

**Other settings** (ports, JWT lifetime, CORS, OTP timing, Auth/Operation/Report/CRON settings) are
read at start-up: edit the file, then restart that service (`docker compose restart <service>`).

## Run with Docker (recommended)

1. Start **Docker Desktop**.
2. Make sure each service folder has its `.env` with its **secrets** (copy from `.env.example`).
3. Copy `backend/.env.example` to `backend/.env` and fill in `INTERNAL_API_KEY`
   and the bootstrap admin password.
4. From the `backend` folder:

```powershell
docker compose up --build -d      # build and start everything (the Config Server starts first)
docker compose ps                 # all 7 containers should be "Up" (config-server "healthy")
docker compose logs -f api-gateway auth-service   # watch logs (Ctrl+C to stop watching)
docker compose down               # stop everything
```

After changing Java code, run `docker compose up --build -d` again.

## How login works

```
1. POST /api/auth/login        { "userName", "password" }  -> OTP emailed (no token yet)
2. POST /api/auth/verify-otp   { "userName", "otpCode" }   -> { "token": "eyJ..." }
3. Any other request           Authorization: Bearer <token>
```

- The OTP has 6 digits, expires in 5 minutes, works once, and allows 5 wrong tries.
- Calling login again sends a new code (at most one every 60 seconds).
- The token lasts 8 hours. Only the gateway creates tokens (RS256). It publishes the public
  key at `/.well-known/jwks.json`, which the Operation service uses to check tokens.
- **First login:** accounts created by an admin, and accounts after an admin password reset, have
  `isFirstLogin: true`. Their token only allows `PUT /api/auth/change-password` and `GET /api/auth/me`;
  everything else answers `403` with `"code": "PASSWORD_CHANGE_REQUIRED"`. Changing the password
  returns a **new token** without that limit, so the user does not need to log in again.
- `PUT /api/auth/change-password` takes `{ "oldPassword", "newPassword" }`. Whose password changes
  comes from the token, never from the body. New passwords need at least 8 characters.
- `GET /api/auth/me` returns the logged-in user's current account (userName, email, role,
  employeeId, isFirstLogin). Call it when the frontend starts; `401` means go to the login page.
- On first start the Auth service creates the 4 roles (`ADMIN`, `HR_MANAGER`, `HR_STAFF`,
  `EMPLOYEE`) if missing, plus the bootstrap ADMIN account from `backend/.env`.

## Job titles

Every job belongs to one department (`tbl_job.department_id`), and an employee's job must be in the
employee's department.

| Endpoint | Who | What |
| --- | --- | --- |
| `GET /api/jobs` (`?departmentId=` optional) | any logged-in user | job list, e.g. for the employee form |
| `GET /api/jobs/{jobId}` | any logged-in user | one job |
| `POST /api/jobs`, `PATCH /api/jobs/{jobId}`, `DELETE /api/jobs/{jobId}` | ADMIN, HR_MANAGER | manage the list |
| `POST /api/employees`, `PATCH /api/employees/{id}` | ADMIN, HR_MANAGER, HR_STAFF | body needs `jobId` (a job of `departmentId`), optional `jobChangeRemark` |
| `GET /api/employees/me` | any logged-in user with an employee | my record (incl. `jobTitle`) |
| `GET /api/employees/me/job-history` | any logged-in user with an employee | my job history |
| `GET /api/employees/{id}/job-history` | ADMIN, HR_MANAGER, HR_STAFF | anyone's job history, newest first |
| `GET /api/report/employees/job/{jobId}` | ADMIN, HR_MANAGER, HR_STAFF | report: employees with that job |

- Employee responses show `jobTitle`. A job from another department → `400`.
- Titles are unique per department (ignoring case and spaces) → `409` on duplicates.
- A job cannot be deleted while employees have it or while it appears in job history (`409`), and cannot
  move to another department while employees have it (`409`). Renaming is always allowed.
- Changing an employee's job closes their current history row (end date today) and starts a new one
  with the remark; sending the same job records nothing. New employees start with one history row.
- `/me` endpoints answer `404 "No employee record for this account."` for accounts without an employee
  (e.g. `sysadmin`).
- Database: Operation migration `V5` (Flyway now runs in Operation; `V3`/`V4` were made safe to re-run).

## Profile photos

Each **account** has one photo, and because one employee has at most one account, that photo is also the
employee's icon everywhere (employee list, leave requests, attendance, ...).

| Endpoint | Who | What |
| --- | --- | --- |
| `GET /api/auth/me/photo` | any logged-in user | my photo, or an initials avatar |
| `PUT /api/auth/me/photo` | any logged-in user | upload/replace: `multipart/form-data`, field `file` |
| `DELETE /api/auth/me/photo` | any logged-in user | remove mine (back to the default) |
| `GET /api/photos/employees/{employeeId}` | any logged-in user | an employee's icon |

- JPG, PNG or WebP only (checked from the file's content, not its name), at most **3 MB**.
  Too big → `413`; empty or not an image → `400`.
- No photo yet → an SVG circle with the username's initials; an employee with no account → a person
  silhouette. The header `X-Default-Avatar: true` marks both.
- Before a first-login password change, users can view their photo but not upload one.
- Photos are stored in the database table `tbl_account_photo` (created by Auth's Flyway migration
  `V2`, history table `flyway_auth_history`). Deleting an account deletes its photo.
- Creating a second account for an employee who already has one is refused:
  `"This employee already has an account."`

**Frontend:** a plain `<img src>` cannot send the token, so load photos with `fetch`:

```js
async function photoUrl(path, token) {          // path: "/api/auth/me/photo" or "/api/photos/employees/18"
  const res = await fetch("http://localhost:8080" + path, { headers: { Authorization: "Bearer " + token } });
  if (!res.ok) throw new Error("photo " + res.status);
  return URL.createObjectURL(await res.blob());  // use as <img src={...}>
}

async function uploadPhoto(file, token) {        // file from <input type="file" accept="image/*">
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("http://localhost:8080/api/auth/me/photo",
      { method: "PUT", headers: { Authorization: "Bearer " + token }, body: form });
  return res.json();                             // { success, message }
}
```

Responses are cached by the browser for 5 minutes (`Cache-Control: private, max-age=300`); after
uploading, reload your own photo with `fetch(..., { cache: "reload" })`.

## Who can call what (enforced by the gateway)

| Path | Allowed roles |
| --- | --- |
| `POST /api/auth/login`, `POST /api/auth/verify-otp` | everyone (no token) |
| `PUT /api/auth/change-password`, `GET /api/auth/me`, `GET /api/auth/me/photo` | any logged-in user (the only ones allowed before a first-login password change) |
| `PUT`/`DELETE /api/auth/me/photo`, `GET /api/photos/employees/{id}` | any logged-in user |
| `PUT /api/auth/reset-password`, `/api/accounts/**`, `/api/roles/**` | `ADMIN` |
| `/api/report/**` | `ADMIN`, `HR_MANAGER`, `HR_STAFF` |
| `GET /api/v1/jobs/history` | `ADMIN`, `HR_MANAGER` |
| `POST /api/v1/jobs/{job}/trigger` | `ADMIN` |
| Operation (`/api/employees`, `/api/attendance`, ...) | any logged-in user; Operation then checks roles per endpoint |
| `/api/internal/**` | nobody from outside |

CRON's scheduled jobs run automatically inside Docker (Cambodia time) and call Operation directly
with the internal API key. They do not use the gateway or a JWT.

## Testing

**Swagger UI (easiest): http://localhost:8080/swagger-ui.html**

It opens on **0. All endpoints (one page)**: every endpoint of every service, grouped into
sections named "Service - Area" (e.g. "Operation - Leave"). Use the filter box to find a section.
1. In **Login**, run `POST /api/auth/login` (Try it out), then open `http://localhost:8025`
   to read the OTP email.
2. Run `POST /api/auth/verify-otp` with the code and copy `token` from the response.
3. Click **Authorize** (top right), paste the token, click Authorize.
4. Use any endpoint. Every "Try it out" call goes through the gateway, so role rules apply
   (403 = role not allowed).

The **Select a definition** box (top right) can also show one service at a time.
Each service publishes its description at `/v3/api-docs`; the gateway merges them
(`docs/AllApiDocsController`). If a service is down, its section is left out and the page says so.
Internal endpoints (`/api/internal/**`) are hidden. The docs pages are public; calling an endpoint
still needs a token. Careful: `POST /api/v1/jobs/{jobName}/trigger` really runs the job.

**Postman:** import `api_gateway/HRMS API Gateway.postman_collection.json`.
1. In the collection's **Variables** tab, set `userName` and `password`
   (the bootstrap admin is in `backend/.env`).
2. Run **1. Login (send OTP)**, then open `http://localhost:8025` to see the email.
3. Run **2. Verify OTP (get token)**. The OTP is read from Mailpit automatically and the token is saved.
4. Run anything in **2. With token**, and check that **3. Should be blocked** returns 401/403.

To try other roles, log in as admin, create an account with `POST /api/accounts`
(`roleId` from `GET /api/roles`), and log in as that user.

**Real email (Gmail):** turn on 2-Step Verification on the Gmail account, create an
App Password (Google Account → Security → App passwords), fill in the `MAIL_*` lines in
`backend/.env`, then run `docker compose up -d` again. OTPs then go to each account's real email.

## Running a service from IntelliJ instead

1. **Start the Config Server first:** `docker compose up -d config-server` (it listens on
   `127.0.0.1:8888`), or run `backend/config_server` from IntelliJ (working directory
   `backend/config_server`). Without it the other services refuse to start.
2. Each service imports its own `.env` (secrets only) when started from the repository root or its
   own folder. Keep `.env` entries as unquoted `KEY=value` pairs (Java properties syntax).
   Give Auth and the gateway the same `INTERNAL_API_KEY` in their `.env` files.
3. Outside Docker no profile is active, so services use the `localhost` addresses in
   `config-repo/<service>.yml`. Start Mailpit with `docker compose up -d mailpit` for emails.
   Operation defaults to the `local-dev` profile (mock security); set `SPRING_PROFILES_ACTIVE`
   to something else to check real tokens against `http://localhost:8080/.well-known/jwks.json`.
