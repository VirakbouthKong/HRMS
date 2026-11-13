export type UserRole = 'ROLE_ADMIN' | 'ROLE_HR' | 'ROLE_EMPLOYEE';

export interface UserAccount {
  accountId: number;
  userName: string;
  email: string;
  role: UserRole;
  employeeId?: number;
  fullName: string;
  avatarUrl: string;
}

export interface Employee {
  employeeId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  gender?: 'Male' | 'Female' | 'Other' | string;
  dob?: string;
  dateOfBirth?: string;
  salary: number;
  departmentId: number;
  departmentName: string;
  jobTitle: string;
  status: 'Active' | 'On Leave' | 'Terminated' | 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | string;
  hireDate?: string;
  contractEndDate?: string;
  avatarUrl?: string;
}

export interface Department {
  departmentId: number;
  departmentName: string;
  description: string;
  headCount: number;
  leadEmployeeId?: number;
  leadName?: string;
  leadAvatar?: string;
  budget?: number;
}

export interface JobTitle {
  jobId: number;
  jobTitle: string;
  description?: string;
  minSalary?: number;
  maxSalary?: number;
  departmentId?: number;
  departmentName?: string;
}

export interface JobExecution {
  id: string;
  jobName: 'DailyAttendanceSyncJob' | 'ContractExpiryJob' | 'MonthlyPayrollJob' | 'WeeklyReportJob' | string;
  executionTime: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  durationMs: number;
  message: string;
  triggeredBy: string;
}

export interface AttendanceCorrection {
  correctionId: number;
  attendanceId: number;
  employeeId: number;
  employeeName: string;
  attendanceDate: string;
  originalCheckIn: string | null;
  originalCheckOut: string | null;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface PayrollProfile {
  profileId?: number;
  employeeId: number;
  baseSalary: number;
  dailyRate: number;
  latePenaltyPerMinute: number;
}

export interface AttendanceRecord {
  attendanceId: number;
  employeeId: number;
  employeeName: string;
  attendanceDate: string;
  checkIn: string | null;
  checkOut: string | null;
  lateMinutes: number;
  otHours: number;
  status: 'PRESENT' | 'LATE' | 'ON_LEAVE' | 'ABSENT';
}

export interface LeaveRequest {
  leaveId: number;
  employeeId: number;
  employeeName: string;
  leaveType:
    | 'Casual Leave'
    | 'Sick Leave'
    | 'Annual Leave'
    | 'Maternity Leave'
    | 'Unpaid Leave'
    | 'Birthday / Anniv'
    | 'Optional Holiday'
    | 'Privilege Leave'
    | string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  approvedBy?: string;
  appliedDate: string;
}

export interface PayrollRecord {
  recordId: number;
  employeeId: number;
  employeeName: string;
  jobTitle: string;
  departmentName: string;
  periodMonth: string; // e.g., "January 2026"
  baseSalary: number;
  allowances: number;
  lateDeductions: number;
  taxDeductions: number;
  netSalary: number;
  status: 'PAID' | 'PROCESSED' | 'PENDING';
  paidDate?: string;
}

export interface PendingAction {
  id: string;
  code: string; // e.g. "HR-APR-2026-00023"
  title: string;
  employeeName: string;
  badgeText: string;
  badgeType: 'success' | 'warning' | 'info';
  lastUpdated: string;
  actionText: string;
  actionKind?: 'leave' | 'correction';
  leaveType?: string;
  daysCount?: number;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
}

export interface Announcement {
  id: number;
  description: string;
  date: string;
  tag?: string;
}
