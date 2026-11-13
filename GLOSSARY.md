# HRMS Domain Glossary

The ubiquitous language and domain model for the Human Resource Management System (HRMS).

## Identity & Access Management (Auth Service)

**Account**:
A digital identity credential containing a username, password hash, status, and role assignment used to authenticate into the system.
_Avoid_: User profile, login credential

**Role**:
A defined security entitlement (`ROLE_ADMIN`, `ROLE_HR`, `ROLE_EMPLOYEE`) governing permissions and accessible routes across the platform.
_Avoid_: Permission group, user type

**OTP Verification**:
A temporary, time-bound 6-digit numeric token generated for two-factor verification on initial login or password recovery.
_Avoid_: Pin code, 2FA key, security code

## People & Organization (Operation Service)

**Employee**:
An active, suspended, or exited staff member containing bio-demographic details, contact information, department assignment, job position, and base compensation.
_Avoid_: Staff member, worker, user

**Department**:
An organizational business unit (e.g., Engineering, HR, Sales) to which employees and cost centers belong.
_Avoid_: Team, division, unit

**Job**:
A standardized employment position and title within the company defining duties and salary band.
_Avoid_: Role, occupation, title

## Time & Attendance (Operation Service)

**Attendance Record**:
A single day's tracked presence for an employee, recording check-in timestamp, check-out timestamp, late minutes, and overtime hours.
_Avoid_: Timesheet entry, punch log, timecard

**Check-In / Check-Out**:
The official system timestamps recording when an employee begins and terminates daily work.
_Avoid_: Clock in/out, punch in/out

**Late Minutes**:
The number of minutes an employee arrived after the official workday start time exceeding the configured late grace period (15 minutes).
_Avoid_: Tardiness, delay

**Overtime (OT)**:
Eligible hours worked beyond standard daily closing hours (17:00).
_Avoid_: Extra hours, bonus time

**Attendance Correction**:
A formal request submitted by an employee to adjust missing or erroneous check-in/out timestamps, requiring manager approval.
_Avoid_: Timesheet edit, punch fix

## Leave Management (Operation Service)

**Leave Request**:
A formal application submitted by an employee for scheduled absence (Casual, Sick, Annual, Maternity/Paternity) across a specified date range.
_Avoid_: Time off request, vacation application

**Leave Status**:
The lifecycle state of a leave application (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`).
_Avoid_: State, approval flag

## Compensation & Payroll (Operation Service)

**Payroll Profile**:
An employee's baseline financial settings, including base salary, recurring allowances, tax classification, and bank account information.
_Avoid_: Salary contract, pay grade

**Payroll Record**:
A finalized monthly compensation calculation snapshot for an employee, detailing gross salary, late/absence deductions, bonuses, and net payout.
_Avoid_: Paycheck, salary transaction

**Payslip**:
A printable and downloadable summary document detailing an individual employee's earnings and deductions for a given pay cycle.
_Avoid_: Salary slip, pay advice

## Middleware & Integration

**Scheduled Job**:
An automated background task executed on a recurring CRON schedule (e.g., daily attendance sync, monthly payroll batch calculation, contract expiry checks).
_Avoid_: Background daemon, timer task

**API Gateway**:
The centralized reverse proxy and entry point routing external client requests to internal microservices while managing security and CORS.
_Avoid_: Backend proxy, edge router
