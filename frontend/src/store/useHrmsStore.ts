import { create } from 'zustand';
import {
  Employee,
  Department,
  JobTitle,
  AttendanceRecord,
  LeaveRequest,
  PayrollRecord,
  PendingAction,
  Announcement,
  UserAccount,
  JobExecution,
  AttendanceCorrection,
} from '../types';
import {
  authApi,
  employeeApi,
  departmentApi,
  jobApi,
  attendanceApi,
  leaveApi,
  payrollApi,
  cronApi,
  reportApi,
} from '../api';
import { Language } from '../i18n/translations';

export type NavTab =
  | 'dashboard'
  | 'attendance'
  | 'timesheet'
  | 'employees'
  | 'departments'
  | 'automations'
  | 'leaves'
  | 'payroll'
  | 'reports'
  | 'profile';

export interface ActionResult<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

const getInitialLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('hrms_language');
    if (saved === 'kh' || saved === 'en') {
      document.documentElement.lang = saved === 'kh' ? 'km' : 'en';
      document.documentElement.dataset.lang = saved;
      return saved;
    }
    document.documentElement.lang = 'en';
    document.documentElement.dataset.lang = 'en';
  }
  return 'en';
};

const getLocalDateStr = (date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const extractApiError = (err: any, fallback: string): string => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    (Array.isArray(err?.response?.data?.errors) ? err.response.data.errors.join(', ') : null) ||
    err?.message ||
    fallback
  );
};

const normalizeEmployee = (e: any): Employee => ({
  employeeId: e.employeeId,
  firstName: e.firstName || '',
  lastName: e.lastName || '',
  email: e.email || '',
  phoneNumber: e.phoneNumber || '',
  gender: e.gender || 'Other',
  dob: e.dateOfBirth || e.dob || '1995-01-01',
  dateOfBirth: e.dateOfBirth || e.dob || '1995-01-01',
  salary: Number(e.salary ?? 0),
  departmentId: e.departmentId || 1,
  departmentName: e.departmentName || '',
  jobTitle: e.jobTitle || '',
  status:
    e.status === 'ACTIVE'
      ? 'Active'
      : e.status === 'ON_LEAVE'
      ? 'On Leave'
      : e.status === 'TERMINATED'
      ? 'Terminated'
      : e.status === 'PROBATION'
      ? 'Probation'
      : (e.status || 'Active'),
  hireDate: e.hireDate || e.contractEndDate || '',
  contractEndDate: e.contractEndDate,
  avatarUrl: e.avatarUrl || undefined,
});

const formatPayrollRecord = (p: any, employees: Employee[], fallbackPeriod: string): PayrollRecord => {
  const emp = employees.find((e) => e.employeeId === p.employeeId);
  return {
    recordId: p.payrollId || p.recordId || Date.now() + (p.employeeId || 0),
    employeeId: p.employeeId,
    employeeName:
      p.employeeName || (emp ? `${emp.firstName} ${emp.lastName}` : `Employee #${p.employeeId}`),
    jobTitle: emp?.jobTitle || p.jobTitle || '',
    departmentName: emp?.departmentName || p.departmentName || '',
    periodMonth: String(p.period || fallbackPeriod),
    baseSalary: Number(p.baseSalary ?? 0),
    allowances: Number(p.allowances ?? 0),
    lateDeductions: Number(p.lateDeduction ?? p.lateDeductions ?? 0),
    taxDeductions: Number(p.unpaidLeaveDeduction ?? p.taxDeductions ?? 0),
    netSalary: Number(p.netSalary ?? p.baseSalary ?? 0),
    status: (p.status || 'PROCESSED') as PayrollRecord['status'],
    paidDate: p.paidDate || p.generatedDate,
  };
};

interface HrmsState {
  // Language / i18n
  language: Language;
  setLanguage: (lang: Language) => void;

  // Session & Authentication
  isAuthenticated: boolean;
  login: (user: UserAccount, token?: string) => void;
  logout: () => void;
  updateUserAvatar: (newUrl: string) => void;

  // Navigation & Role
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  departmentsView: 'departments' | 'jobs';
  setDepartmentsView: (view: 'departments' | 'jobs') => void;
  currentUser: UserAccount;

  // Search & Filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Gateway Connection & Telemetry State
  isLoading: boolean;
  isGatewayConnected: boolean;
  gatewayError: string | null;
  jobs: JobTitle[];
  cronHistory: JobExecution[];
  dashboardSummary: any | null;

  // Domain Collections (100% Pure Live API Gateway Data)
  employees: Employee[];
  departments: Department[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  payroll: PayrollRecord[];
  pendingActions: PendingAction[];
  announcements: Announcement[];
  attendanceCorrections: AttendanceCorrection[];

  // Gateway Synchronization
  syncWithGateway: () => Promise<void>;

  // Department Operations
  addDepartment: (dept: Omit<Department, 'departmentId' | 'headCount'>) => Promise<ActionResult<Department>>;
  updateDepartment: (id: number, dept: Partial<Department>) => Promise<ActionResult>;
  deleteDepartment: (id: number) => Promise<ActionResult>;

  // Job Title Operations
  addJobTitle: (job: Omit<JobTitle, 'jobId'>) => Promise<ActionResult<JobTitle>>;
  deleteJobTitle: (id: number) => Promise<ActionResult>;

  // Cron Operations
  triggerCronJob: (jobName: string) => Promise<ActionResult>;

  // Attendance Correction Operations
  requestAttendanceCorrection: (
    req: Omit<AttendanceCorrection, 'correctionId' | 'status' | 'requestedAt'>
  ) => Promise<ActionResult>;
  reviewAttendanceCorrection: (
    correctionId: number,
    status: 'APPROVED' | 'REJECTED'
  ) => Promise<ActionResult>;

  // Employee Operations
  addEmployee: (emp: Omit<Employee, 'employeeId'> | any) => Promise<ActionResult<Employee>>;
  updateEmployee: (id: number, emp: Partial<Employee> | any) => Promise<ActionResult<Employee>>;
  deleteEmployee: (id: number) => Promise<ActionResult>;

  // Attendance Operations
  checkInToday: (employeeId?: number) => Promise<ActionResult<AttendanceRecord>>;
  checkOutToday: (employeeId?: number) => Promise<ActionResult<AttendanceRecord>>;
  recordAttendancePunch: (type: 'IN' | 'OUT', note?: string) => Promise<ActionResult<AttendanceRecord>>;

  // Leave Operations
  submitLeaveRequest: (
    req: Omit<LeaveRequest, 'leaveId' | 'status' | 'appliedDate'> | any
  ) => Promise<ActionResult<LeaveRequest>>;
  updateLeaveStatus: (leaveId: number, status: 'APPROVED' | 'REJECTED') => Promise<ActionResult>;
  cancelLeaveRequest: (leaveId: number) => Promise<ActionResult>;

  // Payroll Operations
  fetchPayrollByPeriod: (periodMonth: string) => Promise<ActionResult<PayrollRecord[]>>;
  generateMonthlyPayroll: (periodMonth: string) => Promise<ActionResult>;
  savePayrollProfile: (
    employeeId: number,
    payload: { baseSalary: number; dailyRate: number; latePenaltyPerMinute: number }
  ) => Promise<ActionResult>;
  markPayrollPaid: (recordId: number) => Promise<ActionResult>;
}

const normalizePeriodYm = (periodMonth: string): string => {
  if (/^\d{4}-\d{2}$/.test(periodMonth)) return periodMonth;
  const d = new Date(
    periodMonth.includes(' ')
      ? `${periodMonth.split(' ')[0]} 1, ${periodMonth.split(' ')[1]}`
      : periodMonth
  );
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return new Date().toISOString().substring(0, 7);
};

export const useHrmsStore = create<HrmsState>((set, get) => {
  const initialLanguage = getInitialLanguage();

  const storedAuth = typeof window !== 'undefined' ? localStorage.getItem('hrms_authenticated') : null;
  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('hrms_jwt_token') : null;
  const isAuthenticated = storedAuth === 'true' && Boolean(storedToken);

  let initialUser: UserAccount = {
    accountId: 0,
    userName: '',
    email: '',
    role: 'ROLE_EMPLOYEE',
    employeeId: undefined,
    fullName: '',
    avatarUrl: '',
  };
  try {
    if (typeof localStorage !== 'undefined') {
      const uStr = localStorage.getItem('hrms_user');
      if (uStr) {
        initialUser = JSON.parse(uStr);
      }
    }
  } catch {
    // Keep default fallback user structure
  }

  return {
    // Language
    language: initialLanguage,
    setLanguage: (lang) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('hrms_language', lang);
        document.documentElement.lang = lang === 'kh' ? 'km' : 'en';
        document.documentElement.dataset.lang = lang;
      }
      set({ language: lang });
    },

    // Session State
    isAuthenticated,
    updateUserAvatar: (newUrl) => {
      set((s) => {
        if (s.currentUser.avatarUrl && s.currentUser.avatarUrl.startsWith('blob:') && s.currentUser.avatarUrl !== newUrl) {
          URL.revokeObjectURL(s.currentUser.avatarUrl);
        }
        const updatedUser = { ...s.currentUser, avatarUrl: newUrl };
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('hrms_user', JSON.stringify(updatedUser));
        }
        return { currentUser: updatedUser };
      });
    },
    login: (user, token) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('hrms_user', JSON.stringify(user));
        localStorage.setItem('hrms_authenticated', 'true');
        if (token) {
          localStorage.setItem('hrms_jwt_token', token);
        }
      }
      set({ currentUser: user, isAuthenticated: true, activeTab: 'dashboard', gatewayError: null });
      get().syncWithGateway();
    },
    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('hrms_authenticated', 'false');
        localStorage.removeItem('hrms_jwt_token');
        localStorage.removeItem('hrms_user');
      }
      set({
        isAuthenticated: false,
        activeTab: 'dashboard',
        employees: [],
        departments: [],
        jobs: [],
        attendance: [],
        leaves: [],
        payroll: [],
        cronHistory: [],
        dashboardSummary: null,
        pendingActions: [],
        announcements: [],
        attendanceCorrections: [],
        isGatewayConnected: true,
        gatewayError: null,
      });
    },

    // Navigation & Roles
    activeTab:
      typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab')
        ? (new URLSearchParams(window.location.search).get('tab') as NavTab)
        : 'dashboard',
    setActiveTab: (tab) => set({ activeTab: tab }),
    departmentsView: 'departments',
    setDepartmentsView: (view) => set({ departmentsView: view }),
    currentUser: initialUser,

    // Global Search Query
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),

    // Telemetry & Status Properties
    isLoading: false,
    isGatewayConnected: true,
    gatewayError: null,
    dashboardSummary: null,

    // Domain Collections (100% Pure Live API Gateway - Clean Empty Initial State)
    departments: [],
    jobs: [],
    employees: [],
    attendance: [],
    leaves: [],
    payroll: [],
    pendingActions: [],
    cronHistory: [],
    announcements: [],
    attendanceCorrections: [],

    // ==========================================
    // Gateway Synchronization Engine
    // ==========================================
    syncWithGateway: async () => {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('hrms_jwt_token') : null;
      const isAuth = get().isAuthenticated;

      if (!isAuth && !token) {
        set({ isLoading: false, isGatewayConnected: true, gatewayError: null });
        return;
      }

      set({ isLoading: true, gatewayError: null });

      try {
        const currentPeriod = new Date().toISOString().substring(0, 7);
        const role = get().currentUser.role;
        const isEmployeeOnly = role === 'ROLE_EMPLOYEE';

        const isUnauthorized = (res: PromiseSettledResult<any>) =>
          res.status === 'rejected' && res.reason?.response?.status === 401;

        const isNetworkFailure = (res: PromiseSettledResult<any>) =>
          res.status === 'rejected' &&
          (res.reason?.code === 'ERR_NETWORK' ||
            res.reason?.code === 'ECONNREFUSED' ||
            res.reason?.message?.includes('Network Error') ||
            res.reason?.response?.status === 502 ||
            res.reason?.response?.status === 503 ||
            res.reason?.response?.status === 504);

        // Fetch profile photo in background if available
        authApi
          .getProfilePhoto()
          .then((blob) => {
            if (blob && blob.size > 0) {
              const objUrl = URL.createObjectURL(blob);
              get().updateUserAvatar(objUrl);
            }
          })
          .catch(() => {
            // No uploaded photo or 404 — keep existing avatar
          });

        if (isEmployeeOnly) {
          const [myProfileResult, jobResult, attResult, leaveResult, payrollResult] =
            await Promise.allSettled([
              employeeApi.getMyProfile(),
              jobApi.getAll(),
              attendanceApi.getMyAttendance(),
              leaveApi.getMyLeaves(),
              payrollApi.getMyPayroll(),
            ]);

          if (
            isUnauthorized(myProfileResult) ||
            isUnauthorized(jobResult) ||
            isUnauthorized(leaveResult)
          ) {
            get().logout();
            return;
          }

          if (
            isNetworkFailure(myProfileResult) ||
            isNetworkFailure(jobResult) ||
            isNetworkFailure(attResult) ||
            isNetworkFailure(leaveResult) ||
            isNetworkFailure(payrollResult)
          ) {
            const failureReason =
              myProfileResult.status === 'rejected' && isNetworkFailure(myProfileResult)
                ? myProfileResult.reason
                : jobResult.status === 'rejected' && isNetworkFailure(jobResult)
                ? jobResult.reason
                : attResult.status === 'rejected' && isNetworkFailure(attResult)
                ? attResult.reason
                : leaveResult.status === 'rejected' && isNetworkFailure(leaveResult)
                ? leaveResult.reason
                : (payrollResult as any).reason;
            set({
              isLoading: false,
              isGatewayConnected: false,
              gatewayError: extractApiError(
                failureReason,
                'Unable to reach Spring Cloud Gateway at http://localhost:8080.'
              ),
            });
            return;
          }

          const employees: Employee[] =
            myProfileResult.status === 'fulfilled' && myProfileResult.value
              ? [normalizeEmployee(myProfileResult.value)]
              : [];

          if (employees[0]) {
            const profileFullName = `${employees[0].firstName} ${employees[0].lastName}`.trim();
            if (profileFullName && get().currentUser.fullName !== profileFullName) {
              const updatedUser = {
                ...get().currentUser,
                fullName: profileFullName,
                employeeId: employees[0].employeeId,
              };
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem('hrms_user', JSON.stringify(updatedUser));
              }
              set({ currentUser: updatedUser });
            }
          }

          const jobs: JobTitle[] =
            jobResult.status === 'fulfilled' && Array.isArray(jobResult.value) ? jobResult.value : [];

          const attendance: AttendanceRecord[] =
            attResult.status === 'fulfilled' && attResult.value
              ? (Array.isArray(attResult.value) ? attResult.value : [attResult.value]).map((a: any) => {
                  const formatTime = (t?: string) => {
                    if (!t) return null;
                    return t.includes('T') ? t.split('T')[1].substring(0, 5) : t.substring(0, 5);
                  };
                  return {
                    attendanceId: a.attendanceId || Date.now(),
                    employeeId: a.employeeId,
                    employeeName: a.employeeName || get().currentUser.fullName,
                    attendanceDate: String(a.attendanceDate || getLocalDateStr()),
                    checkIn: formatTime(a.checkIn),
                    checkOut: formatTime(a.checkOut),
                    lateMinutes: a.lateMinutes || 0,
                    otHours: a.otHours || 0,
                    status: a.status || (a.lateMinutes > 0 ? 'LATE' : 'PRESENT'),
                  };
                })
              : [];

          const leaves: LeaveRequest[] =
            leaveResult.status === 'fulfilled' && Array.isArray(leaveResult.value)
              ? leaveResult.value.map((l: any) => ({
                  leaveId: l.leaveId,
                  employeeId: l.employeeId,
                  employeeName: l.employeeName || get().currentUser.fullName,
                  leaveType: l.leaveType || 'Casual Leave',
                  startDate: l.startDate,
                  endDate: l.endDate,
                  daysCount:
                    l.daysCount ||
                    (l.startDate && l.endDate
                      ? Math.round(
                          (new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        ) + 1
                      : 1),
                  reason: l.reason || '',
                  status: l.status || 'PENDING',
                  approvedBy: l.approvedByName || l.approvedBy,
                  appliedDate: l.appliedDate || l.startDate,
                }))
              : [];

          const payroll: PayrollRecord[] =
            payrollResult.status === 'fulfilled' && Array.isArray(payrollResult.value)
              ? payrollResult.value.map((p: any) => formatPayrollRecord(p, employees, currentPeriod))
              : [];

          const hydratedEmployees = employees.map((emp) => {
            const pr = payroll.find((p) => p.employeeId === emp.employeeId);
            return pr && pr.baseSalary > 0 ? { ...emp, salary: pr.baseSalary } : emp;
          });

          set({
            isLoading: false,
            isGatewayConnected: true,
            gatewayError: null,
            employees: hydratedEmployees,
            departments: [],
            jobs,
            attendance,
            leaves,
            payroll,
            cronHistory: [],
            dashboardSummary: null,
            pendingActions: [],
          });
          return;
        }

        // Admin / HR parallel live synchronization via Spring Cloud Gateway (:8080)
        const [
          empResult,
          deptResult,
          jobResult,
          attResult,
          leaveResult,
          payrollResult,
          cronResult,
          reportResult,
        ] = await Promise.allSettled([
          employeeApi.getAll(),
          departmentApi.getAll(),
          jobApi.getAll(),
          attendanceApi.getAll(),
          leaveApi.getAll(),
          payrollApi.getAll(currentPeriod),
          cronApi.getHistory(),
          reportApi.getDashboard(),
        ]);

        if (isUnauthorized(empResult) || isUnauthorized(deptResult)) {
          get().logout();
          return;
        }

        if (isNetworkFailure(empResult) || isNetworkFailure(deptResult)) {
          const failureReason =
            empResult.status === 'rejected' ? empResult.reason : (deptResult as any).reason;
          const errMsg = extractApiError(
            failureReason,
            'Unable to reach Spring Cloud Gateway at http://localhost:8080. Microservices may be offline.'
          );

          set({
            isLoading: false,
            isGatewayConnected: false,
            gatewayError: errMsg,
          });
          return;
        }

        // 1. Live Employees
        const employees: Employee[] =
          empResult.status === 'fulfilled' && Array.isArray(empResult.value)
            ? empResult.value.map(normalizeEmployee)
            : [];

        // 2. Live Departments
        const departments: Department[] =
          deptResult.status === 'fulfilled' && Array.isArray(deptResult.value)
            ? deptResult.value.map((d: any) => {
                const assigned = employees.filter((e) => e.departmentId === d.departmentId);
                const lead = assigned[0];
                return {
                  departmentId: d.departmentId,
                  departmentName: d.departmentName,
                  description: d.description || '',
                  headCount: d.headCount ?? assigned.length,
                  budget: d.budget ?? 50000,
                  leadEmployeeId: d.leadEmployeeId ?? lead?.employeeId,
                  leadName: d.leadName ?? (lead ? `${lead.firstName} ${lead.lastName}` : undefined),
                  leadAvatar: d.leadAvatar ?? lead?.avatarUrl,
                };
              })
            : [];

        // 3. Live Job Titles
        const jobs: JobTitle[] =
          jobResult.status === 'fulfilled' && Array.isArray(jobResult.value) ? jobResult.value : [];

        // 4. Live Attendance Logs
        const attendance: AttendanceRecord[] =
          attResult.status === 'fulfilled' && Array.isArray(attResult.value)
            ? attResult.value.map((a: any) => {
                const emp = employees.find((e) => e.employeeId === a.employeeId);
                const formatTime = (t?: string) => {
                  if (!t) return null;
                  return t.includes('T') ? t.split('T')[1].substring(0, 5) : t.substring(0, 5);
                };
                return {
                  attendanceId: a.attendanceId || Date.now(),
                  employeeId: a.employeeId,
                  employeeName:
                    a.employeeName ||
                    (emp ? `${emp.firstName} ${emp.lastName}` : `Employee #${a.employeeId}`),
                  attendanceDate: String(a.attendanceDate || getLocalDateStr()),
                  checkIn: formatTime(a.checkIn),
                  checkOut: formatTime(a.checkOut),
                  lateMinutes: a.lateMinutes || 0,
                  otHours: a.otHours || 0,
                  status: a.status || (a.lateMinutes > 0 ? 'LATE' : 'PRESENT'),
                };
              })
            : [];

        // 5. Live Leave Applications
        const leaves: LeaveRequest[] =
          leaveResult.status === 'fulfilled' && Array.isArray(leaveResult.value)
            ? leaveResult.value.map((l: any) => {
                const emp = employees.find((e) => e.employeeId === l.employeeId);
                let days = l.daysCount;
                if (!days && l.startDate && l.endDate) {
                  days =
                    Math.round(
                      (new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1;
                }
                return {
                  leaveId: l.leaveId,
                  employeeId: l.employeeId,
                  employeeName:
                    l.employeeName ||
                    (emp ? `${emp.firstName} ${emp.lastName}` : `Employee #${l.employeeId}`),
                  leaveType: l.leaveType || 'Casual Leave',
                  startDate: l.startDate,
                  endDate: l.endDate,
                  daysCount: days || 1,
                  reason: l.reason || '',
                  status: l.status || 'PENDING',
                  approvedBy: l.approvedByName || l.approvedBy,
                  appliedDate: l.appliedDate || l.startDate,
                };
              })
            : [];

        // 6. Live Payroll Records
        const payroll: PayrollRecord[] =
          payrollResult.status === 'fulfilled' && Array.isArray(payrollResult.value)
            ? payrollResult.value.map((p: any) => formatPayrollRecord(p, employees, currentPeriod))
            : [];

        // Hydrate employee base salaries from payroll records + job salary bands
        const hydratedEmployees: Employee[] = employees.map((emp) => {
          const pr = payroll.find((p) => p.employeeId === emp.employeeId);
          if (pr && pr.baseSalary > 0) {
            return { ...emp, salary: pr.baseSalary };
          }
          const matchedJob =
            jobs.find((j) => j.jobId === (emp as any).jobId) ||
            jobs.find(
              (j) =>
                j.jobTitle.trim().toLowerCase() === (emp.jobTitle || '').trim().toLowerCase()
            );
          if (matchedJob?.minSalary && matchedJob.minSalary > 0 && (!emp.salary || emp.salary <= 0)) {
            return { ...emp, salary: matchedJob.minSalary };
          }
          return emp;
        });

        // 7. Live CRON History
        const cronHistory: JobExecution[] =
          cronResult.status === 'fulfilled' && Array.isArray(cronResult.value)
            ? cronResult.value.map((c: any) => ({
                id: String(c.id),
                jobName: c.jobName,
                executionTime: c.startTime
                  ? c.startTime.replace('T', ' ').substring(0, 19)
                  : c.executionTime || '',
                status: c.status === 'COMPLETED' ? 'SUCCESS' : c.status,
                durationMs:
                  c.durationMs ??
                  (c.startTime && c.endTime
                    ? Math.max(1, Math.round(new Date(c.endTime).getTime() - new Date(c.startTime).getTime()))
                    : 0),
                message: c.errorMessage || c.message || `Job ${c.jobName} executed`,
                triggeredBy: c.triggeredBy || 'CRON_SCHEDULER',
              }))
            : [];

        // 8. Live Report Dashboard Metrics (unwrap ApiResponse<DashboardSummaryResponse>)
        let dashboardSummary: any = null;
        if (reportResult.status === 'fulfilled' && reportResult.value) {
          dashboardSummary = reportResult.value?.data ?? reportResult.value;
        }

        // Synthesize Pending Actions from Live Pending Leaves + existing Pending Attendance Corrections
        const existingCorrectionActions = get().pendingActions.filter(
          (a) => a.actionKind === 'correction'
        );
        const leavePendingActions: PendingAction[] = leaves
          .filter((l) => l.status === 'PENDING')
          .map((l) => ({
            id: `leave-${l.leaveId}`,
            code: `HR-LV-${l.leaveId}`,
            title: `Review ${l.leaveType} (${l.daysCount}d)`,
            employeeName: l.employeeName,
            badgeText: 'Review Required',
            badgeType: 'warning',
            lastUpdated: l.appliedDate || 'Awaiting Action',
            actionText: 'Review Leave',
            actionKind: 'leave',
            leaveType: l.leaveType,
            daysCount: l.daysCount,
          }));
        const pendingActions: PendingAction[] = [
          ...existingCorrectionActions,
          ...leavePendingActions,
        ];

        set({
          isLoading: false,
          isGatewayConnected: true,
          gatewayError: null,
          employees: hydratedEmployees,
          departments,
          jobs,
          attendance,
          leaves,
          payroll,
          cronHistory,
          dashboardSummary,
          pendingActions,
        });

        // Background-hydrate individual payroll profiles so configured baseSalary overrides fallback
        Promise.allSettled(
          hydratedEmployees.map(async (emp) => {
            const prof = await payrollApi.getProfile(emp.employeeId);
            if (prof && Number(prof.baseSalary) > 0) {
              return { employeeId: emp.employeeId, salary: Number(prof.baseSalary) };
            }
            return null;
          })
        ).then((results) => {
          const updatesMap = new Map<number, number>();
          results.forEach((r) => {
            if (r.status === 'fulfilled' && r.value) {
              updatesMap.set(r.value.employeeId, r.value.salary);
            }
          });
          if (updatesMap.size > 0) {
            set((state) => ({
              employees: state.employees.map((e) =>
                updatesMap.has(e.employeeId)
                  ? { ...e, salary: updatesMap.get(e.employeeId)! }
                  : e
              ),
            }));
          }
        });
      } catch (err: any) {
        set({
          isLoading: false,
          isGatewayConnected: false,
          gatewayError: extractApiError(
            err,
            'Failed to synchronize with Spring Cloud Gateway (:8080)'
          ),
        });
      }
    },

    // ==========================================
    // Department Mutating Actions
    // ==========================================
    addDepartment: async (deptData) => {
      try {
        const res = await departmentApi.create({
          departmentName: deptData.departmentName,
          description: deptData.description,
        });
        const newDept: Department = {
          departmentId: res.departmentId,
          departmentName: res.departmentName,
          description: res.description || '',
          headCount: 0,
          leadEmployeeId: deptData.leadEmployeeId,
          leadName: deptData.leadName,
          leadAvatar: deptData.leadAvatar,
          budget: deptData.budget || 50000,
        };
        set((state) => ({ departments: [...state.departments, newDept] }));
        return { success: true, data: newDept };
      } catch (err: any) {
        return { success: false, error: extractApiError(err, 'Failed to create department.') };
      }
    },

    updateDepartment: async (id, updates) => {
      try {
        const res = await departmentApi.update(id, {
          departmentName: updates.departmentName,
          description: updates.description,
        });
        set((state) => ({
          departments: state.departments.map((d) =>
            d.departmentId === id
              ? {
                  ...d,
                  ...updates,
                  departmentName: res.departmentName ?? updates.departmentName ?? d.departmentName,
                  description: res.description ?? updates.description ?? d.description,
                }
              : d
          ),
        }));
        return { success: true };
      } catch (err: any) {
        return { success: false, error: extractApiError(err, 'Failed to update department.') };
      }
    },

    deleteDepartment: async (id) => {
      try {
        await departmentApi.delete(id);
        set((s) => ({ departments: s.departments.filter((d) => d.departmentId !== id) }));
        return { success: true };
      } catch (err: any) {
        return {
          success: false,
          error: extractApiError(
            err,
            'Cannot delete department with active assigned employees or job positions.'
          ),
        };
      }
    },

    // ==========================================
    // Job Title Mutating Actions
    // ==========================================
    addJobTitle: async (jobData) => {
      try {
        const res = await jobApi.create({
          jobTitle: jobData.jobTitle.trim(),
          description: jobData.description,
          departmentId: jobData.departmentId,
        });
        const dept = get().departments.find((d) => d.departmentId === jobData.departmentId);
        const created: JobTitle = {
          jobId: res.jobId,
          jobTitle: res.jobTitle,
          departmentId: res.departmentId,
          departmentName: res.departmentName || dept?.departmentName || '',
          minSalary: jobData.minSalary,
          maxSalary: jobData.maxSalary,
          description: res.description,
        };
        set((s) => ({ jobs: [...s.jobs, created] }));
        return { success: true, data: created };
      } catch (err: any) {
        return { success: false, error: extractApiError(err, 'Failed to create job title.') };
      }
    },

    deleteJobTitle: async (id) => {
      try {
        await jobApi.delete(id);
        set((s) => ({ jobs: s.jobs.filter((j) => j.jobId !== id) }));
        return { success: true };
      } catch (err: any) {
        return {
          success: false,
          error: extractApiError(
            err,
            'Cannot delete job position because it is assigned to employees or job history.'
          ),
        };
      }
    },

    // ==========================================
    // Cron Automations Actions
    // ==========================================
    triggerCronJob: async (jobName) => {
      try {
        await cronApi.triggerJob(jobName);
        const history = await cronApi.getHistory();
        if (Array.isArray(history)) {
          const formatted: JobExecution[] = history.map((c: any) => ({
            id: String(c.id),
            jobName: c.jobName,
            executionTime: c.startTime
              ? c.startTime.replace('T', ' ').substring(0, 19)
              : c.executionTime || '',
            status: c.status === 'COMPLETED' ? 'SUCCESS' : c.status,
            durationMs:
              c.durationMs ??
              (c.startTime && c.endTime
                ? Math.max(1, Math.round(new Date(c.endTime).getTime() - new Date(c.startTime).getTime()))
                : 0),
            message: c.errorMessage || c.message || `Job ${c.jobName} triggered successfully`,
            triggeredBy: c.triggeredBy || `MANUAL (${get().currentUser.userName})`,
          }));
          set({ cronHistory: formatted });
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: extractApiError(err, 'Failed to trigger CRON job.') };
      }
    },

    // ==========================================
    // Attendance Corrections
    // ==========================================
    requestAttendanceCorrection: async (reqData) => {
      try {
        const formatIso = (dateStr: string, timeStr: string) => {
          const t = timeStr.trim();
          if (t.includes('T')) return t;
          const ampmMatch = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
          if (ampmMatch) {
            let h = parseInt(ampmMatch[1], 10);
            const m = ampmMatch[2];
            const mer = ampmMatch[3]?.toUpperCase();
            if (mer === 'PM' && h < 12) h += 12;
            if (mer === 'AM' && h === 12) h = 0;
            return `${dateStr}T${String(h).padStart(2, '0')}:${m}:00`;
          }
          return `${dateStr}T08:00:00`;
        };

        const role = get().currentUser.role;
        if (
          (role === 'ROLE_ADMIN' || role === 'ROLE_HR') &&
          reqData.attendanceId &&
          Number(reqData.attendanceId) < 1000000000
        ) {
          await attendanceApi
            .requestCorrection(reqData.attendanceId, {
              checkIn: formatIso(reqData.attendanceDate, reqData.requestedCheckIn),
              checkOut: reqData.requestedCheckOut
                ? formatIso(reqData.attendanceDate, reqData.requestedCheckOut)
                : undefined,
              status: 'PRESENT',
              lateMinutes: 0,
              reason: reqData.reason,
            })
            .catch(() => {});
        }

        const newCorrection: AttendanceCorrection = {
          ...reqData,
          correctionId: Date.now(),
          status: 'PENDING',
          requestedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };

        const newAction: PendingAction = {
          id: `corr-${newCorrection.correctionId}`,
          code: `HR-CORR-${String(newCorrection.correctionId).slice(-4)}`,
          title: `Biometric Punch Dispute (${reqData.requestedCheckIn} / ${reqData.requestedCheckOut})`,
          employeeName: reqData.employeeName,
          badgeText: 'Dispute Pending',
          badgeType: 'info',
          lastUpdated: 'Just now',
          actionText: 'Inspect Log',
          actionKind: 'correction',
          requestedCheckIn: reqData.requestedCheckIn,
          requestedCheckOut: reqData.requestedCheckOut,
        };

        set((state) => ({
          attendanceCorrections: [newCorrection, ...state.attendanceCorrections],
          pendingActions: [newAction, ...state.pendingActions],
        }));

        return { success: true, data: newCorrection };
      } catch (err: any) {
        return {
          success: false,
          error: extractApiError(err, 'Failed to submit attendance correction.'),
        };
      }
    },

    reviewAttendanceCorrection: async (correctionId, status) => {
      const target = get().attendanceCorrections.find((c) => c.correctionId === correctionId);
      if (
        status === 'APPROVED' &&
        target &&
        target.attendanceId &&
        Number(target.attendanceId) < 1000000000
      ) {
        const formatIso = (dateStr: string, timeStr: string) => {
          const t = timeStr.trim();
          if (t.includes('T')) return t;
          const ampmMatch = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
          if (ampmMatch) {
            let h = parseInt(ampmMatch[1], 10);
            const m = ampmMatch[2];
            const mer = ampmMatch[3]?.toUpperCase();
            if (mer === 'PM' && h < 12) h += 12;
            if (mer === 'AM' && h === 12) h = 0;
            return `${dateStr}T${String(h).padStart(2, '0')}:${m}:00`;
          }
          return `${dateStr}T08:00:00`;
        };
        await attendanceApi
          .requestCorrection(target.attendanceId, {
            checkIn: formatIso(target.attendanceDate, target.requestedCheckIn),
            checkOut: target.requestedCheckOut
              ? formatIso(target.attendanceDate, target.requestedCheckOut)
              : undefined,
            status: 'PRESENT',
            lateMinutes: 0,
            reason: target.reason || 'Approved attendance correction',
          })
          .catch(() => {});
      }

      set((state) => {
        if (!target) return state;

        const updatedCorrections = state.attendanceCorrections.map((c) =>
          c.correctionId === correctionId
            ? {
                ...c,
                status,
                reviewedBy: state.currentUser.fullName,
                reviewedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
              }
            : c
        );

        let updatedAttendance = state.attendance;
        if (status === 'APPROVED') {
          updatedAttendance = state.attendance.map((a) =>
            a.attendanceId === target.attendanceId
              ? {
                  ...a,
                  checkIn: target.requestedCheckIn,
                  checkOut: target.requestedCheckOut,
                  status: 'PRESENT' as const,
                  lateMinutes: 0,
                }
              : a
          );
        }

        return {
          attendanceCorrections: updatedCorrections,
          attendance: updatedAttendance,
          pendingActions: state.pendingActions.filter(
            (a) => a.id !== `corr-${correctionId}` && !a.code.includes(String(correctionId))
          ),
        };
      });
      return { success: true };
    },

    // ==========================================
    // Employee Mutating Actions
    // ==========================================
    addEmployee: async (empData) => {
      const state = get();
      let jobId = empData.jobId;
      if (!jobId && empData.jobTitle) {
        const match = state.jobs.find(
          (j) =>
            j.jobTitle.trim().toLowerCase() === empData.jobTitle.trim().toLowerCase() &&
            (!empData.departmentId || j.departmentId === Number(empData.departmentId))
        );
        if (match) jobId = match.jobId;
      }
      if (!jobId) {
        const deptJob = state.jobs.find((j) => j.departmentId === Number(empData.departmentId));
        jobId = deptJob ? deptJob.jobId : state.jobs[0]?.jobId || 1;
      }

      try {
        const payload = {
          firstName: empData.firstName,
          lastName: empData.lastName,
          dateOfBirth: empData.dateOfBirth || empData.dob || '1995-01-01',
          email: empData.email,
          contractEndDate: empData.contractEndDate || '2028-12-31',
          departmentId: Number(empData.departmentId || 1),
          jobId: Number(jobId),
          jobChangeRemark: empData.jobChangeRemark || 'New employee registration',
        };

        const res = await employeeApi.create(payload);

        // Save payroll profile if salary provided
        if (empData.salary && Number(empData.salary) > 0) {
          const base = Number(empData.salary);
          payrollApi
            .saveProfile(res.employeeId, {
              baseSalary: base,
              dailyRate: Number((base / 22).toFixed(2)),
              latePenaltyPerMinute: Number((base / 22 / 480).toFixed(4)),
            })
            .catch(() => {});
        }

        const newEmp = normalizeEmployee({ ...res, salary: Number(empData.salary || 0) });

        set((s) => ({
          employees: [newEmp, ...s.employees],
          departments: s.departments.map((d) =>
            d.departmentId === newEmp.departmentId
              ? { ...d, headCount: d.headCount + 1 }
              : d
          ),
        }));
        return { success: true, data: newEmp };
      } catch (err: any) {
        return { success: false, error: extractApiError(err, 'Failed to register employee.') };
      }
    },

    updateEmployee: async (id, updates) => {
      const state = get();
      const existing = state.employees.find((e) => e.employeeId === id);

      try {
        // Resolve jobId belonging to target department
        const deptId = Number(updates.departmentId || existing?.departmentId || 1);
        let jobId = updates.jobId;
        if (!jobId && updates.jobTitle) {
          const match = state.jobs.find(
            (j) =>
              j.departmentId === deptId &&
              j.jobTitle.trim().toLowerCase() === updates.jobTitle.trim().toLowerCase()
          );
          jobId = match?.jobId;
        }
        if (!jobId) {
          const fallbackJob = state.jobs.find((j) => j.departmentId === deptId) || state.jobs[0];
          jobId = fallbackJob?.jobId || 1;
        }

        let updatedRes: any = null;

        // 1. Update core Employee fields via PATCH /api/employees/{id}
        if (
          updates.firstName !== undefined ||
          updates.lastName !== undefined ||
          updates.email !== undefined ||
          updates.departmentId !== undefined ||
          updates.jobId !== undefined ||
          updates.jobTitle !== undefined
        ) {
          const payload = {
            firstName: updates.firstName ?? existing?.firstName ?? '',
            lastName: updates.lastName ?? existing?.lastName ?? '',
            dateOfBirth: updates.dateOfBirth || updates.dob || existing?.dob || '1995-01-01',
            email: updates.email ?? existing?.email ?? '',
            contractEndDate: updates.contractEndDate ?? existing?.contractEndDate ?? '2028-12-31',
            departmentId: deptId,
            jobId: Number(jobId),
            jobChangeRemark: updates.jobChangeRemark || 'Profile updated',
          };
          updatedRes = await employeeApi.update(id, payload);
        }

        // 2. Update status via PATCH /api/employees/{id}/status if status was supplied
        if (updates.status) {
          const backendStatus =
            updates.status === 'Active'
              ? 'ACTIVE'
              : updates.status === 'On Leave'
              ? 'ON_LEAVE'
              : updates.status === 'Terminated'
              ? 'TERMINATED'
              : updates.status === 'Probation'
              ? 'PROBATION'
              : String(updates.status).toUpperCase();
          updatedRes = await employeeApi.updateStatus(id, backendStatus);
        }

        // 3. Persist updated base salary via POST /api/payroll/profiles/{employeeId} if provided
        if (updates.salary !== undefined && Number(updates.salary) > 0) {
          const base = Number(updates.salary);
          await payrollApi.saveProfile(id, {
            baseSalary: base,
            dailyRate: Number((base / 22).toFixed(2)),
            latePenaltyPerMinute: Number((base / 22 / 480).toFixed(4)),
          });
        }

        const merged = updatedRes
          ? normalizeEmployee({ ...updatedRes, salary: updates.salary ?? existing?.salary ?? 0 })
          : { ...existing, ...updates };

        set((s) => {
          let updatedDepts = s.departments;
          if (existing && merged.departmentId && merged.departmentId !== existing.departmentId) {
            updatedDepts = s.departments.map((d) => {
              if (d.departmentId === existing.departmentId) {
                return { ...d, headCount: Math.max(0, d.headCount - 1) };
              }
              if (d.departmentId === merged.departmentId) {
                return { ...d, headCount: d.headCount + 1 };
              }
              return d;
            });
          }
          return {
            employees: s.employees.map((e) => (e.employeeId === id ? { ...e, ...merged } : e)),
            departments: updatedDepts,
          };
        });

        return { success: true, data: merged };
      } catch (err: any) {
        return { success: false, error: extractApiError(err, 'Failed to update employee profile.') };
      }
    },

    deleteEmployee: async (id) => {
      try {
        await employeeApi.updateStatus(id, 'TERMINATED');
        set((state) => {
          const targetEmp = state.employees.find((e) => e.employeeId === id);
          return {
            employees: state.employees.filter((e) => e.employeeId !== id),
            departments: state.departments.map((d) =>
              targetEmp && d.departmentId === targetEmp.departmentId
                ? { ...d, headCount: Math.max(0, d.headCount - 1) }
                : d
            ),
          };
        });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: extractApiError(err, 'Failed to terminate employee.') };
      }
    },

    // ==========================================
    // Attendance Punch Mutating Actions
    // ==========================================
    recordAttendancePunch: async (type, note) => {
      try {
        const res =
          type === 'IN' ? await attendanceApi.checkIn(note) : await attendanceApi.checkOut(note);
        await get().syncWithGateway();
        return { success: true, data: res };
      } catch (err: any) {
        return { success: false, error: extractApiError(err, 'Attendance punch failed.') };
      }
    },

    checkInToday: async () => {
      try {
        const res = await attendanceApi.checkIn();
        await get().syncWithGateway();
        return { success: true, data: res };
      } catch (err: any) {
        return { success: false, error: extractApiError(err, 'Check-in failed.') };
      }
    },

    checkOutToday: async () => {
      try {
        const res = await attendanceApi.checkOut();
        await get().syncWithGateway();
        return { success: true, data: res };
      } catch (err: any) {
        return { success: false, error: extractApiError(err, 'Check-out failed.') };
      }
    },

    // ==========================================
    // Leave Mutating Actions
    // ==========================================
    submitLeaveRequest: async (reqData) => {
      try {
        const payload = {
          leaveType: reqData.leaveType,
          startDate: reqData.startDate,
          endDate: reqData.endDate,
          reason: reqData.reason || '',
        };

        const res = await leaveApi.apply(payload);

        let daysCount = reqData.daysCount;
        if (!daysCount && res.startDate && res.endDate) {
          daysCount =
            Math.round(
              (new Date(res.endDate).getTime() - new Date(res.startDate).getTime()) /
                (1000 * 60 * 60 * 24)
            ) + 1;
        }

        const newLeave: LeaveRequest = {
          leaveId: res.leaveId,
          employeeId: res.employeeId || reqData.employeeId || 1,
          employeeName: res.employeeName || reqData.employeeName || get().currentUser.fullName,
          leaveType: res.leaveType || reqData.leaveType,
          startDate: res.startDate || reqData.startDate,
          endDate: res.endDate || reqData.endDate,
          daysCount: daysCount || 1,
          reason: res.reason || reqData.reason || '',
          status: res.status || 'PENDING',
          appliedDate: res.appliedDate || getLocalDateStr(),
        };

        const newAction: PendingAction = {
          id: `leave-${newLeave.leaveId}`,
          code: `HR-LV-${newLeave.leaveId}`,
          title: `Review ${newLeave.leaveType} (${newLeave.daysCount}d)`,
          employeeName: newLeave.employeeName,
          badgeText: 'Awaiting Decision',
          badgeType: 'warning',
          lastUpdated: 'Just now',
          actionText: 'Review Leave',
          actionKind: 'leave',
          leaveType: newLeave.leaveType,
          daysCount: newLeave.daysCount,
        };

        set((state) => ({
          leaves: [newLeave, ...state.leaves],
          pendingActions: [newAction, ...state.pendingActions],
        }));
        return { success: true, data: newLeave };
      } catch (err: any) {
        return { success: false, error: extractApiError(err, 'Failed to submit leave request.') };
      }
    },

    updateLeaveStatus: async (leaveId, status) => {
      try {
        if (status === 'APPROVED') {
          await leaveApi.approve(leaveId);
        } else {
          await leaveApi.reject(leaveId, 'Decision processed by administrator');
        }

        set((state) => ({
          leaves: state.leaves.map((l) =>
            l.leaveId === leaveId ? { ...l, status, approvedBy: state.currentUser.fullName } : l
          ),
          pendingActions: state.pendingActions.filter(
            (a) => a.id !== `leave-${leaveId}` && !a.code.includes(String(leaveId))
          ),
        }));

        return { success: true };
      } catch (err: any) {
        return { success: false, error: extractApiError(err, 'Failed to update leave status.') };
      }
    },

    cancelLeaveRequest: async (leaveId) => {
      try {
        await leaveApi.cancel(leaveId);
        set((state) => ({
          leaves: state.leaves.filter((l) => l.leaveId !== leaveId),
          pendingActions: state.pendingActions.filter(
            (a) => a.id !== `leave-${leaveId}` && !a.code.includes(String(leaveId))
          ),
        }));
        return { success: true };
      } catch (err: any) {
        return { success: false, error: extractApiError(err, 'Failed to cancel leave request.') };
      }
    },

    // ==========================================
    // Payroll Mutating Actions
    // ==========================================
    fetchPayrollByPeriod: async (periodMonth) => {
      try {
        const ym = normalizePeriodYm(periodMonth);
        const rawList = await payrollApi.getAll(ym);
        const employees = get().employees;
        const formatted = Array.isArray(rawList)
          ? rawList.map((p: any) => formatPayrollRecord(p, employees, ym))
          : [];
        set({ payroll: formatted });
        return { success: true, data: formatted };
      } catch (err: any) {
        return { success: false, error: extractApiError(err, 'Failed to fetch payroll period.') };
      }
    },

    generateMonthlyPayroll: async (periodMonth) => {
      try {
        const ym = normalizePeriodYm(periodMonth);
        await payrollApi.generateBatch(ym);
        const rawList = await payrollApi.getAll(ym);
        const employees = get().employees;
        const formatted = Array.isArray(rawList)
          ? rawList.map((p: any) => formatPayrollRecord(p, employees, ym))
          : [];
        set({ payroll: formatted });
        return { success: true };
      } catch (err: any) {
        return {
          success: false,
          error: extractApiError(err, 'Failed to generate monthly payroll batch.'),
        };
      }
    },

    savePayrollProfile: async (employeeId, payload) => {
      try {
        await payrollApi.saveProfile(employeeId, payload);
        set((state) => ({
          employees: state.employees.map((e) =>
            e.employeeId === employeeId ? { ...e, salary: Number(payload.baseSalary) } : e
          ),
        }));
        return { success: true };
      } catch (err: any) {
        return {
          success: false,
          error: extractApiError(err, 'Failed to save compensation profile.'),
        };
      }
    },

    markPayrollPaid: async (recordId) => {
      set((state) => ({
        payroll: state.payroll.map((p) =>
          p.recordId === recordId
            ? { ...p, status: 'PAID' as const, paidDate: getLocalDateStr() }
            : p
        ),
      }));
      return { success: true };
    },
  };
});
