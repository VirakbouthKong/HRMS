# Profile photo — design

Date: 2026-11-03 · Status: approved (photo limit changed to 3 MB)

## Why
The HRMS has no pictures of people. The frontend needs a profile photo for each user
(top bar, "my account") and the same picture as the person's icon wherever HR sees
employees (employee list, leave requests, attendance, ...).

## Goals
1. Every logged-in user can **upload, replace and remove their own** photo. Whose photo
   it is comes from the JWT, never from the request.
2. The photo is **stored with the login account** (Auth). Because one employee has at most
   one account, the employee's icon *is* their account's photo: change it once, it
   changes everywhere.
3. **Any logged-in user** can view the photo of any employee (HR screens need it).
4. When there is no photo, a **default avatar** is returned, so the frontend always gets an image.
5. **One employee = at most one account**, enforced by Auth and by the database.
   Accounts with no employee (e.g. `sysadmin`) stay allowed.

## Non-goals
- HR uploading or changing other people's photos.
- A separate "official ID photo" next to the account photo.
- Cropping or resizing on the server (the frontend may crop before uploading).
- Checking that an `employeeId` really exists in Operation when an account is created.
- Cloud storage / CDN.

## Constraints found in the code
- Auth uses `ddl-auto: validate` and has **no Flyway**; its tables were created by hand.
  Operation has Flyway and uses the default history table `flyway_schema_history` in the same
  Neon database.
- Auth does not read JWTs. Today "who is logged in" is only known by the gateway
  (`/api/auth/me` and change-password are gateway endpoints that call Auth's internal API).
- All four services share **one Neon database** (yours and your friend's PCs).
- `tbl_account.employee_id` has no unique rule. Today `admin` (id 1) and `admin2` (id 2) both
  point at employee 1.
- A browser `<img src>` cannot send an `Authorization` header.

## Approaches (where the image is kept)
| | A. Database (chosen) | B. Docker volume | C. Cloud service |
|---|---|---|---|
| Setup | none | volume in compose | account + keys + library |
| Shared Neon DB, two PCs | works | **broken**: file exists only on the uploader's PC | works |
| Cost | up to 3 MB per person in Neon (30 people ≈ 90 MB of 0.5 GB free) | disk | outside dependency |

**Chosen: A** — the only free, no-setup option that works on both PCs. Chosen by you.

## Decided design

### Data (Auth, new Flyway migration)
- Add Flyway to Auth with its **own history table** `flyway_auth_history`
  (`baseline-on-migrate`, baseline version 1), so it never clashes with Operation's.
- `V2__account_photo_and_one_account_per_employee.sql`:
  - `tbl_account_photo(account_id PK → tbl_account ON DELETE CASCADE, content_type, data bytea, updated_date)`
    — a separate table so normal account queries never load image bytes.
  - `CREATE UNIQUE INDEX ... ON tbl_account(employee_id) WHERE employee_id IS NOT NULL`.
- Before the migration runs: **delete test account `admin2`** (id 2) through
  `DELETE /api/accounts/2`. If a duplicate still exists the migration fails loudly instead of
  silently picking one.

### One account per employee (Auth)
- `POST /api/accounts` refuses an `employeeId` that already has an account:
  `"This employee already has an account."` (same `success:false` style the endpoint already uses).
  Updating an account cannot change `employeeId` today, so create is the only entry point.

### Endpoints (all through the gateway at :8080, any logged-in user)
| Method & path | What | Handled by |
|---|---|---|
| `GET /api/auth/me/photo` | my photo (or default avatar) | gateway → Auth internal |
| `PUT /api/auth/me/photo` | upload/replace my photo, `multipart/form-data`, field `file` | gateway → Auth internal |
| `DELETE /api/auth/me/photo` | remove my photo (back to the default) | gateway → Auth internal |
| `GET /api/photos/employees/{employeeId}` | photo of the account linked to that employee | Auth (routed) |

- "Me" endpoints live in the gateway, like `/api/auth/me` and change-password, so the account id
  comes from the token. They call new Auth endpoints under `/api/internal/**` with the internal key.
- `GET /api/photos/employees/{id}` is an ordinary Auth endpoint routed by the gateway
  (`/api/photos/**` → Auth); the gateway requires a valid token.
- Allowed while `pwdChangeRequired`? **Only `GET /api/auth/me/photo`** (so the top bar can show it);
  uploading waits until the password is changed.

### Upload rules
- JPG, PNG or WebP only, checked from the file's **first bytes**, not its name or declared type.
- At most **3 MB** (your decision). Bigger → `413`, wrong type or empty → `400`, both with `{success:false, message}`.
- The gateway's multipart/in-memory limits are raised to allow 3 MB.

### Default avatar (no photo uploaded)
- Account without a photo: an SVG circle with **initials from the username**
  (`test_dara` → "TD", `sysadmin` → "S"), background colour picked from the username so it is
  stable. *(My call: Auth only knows usernames; real names live in Operation. The frontend may
  draw its own initials from the employee's name instead.)*
- Employee without an account: a generic person-silhouette SVG.
- Responses carry `X-Default-Avatar: true|false` so the frontend can tell them apart.

### Frontend use
- Load photos with `fetch` + the token, then `URL.createObjectURL(blob)` into `<img src>`.
  A short example goes in the README.
- Responses send `Cache-Control: private, max-age=300` (my call) so lists don't refetch every render.

## Testing
- TDD unit tests in Auth: file-type check by magic bytes, size limit, initials,
  one-account-per-employee refusal, delete-account removes the photo.
- Gateway unit tests: me-photo endpoints use the account from the token; Auth errors pass through.
- End-to-end script through Docker: upload → view as self and as HR by employeeId → replace →
  delete → default avatar; wrong type/oversize refused; duplicate employee account refused;
  first-login token can view but not upload.

## Left to the builder
Exact SVG look, error wording, Swagger descriptions, and how the gateway streams multipart bytes.
