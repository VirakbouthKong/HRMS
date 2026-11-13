import axios from 'axios';
import { apiClient, MAILPIT_API_URL } from './client';
import type {
  Employee,
  Department,
  JobExecution,
  AttendanceCorrection,
  PayrollProfile,
  AttendanceRecord,
  LeaveRequest,
  PayrollRecord,
} from '../types';

// ==========================================
// Authentication & Profile Types
// ==========================================

export interface LoginCredentials {
  userName: string;
  password?: string;
  userPwd?: string;
}

export interface VerifyOtpRequest {
  userName: string;
  otpCode: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  userName: string;
  newPassword: string;
}

export interface AuthApiResponse {
  success: boolean;
  message: string;
  [key: string]: any;
}

export interface TokenResponse {
  success: boolean;
  message: string;
  token: string;
  tokenType: string;
  expiresIn: number;
  accountId: number;
  userName: string;
  email: string;
  role: string;
  employeeId: number | null;
  isFirstLogin: boolean;
}

export interface MeResponse {
  success: boolean;
  accountId: number;
  userName: string;
  email: string;
  role: string;
  employeeId: number | null;
  isFirstLogin: boolean;
}

// ==========================================
// Operation Types
// ==========================================

export interface JobTitle {
  jobId: number;
  jobTitle: string;
  description?: string;
  minSalary?: number;
  maxSalary?: number;
  departmentId?: number;
  departmentName?: string;
}

export interface JobHistoryItem {
  historyId?: number;
  employeeId: number;
  jobTitle: string;
  departmentName: string;
  startDate: string;
  endDate?: string | null;
}

export interface AttendanceCorrectionPayload {
  checkIn?: string;
  checkOut?: string;
  status?: string;
  lateMinutes?: number;
  reason: string;
}

export interface LeaveSubmitPayload {
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount?: number;
  reason: string;
}

export interface ReportApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ==========================================
// 1. Auth API
// ==========================================

export const authApi = {
  /**
   * Step 1: Login with credentials (triggers OTP generation and email dispatch)
   */
  login: async (credentials: LoginCredentials): Promise<AuthApiResponse> => {
    const payload = {
      userName: credentials.userName,
      password: credentials.password || credentials.userPwd || '',
    };
    const res = await apiClient.post<AuthApiResponse>('/api/auth/login', payload);
    return res.data;
  },

  /**
   * Step 2: Verify OTP and acquire JWT bearer token
   */
  verifyOtp: async (payload: VerifyOtpRequest): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>('/api/auth/verify-otp', payload);
    return res.data;
  },

  /**
   * Fetch currently logged-in account details (via Gateway)
   */
  getMe: async (): Promise<MeResponse> => {
    const res = await apiClient.get<MeResponse>('/api/auth/me');
    return res.data;
  },

  /**
   * Change password for logged-in user
   */
  changePassword: async (payload: ChangePasswordRequest): Promise<TokenResponse> => {
    const res = await apiClient.put<TokenResponse>('/api/auth/change-password', payload);
    return res.data;
  },

  /**
   * Reset password for user (Admin/Recovery)
   */
  resetPassword: async (payload: ResetPasswordRequest): Promise<AuthApiResponse> => {
    const res = await apiClient.put<AuthApiResponse>('/api/auth/reset-password', payload);
    return res.data;
  },

  /**
   * Retrieve logged-in user profile photo as binary Blob
   */
  getProfilePhoto: async (): Promise<Blob> => {
    const res = await apiClient.get<Blob>('/api/auth/me/photo', {
      responseType: 'blob',
    });
    return res.data;
  },

  /**
   * Upload or replace logged-in user profile photo (max 3 MB, multipart/form-data)
   */
  uploadProfilePhoto: async (file: File | Blob): Promise<AuthApiResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.put<AuthApiResponse>('/api/auth/me/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  /**
   * Remove profile photo, restoring default initials avatar
   */
  deleteProfilePhoto: async (): Promise<AuthApiResponse> => {
    const res = await apiClient.delete<AuthApiResponse>('/api/auth/me/photo');
    return res.data;
  },

  /**
   * Helper to fetch the latest OTP code directly from the local Mailpit test inbox
   */
  fetchLatestMailpitOtp: async (emailOrUsername?: string): Promise<string | null> => {
    try {
      let res;
      try {
        res = await axios.get(`${MAILPIT_API_URL}/api/v1/messages`);
      } catch (directErr) {
        // Fallback to Vite dev server proxy if direct browser CORS is blocked
        res = await axios.get('/mailpit/api/v1/messages');
      }

      const messages: any[] = res.data?.messages || [];
      if (!messages.length) return null;

      let targetMsg = messages[0];
      if (emailOrUsername) {
        const lower = emailOrUsername.toLowerCase();
        const found = messages.find((m) => {
          const toMatch = m.To?.some(
            (t: any) => t.Address?.toLowerCase().includes(lower) || t.Name?.toLowerCase().includes(lower)
          );
          const subjectMatch = m.Subject?.toLowerCase().includes(lower);
          const snippetMatch = m.Snippet?.toLowerCase().includes(lower);
          return toMatch || subjectMatch || snippetMatch;
        });
        if (found) targetMsg = found;
      }

      const subject = targetMsg.Subject || '';
      const snippet = targetMsg.Snippet || '';
      const match = subject.match(/\b(\d{6})\b/) || snippet.match(/\b(\d{6})\b/);
      return match ? match[1] : null;
    } catch (err) {
      console.error('Failed to fetch OTP from Mailpit test inbox:', err);
      return null;
    }
  },
};

// ==========================================
// 2. Employee API
// ==========================================

export const employeeApi = {
  getAll: async (params?: { status?: string; departmentId?: number }): Promise<Employee[]> => {
    const res = await apiClient.get<Employee[]>('/api/employees', { params });
    return res.data;
  },

  getById: async (id: number): Promise<Employee> => {
    const res = await apiClient.get<Employee>(`/api/employees/${id}`);
    return res.data;
  },

  create: async (data: Partial<Employee> | any): Promise<Employee> => {
    const res = await apiClient.post<Employee>('/api/employees', data);
    return res.data;
  },

  update: async (id: number, data: Partial<Employee> | any): Promise<Employee> => {
    const res = await apiClient.patch<Employee>(`/api/employees/${id}`, data);
    return res.data;
  },

  updateStatus: async (id: number, status: string): Promise<Employee> => {
    const res = await apiClient.patch<Employee>(`/api/employees/${id}/status`, { status });
    return res.data;
  },

  getMyProfile: async (): Promise<Employee> => {
    const res = await apiClient.get<Employee>('/api/employees/me');
    return res.data;
  },

  getJobHistory: async (id: number): Promise<JobHistoryItem[]> => {
    const res = await apiClient.get<JobHistoryItem[]>(`/api/employees/${id}/job-history`);
    return res.data;
  },

  getMyJobHistory: async (): Promise<JobHistoryItem[]> => {
    const res = await apiClient.get<JobHistoryItem[]>('/api/employees/me/job-history');
    return res.data;
  },
};

// ==========================================
// 3. Department API
// ==========================================

export const departmentApi = {
  getAll: async (): Promise<Department[]> => {
    const res = await apiClient.get<Department[]>('/api/departments');
    return res.data;
  },

  getById: async (id: number): Promise<Department> => {
    const res = await apiClient.get<Department>(`/api/departments/${id}`);
    return res.data;
  },

  create: async (data: Partial<Department> | any): Promise<Department> => {
    const res = await apiClient.post<Department>('/api/departments', data);
    return res.data;
  },

  update: async (id: number, data: Partial<Department> | any): Promise<Department> => {
    const res = await apiClient.patch<Department>(`/api/departments/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/departments/${id}`);
  },
};

// ==========================================
// 4. Job API
// ==========================================

export const jobApi = {
  getAll: async (departmentId?: number): Promise<JobTitle[]> => {
    const res = await apiClient.get<JobTitle[]>('/api/jobs', {
      params: departmentId !== undefined ? { departmentId } : undefined,
    });
    return res.data;
  },

  getById: async (id: number): Promise<JobTitle> => {
    const res = await apiClient.get<JobTitle>(`/api/jobs/${id}`);
    return res.data;
  },

  create: async (data: Partial<JobTitle> | any): Promise<JobTitle> => {
    const res = await apiClient.post<JobTitle>('/api/jobs', data);
    return res.data;
  },

  update: async (id: number, data: Partial<JobTitle> | any): Promise<JobTitle> => {
    const res = await apiClient.patch<JobTitle>(`/api/jobs/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/jobs/${id}`);
  },
};

// ==========================================
// 5. Attendance API
// ==========================================

export const attendanceApi = {
  getAll: async (date?: string): Promise<AttendanceRecord[]> => {
    const res = await apiClient.get<AttendanceRecord[]>('/api/attendance', {
      params: date ? { date } : undefined,
    });
    return res.data;
  },

  /** Alias for backward compatibility */
  getDailyLogs: async (date?: string): Promise<AttendanceRecord[]> => {
    return attendanceApi.getAll(date);
  },

  getMyAttendance: async (date?: string): Promise<AttendanceRecord> => {
    const res = await apiClient.get<AttendanceRecord>('/api/attendance/me', {
      params: date ? { date } : undefined,
    });
    return res.data;
  },

  getById: async (attendanceId: number): Promise<AttendanceRecord> => {
    const res = await apiClient.get<AttendanceRecord>(`/api/attendance/${attendanceId}`);
    return res.data;
  },

  checkIn: async (note?: string): Promise<AttendanceRecord> => {
    const res = await apiClient.post<AttendanceRecord>(
      '/api/attendance/check-in',
      note ? { note } : undefined
    );
    return res.data;
  },

  checkOut: async (note?: string): Promise<AttendanceRecord> => {
    const res = await apiClient.post<AttendanceRecord>(
      '/api/attendance/check-out',
      note ? { note } : undefined
    );
    return res.data;
  },

  requestCorrection: async (
    attendanceId: number,
    data: AttendanceCorrectionPayload | any
  ): Promise<AttendanceRecord> => {
    const res = await apiClient.post<AttendanceRecord>(
      `/api/attendance/${attendanceId}/corrections`,
      data
    );
    return res.data;
  },

  getCorrectionHistory: async (attendanceId: number): Promise<AttendanceCorrection[]> => {
    const res = await apiClient.get<AttendanceCorrection[]>(
      `/api/attendance/${attendanceId}/corrections`
    );
    return res.data;
  },
};

export const attendanceCorrectionApi = {
  correct: attendanceApi.requestCorrection,
  getHistory: attendanceApi.getCorrectionHistory,
};

// ==========================================
// 6. Leave API
// ==========================================

export const leaveApi = {
  getAll: async (): Promise<LeaveRequest[]> => {
    const res = await apiClient.get<LeaveRequest[]>('/api/leaves');
    return res.data;
  },

  getMyLeaves: async (): Promise<LeaveRequest[]> => {
    const res = await apiClient.get<LeaveRequest[]>('/api/leaves/me');
    return res.data;
  },

  getById: async (id: number): Promise<LeaveRequest> => {
    const res = await apiClient.get<LeaveRequest>(`/api/leaves/${id}`);
    return res.data;
  },

  apply: async (data: LeaveSubmitPayload | any): Promise<LeaveRequest> => {
    const res = await apiClient.post<LeaveRequest>('/api/leaves', data);
    return res.data;
  },

  /** Alias for apply() */
  submit: async (data: LeaveSubmitPayload | any): Promise<LeaveRequest> => {
    return leaveApi.apply(data);
  },

  approve: async (id: number): Promise<LeaveRequest> => {
    const res = await apiClient.patch<LeaveRequest>(`/api/leaves/${id}/approve`);
    return res.data;
  },

  reject: async (id: number, reason?: string): Promise<LeaveRequest> => {
    const res = await apiClient.patch<LeaveRequest>(
      `/api/leaves/${id}/reject`,
      reason ? { reason } : undefined
    );
    return res.data;
  },

  cancel: async (id: number): Promise<LeaveRequest> => {
    const res = await apiClient.patch<LeaveRequest>(`/api/leaves/${id}/cancel`);
    return res.data;
  },
};

// ==========================================
// 7. Payroll API
// ==========================================

export const payrollApi = {
  getAll: async (period?: string): Promise<PayrollRecord[]> => {
    const targetPeriod = period || new Date().toISOString().substring(0, 7);
    const res = await apiClient.get<PayrollRecord[]>('/api/payroll', {
      params: { period: targetPeriod },
    });
    return res.data;
  },

  /** Alias for getAll() */
  getByPeriod: async (period: string): Promise<PayrollRecord[]> => {
    return payrollApi.getAll(period);
  },

  getMyPayroll: async (): Promise<PayrollRecord[]> => {
    const res = await apiClient.get<PayrollRecord[]>('/api/payroll/me');
    return res.data;
  },

  /** Alias for getMyPayroll() */
  getMyPayrolls: async (): Promise<PayrollRecord[]> => {
    return payrollApi.getMyPayroll();
  },

  generateBatch: async (periodMonth: string): Promise<PayrollRecord[]> => {
    const res = await apiClient.post<PayrollRecord[]>('/api/payroll/generate', {
      period: periodMonth,
    });
    return res.data;
  },

  /** Alias for generateBatch() */
  generateMonthly: async (period: string): Promise<PayrollRecord[]> => {
    return payrollApi.generateBatch(period);
  },

  getProfile: async (employeeId: number): Promise<PayrollProfile> => {
    const res = await apiClient.get<PayrollProfile>(`/api/payroll/profiles/${employeeId}`);
    return res.data;
  },

  saveProfile: async (
    employeeId: number,
    data: Partial<PayrollProfile> | any
  ): Promise<PayrollProfile> => {
    const res = await apiClient.post<PayrollProfile>(
      `/api/payroll/profiles/${employeeId}`,
      data
    );
    return res.data;
  },

  /** Alias for saveProfile() */
  setProfile: async (
    employeeId: number,
    data: Partial<PayrollProfile> | any
  ): Promise<PayrollProfile> => {
    return payrollApi.saveProfile(employeeId, data);
  },
};

// ==========================================
// 8. Report API
// ==========================================

export const reportApi = {
  getDashboard: async (): Promise<ReportApiResponse<any>> => {
    const res = await apiClient.get<ReportApiResponse<any>>('/api/report/dashboard');
    return res.data;
  },

  /** Alias for getDashboard() */
  getDashboardSummary: async (): Promise<ReportApiResponse<any>> => {
    return reportApi.getDashboard();
  },

  getEmployeeReport: async (params?: {
    id?: number;
    status?: string;
    departmentId?: number;
    jobId?: number;
  }): Promise<ReportApiResponse<any>> => {
    let url = '/api/report/employees';
    if (params?.id) {
      url = `/api/report/employees/${params.id}`;
    } else if (params?.status) {
      url = `/api/report/employees/status/${params.status}`;
    } else if (params?.departmentId) {
      url = `/api/report/employees/department/${params.departmentId}`;
    } else if (params?.jobId) {
      url = `/api/report/employees/job/${params.jobId}`;
    }
    const res = await apiClient.get<ReportApiResponse<any>>(url);
    return res.data;
  },

  getAttendanceReport: async (params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    employeeId?: number;
    status?: string;
  }): Promise<ReportApiResponse<any>> => {
    let url = '/api/report/attendance';
    let queryParams: any = undefined;

    if (params?.startDate && params?.endDate) {
      url = '/api/report/attendance/range';
      queryParams = { startDate: params.startDate, endDate: params.endDate };
    } else if (params?.date) {
      url = `/api/report/attendance/date/${params.date}`;
    } else if (params?.employeeId) {
      url = `/api/report/attendance/employee/${params.employeeId}`;
    } else if (params?.status) {
      url = `/api/report/attendance/status/${params.status}`;
    }

    const res = await apiClient.get<ReportApiResponse<any>>(url, { params: queryParams });
    return res.data;
  },

  getLeaveReport: async (params?: {
    id?: number;
    employeeId?: number;
    status?: string;
    leaveType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ReportApiResponse<any>> => {
    let url = '/api/report/leaves';
    let queryParams: any = undefined;

    if (params?.id) {
      url = `/api/report/leaves/${params.id}`;
    } else if (params?.startDate && params?.endDate) {
      url = '/api/report/leaves/range';
      queryParams = { startDate: params.startDate, endDate: params.endDate };
    } else if (params?.employeeId) {
      url = `/api/report/leaves/employee/${params.employeeId}`;
    } else if (params?.status) {
      url = `/api/report/leaves/status/${params.status}`;
    } else if (params?.leaveType) {
      url = `/api/report/leaves/type/${params.leaveType}`;
    }

    const res = await apiClient.get<ReportApiResponse<any>>(url, { params: queryParams });
    return res.data;
  },

  getPayrollReport: async (params?: {
    id?: number;
    employeeId?: number;
    period?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ReportApiResponse<any>> => {
    let url = '/api/report/payroll';
    let queryParams: any = undefined;

    if (params?.id) {
      url = `/api/report/payroll/${params.id}`;
    } else if (params?.startDate && params?.endDate) {
      url = '/api/report/payroll/range';
      queryParams = { startDate: params.startDate, endDate: params.endDate };
    } else if (params?.employeeId) {
      url = `/api/report/payroll/employee/${params.employeeId}`;
    } else if (params?.period) {
      url = `/api/report/payroll/date/${params.period}`;
    }

    const res = await apiClient.get<ReportApiResponse<any>>(url, { params: queryParams });
    return res.data;
  },

  getDepartmentCosts: async (): Promise<any> => {
    const res = await apiClient.get('/api/report/dashboard');
    return res.data;
  },
};

// ==========================================
// 9. CRON API
// ==========================================

export const cronApi = {
  getHistory: async (): Promise<JobExecution[]> => {
    const res = await apiClient.get<JobExecution[]>('/api/v1/jobs/history');
    return res.data;
  },

  triggerJob: async (jobName: string): Promise<string> => {
    const res = await apiClient.post<string>(`/api/v1/jobs/${jobName}/trigger`);
    return res.data;
  },
};
