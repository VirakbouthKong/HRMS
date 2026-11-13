import { UserRole } from '../types';
import { NavTab } from '../store/useHrmsStore';

export type Permission =
  // Employee Directory
  | 'EMPLOYEE_VIEW_DIRECTORY'
  | 'EMPLOYEE_VIEW_SALARY'
  | 'EMPLOYEE_CREATE'
  | 'EMPLOYEE_EDIT'
  | 'EMPLOYEE_DELETE'
  // Attendance & Punch
  | 'ATTENDANCE_PUNCH'
  | 'ATTENDANCE_VIEW_OWN'
  | 'ATTENDANCE_VIEW_ALL'
  | 'ATTENDANCE_CORRECTION_REQUEST'
  | 'ATTENDANCE_CORRECTION_APPROVE'
  // Leave Management
  | 'LEAVE_APPLY'
  | 'LEAVE_VIEW_OWN'
  | 'LEAVE_VIEW_ALL'
  | 'LEAVE_APPROVE_REJECT'
  | 'LEAVE_CANCEL_OWN'
  // Payroll & Compensation
  | 'PAYROLL_VIEW_OWN'
  | 'PAYROLL_VIEW_ALL'
  | 'PAYROLL_GENERATE_BATCH'
  | 'PAYROLL_MARK_PAID'
  | 'PAYROLL_EDIT_PROFILE'
  // Reports & Analytics
  | 'REPORTS_VIEW_EXECUTIVE';

/**
 * Enterprise RBAC Permission Matrix
 * Directly aligned with Spring Security @PreAuthorize rules across
 * operation_service, auth_service, and report_service behind the Spring Cloud Gateway (:8080).
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ROLE_ADMIN: [
    'EMPLOYEE_VIEW_DIRECTORY',
    'EMPLOYEE_VIEW_SALARY',
    'EMPLOYEE_CREATE',
    'EMPLOYEE_EDIT',
    'EMPLOYEE_DELETE',
    'ATTENDANCE_PUNCH',
    'ATTENDANCE_VIEW_OWN',
    'ATTENDANCE_VIEW_ALL',
    'ATTENDANCE_CORRECTION_REQUEST',
    'ATTENDANCE_CORRECTION_APPROVE',
    'LEAVE_APPLY',
    'LEAVE_VIEW_OWN',
    'LEAVE_VIEW_ALL',
    'LEAVE_APPROVE_REJECT',
    'LEAVE_CANCEL_OWN',
    'PAYROLL_VIEW_OWN',
    'PAYROLL_VIEW_ALL',
    'PAYROLL_GENERATE_BATCH',
    'PAYROLL_MARK_PAID',
    'PAYROLL_EDIT_PROFILE',
    'REPORTS_VIEW_EXECUTIVE',
  ],

  ROLE_HR: [
    'EMPLOYEE_VIEW_DIRECTORY',
    'EMPLOYEE_VIEW_SALARY',
    'EMPLOYEE_CREATE',
    'EMPLOYEE_EDIT',
    'ATTENDANCE_PUNCH',
    'ATTENDANCE_VIEW_OWN',
    'ATTENDANCE_VIEW_ALL',
    'ATTENDANCE_CORRECTION_REQUEST',
    'ATTENDANCE_CORRECTION_APPROVE',
    'LEAVE_APPLY',
    'LEAVE_VIEW_OWN',
    'LEAVE_VIEW_ALL',
    'LEAVE_APPROVE_REJECT',
    'LEAVE_CANCEL_OWN',
    'PAYROLL_VIEW_OWN',
    'PAYROLL_VIEW_ALL',
    'PAYROLL_GENERATE_BATCH',
    'PAYROLL_MARK_PAID',
    'PAYROLL_EDIT_PROFILE',
    'REPORTS_VIEW_EXECUTIVE',
  ],

  ROLE_EMPLOYEE: [
    'EMPLOYEE_VIEW_DIRECTORY',
    'ATTENDANCE_PUNCH',
    'ATTENDANCE_VIEW_OWN',
    'ATTENDANCE_CORRECTION_REQUEST',
    'LEAVE_APPLY',
    'LEAVE_VIEW_OWN',
    'LEAVE_CANCEL_OWN',
    'PAYROLL_VIEW_OWN',
  ],
};

/**
 * Evaluates whether a given user role possesses a specific capability.
 */
export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

/**
 * Tab access rules for top-level navigation.
 */
export const isRoleAllowedForTab = (role: UserRole, tab: NavTab): boolean => {
  switch (tab) {
    case 'dashboard':
    case 'attendance':
    case 'timesheet':
    case 'leaves':
    case 'payroll':
    case 'employees':
    case 'profile':
      return true; // accessible to all, but internal view is contextually scoped
    case 'departments':
      return role === 'ROLE_ADMIN' || role === 'ROLE_HR';
    case 'automations':
      return role === 'ROLE_ADMIN' || role === 'ROLE_HR';
    case 'reports':
      return hasPermission(role, 'REPORTS_VIEW_EXECUTIVE');
    default:
      return true;
  }
};

/**
 * Returns allowed navigation tabs for a role.
 */
export const getAllowedTabs = (role: UserRole): NavTab[] => {
  const allTabs: NavTab[] = [
    'dashboard',
    'attendance',
    'employees',
    'departments',
    'automations',
    'leaves',
    'payroll',
    'reports',
    'profile',
  ];
  return allTabs.filter((tab) => isRoleAllowedForTab(role, tab));
};

/**
 * Visual badge formatting per role.
 */
export interface RoleBadgeConfig {
  label: string;
  shortTag: string;
  description: string;
  badgeClass: string;
  dotClass: string;
}

export const getRoleBadge = (role: UserRole): RoleBadgeConfig => {
  switch (role) {
    case 'ROLE_ADMIN':
      return {
        label: 'System Administrator',
        shortTag: 'ADMIN',
        description: 'Full Governance & Financial Control',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
        dotClass: 'bg-purple-500',
      };
    case 'ROLE_HR':
      return {
        label: 'HR Operations Manager',
        shortTag: 'HR MANAGER',
        description: 'People Operations & Roster Oversight',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
        dotClass: 'bg-blue-500',
      };
    case 'ROLE_EMPLOYEE':
      return {
        label: 'Staff Member',
        shortTag: 'EMPLOYEE',
        description: 'Employee Self-Service Portal',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dotClass: 'bg-emerald-500',
      };
  }
};

/**
 * Gateway Route Contract Mapping
 * Documents the Spring Cloud Gateway filters and downstream service @PreAuthorize expressions.
 */
export interface GatewayRouteMapping {
  operation: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  requiredAuthority: string;
  allowedRoles: UserRole[];
}

export const GATEWAY_ROUTE_MAPPINGS: GatewayRouteMapping[] = [
  // Employees
  {
    operation: 'Get Employee Directory',
    httpMethod: 'GET',
    endpoint: '/api/employees',
    requiredAuthority: "hasAnyRole('ADMIN', 'HR_MANAGER')",
    allowedRoles: ['ROLE_ADMIN', 'ROLE_HR'],
  },
  {
    operation: 'Create Employee',
    httpMethod: 'POST',
    endpoint: '/api/employees',
    requiredAuthority: "hasAnyRole('ADMIN', 'HR_MANAGER')",
    allowedRoles: ['ROLE_ADMIN', 'ROLE_HR'],
  },
  {
    operation: 'Update Employee Status',
    httpMethod: 'PATCH',
    endpoint: '/api/employees/{id}/status',
    requiredAuthority: "hasAnyRole('ADMIN', 'HR_MANAGER')",
    allowedRoles: ['ROLE_ADMIN', 'ROLE_HR'],
  },
  // Attendance
  {
    operation: 'Punch Check-In',
    httpMethod: 'POST',
    endpoint: '/api/attendance/check-in',
    requiredAuthority: "hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')",
    allowedRoles: ['ROLE_ADMIN', 'ROLE_HR', 'ROLE_EMPLOYEE'],
  },
  {
    operation: 'Punch Check-Out',
    httpMethod: 'POST',
    endpoint: '/api/attendance/check-out',
    requiredAuthority: "hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')",
    allowedRoles: ['ROLE_ADMIN', 'ROLE_HR', 'ROLE_EMPLOYEE'],
  },
  {
    operation: 'Get Personal Attendance History',
    httpMethod: 'GET',
    endpoint: '/api/attendance/me',
    requiredAuthority: "hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')",
    allowedRoles: ['ROLE_ADMIN', 'ROLE_HR', 'ROLE_EMPLOYEE'],
  },
  {
    operation: 'Get Company Attendance Audit Log',
    httpMethod: 'GET',
    endpoint: '/api/attendance',
    requiredAuthority: "hasAnyRole('ADMIN', 'HR_MANAGER')",
    allowedRoles: ['ROLE_ADMIN', 'ROLE_HR'],
  },
  // Leaves
  {
    operation: 'Submit Leave Application',
    httpMethod: 'POST',
    endpoint: '/api/leaves',
    requiredAuthority: "hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')",
    allowedRoles: ['ROLE_ADMIN', 'ROLE_HR', 'ROLE_EMPLOYEE'],
  },
  {
    operation: 'Get Personal Leaves',
    httpMethod: 'GET',
    endpoint: '/api/leaves/me',
    requiredAuthority: "hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')",
    allowedRoles: ['ROLE_ADMIN', 'ROLE_HR', 'ROLE_EMPLOYEE'],
  },
  {
    operation: 'Approve Leave',
    httpMethod: 'PATCH',
    endpoint: '/api/leaves/{id}/approve',
    requiredAuthority: "hasAnyRole('ADMIN', 'HR_MANAGER')",
    allowedRoles: ['ROLE_ADMIN', 'ROLE_HR'],
  },
  {
    operation: 'Reject Leave',
    httpMethod: 'PATCH',
    endpoint: '/api/leaves/{id}/reject',
    requiredAuthority: "hasAnyRole('ADMIN', 'HR_MANAGER')",
    allowedRoles: ['ROLE_ADMIN', 'ROLE_HR'],
  },
  {
    operation: 'Cancel Personal Leave',
    httpMethod: 'PATCH',
    endpoint: '/api/leaves/{id}/cancel',
    requiredAuthority: "hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')",
    allowedRoles: ['ROLE_ADMIN', 'ROLE_HR', 'ROLE_EMPLOYEE'],
  },
  // Payroll
  {
    operation: 'Get Personal Payslips',
    httpMethod: 'GET',
    endpoint: '/api/payroll/me',
    requiredAuthority: "hasAnyRole('ADMIN', 'HR_MANAGER', 'EMPLOYEE')",
    allowedRoles: ['ROLE_ADMIN', 'ROLE_HR', 'ROLE_EMPLOYEE'],
  },
  {
    operation: 'Generate Monthly Payroll',
    httpMethod: 'POST',
    endpoint: '/api/payroll/generate',
    requiredAuthority: "hasAnyRole('ADMIN', 'HR_MANAGER')",
    allowedRoles: ['ROLE_ADMIN', 'ROLE_HR'],
  },
  {
    operation: 'Get Company Payroll Records',
    httpMethod: 'GET',
    endpoint: '/api/payroll',
    requiredAuthority: "hasAnyRole('ADMIN', 'HR_MANAGER')",
    allowedRoles: ['ROLE_ADMIN', 'ROLE_HR'],
  },
  // Reports
  {
    operation: 'Get Executive Intelligence Reports',
    httpMethod: 'GET',
    endpoint: '/api/reports/dashboard',
    requiredAuthority: "hasAnyRole('ADMIN', 'HR_MANAGER')",
    allowedRoles: ['ROLE_ADMIN', 'ROLE_HR'],
  },
];
