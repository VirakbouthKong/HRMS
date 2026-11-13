# BigBoss HRMS Frontend Architecture & Technical Specification

> **Project:** BigBoss Human Resource Management System (HRMS)  
> **Suite:** BigBoss Enterprise HR Suite  
> **Phase:** Final (Frontend Specification & Gateway Integration Architecture)  
> **Repository:** [https://github.com/VirakbouthKong/HRMS.git](https://github.com/VirakbouthKong/HRMS.git)  
> **Branch:** `feature/frontend`  
> **UI Reference Benchmark:** [Dribbble: HRMS Dashboard - Clean, Insightful, Action-Driven](https://dribbble.com/shots/27189909-HRMS-Dashboard-Clean-Insightful-Action-Driven)

---

## 1. Executive Summary

This document specifies the technical stack, architectural design, component hierarchy, UI design system, state management, and API gateway integration contract for the HRMS client application.

Per the project roadmap:
- **Midterm (Completed):** Database design, individual microservices (`auth_service`, `operation_service`, `report_service`), and CRON middleware.
- **Final (In Progress):** 
  1. API Gateway (Spring Cloud Gateway on port `8080`)
  2. Frontend Web Application (React SPA matching Dribbble benchmark)

The frontend operates in two distinct phases:
1. **Interactive Prototype Mode (with LocalStorage persistence):** Fully functional dashboard, employee directory, attendance punching, leave approvals, payroll runs, and visual charts, allowing team and classroom demonstration without backend dependencies.
2. **Live Gateway Mode:** Seamlessly targets `http://localhost:8080` with zero UI code adjustments.

---

## 2. Updated Technical Stack Specification

| Category | Technology | Tooling / Package | Justification & Architectural Role |
| :--- | :--- | :--- | :--- |
| **Framework** | **React 18+** | SPA | Modular component hierarchy, declarative rendering. |
| **Build Tool** | **Vite** | Latest | Instant cold starts, sub-millisecond HMR. |
| **Language** | **TypeScript** | Strict Mode | Strict type safety mirroring backend Spring Boot Java DTOs. |
| **Styling** | **Tailwind CSS** | Utility-first | Ambient glassmorphism, soft gradients, responsive breakpoints. |
| **Icon Library** | **Phosphor Icons** | `@phosphor-icons/react` | **Selected over Hugeicons & Lucide:** Native 6 weight variants, notably **Duotone** style (`weight="duotone"`) that provides the tinted pastel badge icons seen in the Dribbble UI. 100% open-source without paywalled variations. |
| **Charting Engine**| **React-ChartJS-2** | `react-chartjs-2` + `chart.js` | Canvas-rendered donut charts with center cutouts and rounded vertical bar charts (`borderRadius: 8`) matching the Dribbble reference charts. |
| **Tables** | **TanStack Table** | `v8` | Headless table logic for sorting, filtering, and pagination. |
| **State Store** | **Zustand** | Latest | Centralized store for session token, demo role switcher, and mock storage. |
| **HTTP Client** | **Axios** | Latest | Centralized client with JWT auth interceptors. |

---

## 3. UI/UX Design System (Analysis of Dribbble Benchmark)

The user interface follows the layout of **Dribbble Shot #27189909**:

### 3.1 Visual Language
- **Background:** Soft ambient aura with subtle pastel gradients (pale cyan and soft lavender accents) and frosted glass aesthetic (`bg-white/80 backdrop-blur-md border border-white/60`).
- **Cards & Surfaces:** High-radius rounded containers (`rounded-2xl` / `rounded-3xl`), soft ambient drop-shadows, crisp typography with high-contrast slate headers.
- **Color Accents for Status & Badges:**
  - Active / Projects / Present: Royal Blue (`#3B82F6`)
  - WFH / Remote: Lilac / Purple (`#8B5CF6`)
  - Completed / Approved / Active: Emerald Green (`#10B981`)
  - Leaves / Pending / Warning: Warm Amber / Orange (`#F59E0B`)
  - Absent / Urgent / Rejected: Coral Rose (`#F43F5E`)
  - Time & Overtime: Cyan / Teal (`#06B6D4`)

### 3.2 Shell Layout Architecture
```
┌──────────┬──────────────────────────────────────────────────────────────┬──────────┐
│  Left    │  Top Bar: Breadcrumbs | Search "/" | Welcome Greeting | Req  │  Right   │
│  Sidebar ├──────────────────────────────────────────────────────────────┤  Quick   │
│          │  Metric Cards Row: [Projects] [WFH] [Tasks] [Leave] [Hours]  │  Action  │
│  - Logo  ├──────────────────────────────┬───────────────────────────────┤  Strip   │
│  - Nav   │ My Pending Actions           │ Announcement Noticeboard      │          │
│  - User  │ (Tabs, Task Cards, Actions)  │ (Table of upcoming events)    │  - Icons │
│    Card  ├──────────────────────────────┴───────────────────────────────┤  - Short-│
│  - Logout│ Event Calendar (Monthly interactive grid with day badges)    │    cuts  │
│          ├──────────────────────────────┬───────────────────────────────┤          │
│          │ Leave Summary (Donut Chart)  │ Timesheet Summary (Donut Chart│          │
│          ├──────────────────────────────┴───────────────────────────────┤          │
│          │ Attendance Summary (Rounded 3-color Bar Chart)               │          │
└──────────┴──────────────────────────────────────────────────────────────┴──────────┘
```

---

## 4. Component Inventory (For 21st.dev / Custom Library Selection)

To build this polished UI without generic defaults, here is the component breakdown. You can find matching components on [21st.dev](https://21st.dev/) or provide specific implementations:

### 1. App Shell & Navigation
- **`SidebarNav`**: Collapsible sidebar with active link pill indicators and brand header.
- **`UserSummaryWidget`**: Avatar, user full name, email badge, and quick logout button.
- **`RightQuickActionStrip`**: Sleek vertical strip with tooltip-enabled action buttons.
- **`GlobalSearchCommand`**: Command-palette search trigger (`Cmd/Ctrl + K` or `/`).
- **`DemoRoleSwitcher`**: Quick-toggle pill component (`Admin`, `HR Manager`, `Employee`) for live classroom presentations.

### 2. Metrics & KPI Section
- **`MetricPillCard`**: Large stat display (`04`, `50`, `176/hr`), label, subtitle, and Phosphor Duotone badge icon with pastel backdrop.

### 3. Middle Section Widgets
- **`PendingActionCard`**: Card with filter menu, tab switcher (`Active task` vs `Notifications`), and task item cards with status badges and call-to-action buttons (`Start Self Evaluation`, `Review Leave`).
- **`AnnouncementNoticeboard`**: Clean table list displaying date-sorted company notices.
- **`MiniEventCalendar`**: Interactive calendar card with month pagination (`< January 2026 >`), day-of-week headers, and circular active date highlight pills.

### 4. Chart & Reporting Components (`react-chartjs-2`)
- **`LeaveDonutChart`**: Donut chart with smooth center cutout, custom color segments, and side-aligned legend.
- **`TimesheetDonutChart`**: Donut chart with bottom status pill legend (Draft, Pending, Approved, Rejected).
- **`AttendanceBarChart`**: Rounded bar chart (`borderRadius: 8`, thickness: 24px) for Present, On Leave, and Absent counts.

### 5. Operational Tables & Modals (Full HRMS Suite)
- **`DataTable`**: Rich table with sorting, search filtering, avatar columns, and pagination (for Employee Directory, Daily Attendance Logs, Leave Queue, and Payroll Records).
- **`PunchStationWidget`**: Live digital clock, Check-In / Check-Out buttons, today's elapsed hours counter.
- **`SlideOverDrawer` / `ModalDialog`**: Clean sliding drawer for Employee Details, Add Employee Form, Leave Request Form, and Attendance Correction.
- **`PayslipViewer`**: Formal printable salary slip modal with earnings, deductions, and net pay breakdown.

---

## 5. End-to-End System Topology & Gateway Contract

```
┌─────────────────────────────────────────────────────────────┐
│                 React Frontend (Port 5173)                  │
│                                                             │
│   ┌───────────────┐   ┌─────────────────┐   ┌───────────┐   │
│   │ UI Components │──>│ ApiClient/Hooks │──>│  Zustand  │   │
│   └───────────────┘   └────────┬────────┘   │ AuthStore │   │
│                                │            └───────────┘   │
└────────────────────────────────┼────────────────────────────┘
                                 │
                 ┌───────────────┴──────────────┐
                 │ Environment Switching Logic  │
                 ▼                              ▼
    ┌──────────────────────────┐   ┌──────────────────────────┐
    │   Mock Adapter Service   │   │  API Gateway (Port 8080) │
    │ (localStorage + Memory)  │   │  (Spring Cloud Gateway)  │
    └──────────────────────────┘   └────────────┬─────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
      ┌────────────────────┐         ┌────────────────────┐         ┌────────────────────┐
      │    Auth Service    │         │ Operation Service  │         │   Report Service   │
      │    (Port 8081)     │         │    (Port 8083)     │         │    (Port 8084)     │
      └────────────────────┘         └────────────────────┘         └────────────────────┘
                                                ▲
                                                │ Internal API Key
                                     ┌────────────────────┐
                                     │    CRON Service    │
                                     │    (Port 8085)     │
                                     └────────────────────┘
```

### Route Mapping

| Endpoint Pattern | Downstream Microservice | Target Port | Features |
| :--- | :--- | :--- | :--- |
| `/api/auth/**` | **Auth Service** | `8081` | Login, OTP verify, password change/reset |
| `/api/v1/**` | **Operation Service** | `8083` | Employees, departments, attendance, leaves, payroll |
| `/api/reports/**` | **Report Service** | `8084` | Executive dashboard, attendance report, payroll report |
| `/api/internal/**` | *Protected by API Key* | `8083` | Triggered by CRON Service (`8085`) |

---

## 6. Enterprise Role-Based Access Control (RBAC) & Spring Cloud Gateway Model

### 6.1 Authority & Claims Architecture

The frontend security model strictly mirrors Spring Security 6 with `@EnableMethodSecurity` and Spring Cloud Gateway (`:8080`).

When authenticating via Auth Service, the issued JWT contains authorities mapped via `JwtAuthenticationConverter`:
- `ROLE_ADMIN`: Executive Administrator with full system governance, employee deletion, and company-wide batch payroll generation.
- `ROLE_HR`: People Operations Manager with employee directory management, attendance oversight, and leave request approval authority.
- `ROLE_EMPLOYEE`: Self-service staff member with personal punch clock, personal leave applications, and individual salary advice.

### 6.2 Gateway Route & Authority Mapping Table

| Endpoint Pattern | Method | Target Microservice | Required Authority (`@PreAuthorize`) | Permitted Frontend Roles |
| :--- | :--- | :--- | :--- | :--- |
| `/api/employees` | `GET` | Operation Service (`:8083`) | `hasAnyRole('ADMIN', 'HR_MANAGER')` | `ROLE_ADMIN`, `ROLE_HR` |
| `/api/employees` | `POST` | Operation Service (`:8083`) | `hasAnyRole('ADMIN', 'HR_MANAGER')` | `ROLE_ADMIN`, `ROLE_HR` |
| `/api/employees/{id}` | `DELETE` | Operation Service (`:8083`) | `hasRole('ADMIN')` | `ROLE_ADMIN` |
| `/api/attendance/check-in` | `POST` | Operation Service (`:8083`) | `hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')` | All Roles |
| `/api/attendance/check-out` | `POST` | Operation Service (`:8083`) | `hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')` | All Roles |
| `/api/attendance/me` | `GET` | Operation Service (`:8083`) | `hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')` | All Roles (Self-scoped) |
| `/api/attendance` | `GET` | Operation Service (`:8083`) | `hasAnyRole('ADMIN', 'HR_MANAGER')` | `ROLE_ADMIN`, `ROLE_HR` |
| `/api/leaves` | `POST` | Operation Service (`:8083`) | `hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')` | All Roles |
| `/api/leaves/me` | `GET` | Operation Service (`:8083`) | `hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')` | All Roles (Self-scoped) |
| `/api/leaves/{id}/approve` | `PATCH` | Operation Service (`:8083`) | `hasAnyRole('ADMIN', 'HR_MANAGER')` | `ROLE_ADMIN`, `ROLE_HR` |
| `/api/leaves/{id}/reject` | `PATCH` | Operation Service (`:8083`) | `hasAnyRole('ADMIN', 'HR_MANAGER')` | `ROLE_ADMIN`, `ROLE_HR` |
| `/api/leaves/{id}/cancel` | `PATCH` | Operation Service (`:8083`) | `hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')` | All Roles (Personal application) |
| `/api/payroll/me` | `GET` | Operation Service (`:8083`) | `hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')` | All Roles (Self-scoped) |
| `/api/payroll/generate` | `POST` | Operation Service (`:8083`) | `hasAnyRole('ADMIN', 'HR_MANAGER')` | `ROLE_ADMIN`, `ROLE_HR` |
| `/api/payroll` | `GET` | Operation Service (`:8083`) | `hasAnyRole('ADMIN', 'HR_MANAGER')` | `ROLE_ADMIN`, `ROLE_HR` |
| `/api/reports/**` | `GET` | Report Service (`:8084`) | `hasAnyRole('ADMIN', 'HR_MANAGER')` | `ROLE_ADMIN`, `ROLE_HR` |

### 6.3 Senior UX Role-Adaptive Presentation Layer

To prevent generic "AI slop" or broken blank screens, the UI gracefully adapts its information architecture:
1. **Dynamic Navigation Scoping:**
   - Left Sidebar and Right Utility Bar filter out executive tabs (like Analytics) for `ROLE_EMPLOYEE`.
   - Tab labels adapt contextually: "Payroll & Salary" becomes "My Payslips", "Leave Management" becomes "My Leaves".
2. **Confidential Compensation Masking:**
   - In Employee Directory, salaries of other employees are strictly masked with `Confidential` tags to respect data privacy when viewed by non-HR staff.
3. **Action Gating:**
   - In Leaves: Employees see their personal submission queue with a "Cancel" action for pending requests; HR/Admin see the company approval queue with "Approve" and "Reject" buttons.
   - In Payroll: Employees see their individual compensation card and printable pay advice; HR/Admin see the batch payroll generator and company financial aggregates.
4. **Clearance Barrier (`ClearanceRequiredCard`):**
   - Direct access to unauthorized routes renders a stylish, informative clearance card with exact HTTP 403 Gateway diagnostic details and one-click role switching for live presentations.

---

## 7. Migration Guide to Live API Gateway

When the backend team deploys the Spring Cloud API Gateway at `http://localhost:8080`:

1. Update `.env`:
   ```bash
   VITE_USE_MOCK=false
   VITE_API_BASE_URL=http://localhost:8080
   ```
2. The Axios client automatically points to the gateway with JWT authorization headers attached (`Authorization: Bearer <jwt>`, `X-User-Role`, `X-Employee-Id`).
3. Because all TypeScript types directly mirror backend entities, no UI component rewrites are needed.
