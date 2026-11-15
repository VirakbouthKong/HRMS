import React, { useMemo, useState } from 'react';
import { Play, ArrowCounterClockwise, DownloadSimple, CircleNotch, WarningCircle } from '@phosphor-icons/react';
import { useHrmsStore } from '../../store/useHrmsStore';
import { useI18n, TranslationKey } from '../../i18n/useI18n';
import { reportApi } from '../../api';
import { DashboardCard, StatusChip, localeFor, parseDateKey } from '../dashboard/DashboardCard';
import { FilterTabs } from '../ui/filter-tabs';

/*
 * Filtered reports over the report service (/api/report/**, Admin/HR at the gateway).
 * Each backend endpoint filters by ONE thing, so a run sends the most selective filter to
 * the server and applies the remaining filters to the returned rows.
 */

type ReportKind = 'employees' | 'attendance' | 'leave' | 'payroll';

// Row shapes from report-service DTOs
interface EmployeeRow { employeeId: number; fullName: string; gender?: string; email?: string; phoneNumber?: string; department?: string; jobTitle?: string; status?: string }
interface AttendanceRow { attendanceId: number; employeeName: string; attendanceDate: string; checkIn?: string; checkOut?: string; lateMinutes?: number; otHours?: number; status?: string }
interface LeaveRow { leaveId: number; employeeName: string; leaveType: string; startDate: string; endDate: string; totalDays?: number; reason?: string; status?: string; approvedBy?: string }
interface PayrollRow { payrollId: number; employeeName: string; period: string; generatedDate?: string; baseSalary?: number; totalLateMinutes?: number; lateDeduction?: number; unpaidLeaveDays?: number; unpaidLeaveDeduction?: number; netSalary?: number }
type AnyRow = EmployeeRow | AttendanceRow | LeaveRow | PayrollRow;

const LEAVE_TYPES: { code: string; key: TranslationKey }[] = [
  { code: 'ANNUAL', key: 'frTypeAnnual' },
  { code: 'SICK', key: 'frTypeSick' },
  { code: 'UNPAID', key: 'frTypeUnpaid' },
  { code: 'MATERNITY', key: 'frTypeMaternity' },
  { code: 'PATERNITY', key: 'frTypePaternity' },
  { code: 'SPECIAL', key: 'frTypeSpecial' },
];

const same = (a?: string | null, b?: string | null) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
const upper = (s?: string) => (s || '').toUpperCase();
/** Leave types used to be free text ("Sick Leave"); now codes ("SICK"). Match either. */
const leaveTypeMatches = (value: string, code: string) => upper(value) === code || upper(value).replace(/\s*LEAVE$/, '') === code;
const lastDayOfMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m, 0);
  return `${ym}-${String(d.getDate()).padStart(2, '0')}`;
};
const asList = <T,>(res: any): T[] => {
  const data = res?.data ?? res;
  return Array.isArray(data) ? data : data ? [data] : [];
};

const fieldCls =
  'h-10 w-full px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500';
const labelCls = 'block text-[13px] font-semibold text-slate-700 mb-1';

export const FilteredReports: React.FC = () => {
  const { employees, departments, jobs } = useHrmsStore();
  const { t, tStatus, language } = useI18n();

  const [kind, setKind] = useState<ReportKind>('employees');
  const [status, setStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [jobId, setJobId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [rows, setRows] = useState<AnyRow[] | null>(null);
  const [ranKind, setRanKind] = useState<ReportKind | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetFilters = () => {
    setStatus('');
    setDepartmentId('');
    setJobId('');
    setEmployeeId('');
    setLeaveType('');
    setFrom('');
    setTo('');
    setError(null);
  };
  const switchKind = (k: ReportKind) => {
    setKind(k);
    resetFilters();
    setRows(null);
    setRanKind(null);
  };

  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
    [employees]
  );
  const employeeName = (id: string) => {
    const e = employees.find((x) => String(x.employeeId) === id);
    return e ? `${e.firstName} ${e.lastName}`.trim() : '';
  };
  const deptName = departments.find((d) => String(d.departmentId) === departmentId)?.departmentName;
  const jobName = jobs.find((j) => String(j.jobId) === jobId)?.jobTitle;
  const jobsInDept = departmentId ? jobs.filter((j) => String(j.departmentId) === departmentId) : jobs;

  const run = async () => {
    setError(null);
    if (from && to && from > to) {
      setError(t('frDateOrder'));
      return;
    }
    setIsRunning(true);
    try {
      let result: AnyRow[] = [];
      const name = employeeId ? employeeName(employeeId) : '';

      if (kind === 'employees') {
        // Server: status > department > job. Client: the rest.
        const res = status
          ? await reportApi.getEmployeeReport({ status })
          : departmentId
          ? await reportApi.getEmployeeReport({ departmentId: Number(departmentId) })
          : jobId
          ? await reportApi.getEmployeeReport({ jobId: Number(jobId) })
          : await reportApi.getEmployeeReport();
        result = asList<EmployeeRow>(res).filter(
          (r) =>
            (!status || upper(r.status) === status) &&
            (!deptName || same(r.department, deptName)) &&
            (!jobName || same(r.jobTitle, jobName))
        );
      } else if (kind === 'attendance') {
        // Server: date range / single date > employee > status.
        const start = from || to;
        const end = to || from;
        const res =
          start && end && start !== end
            ? await reportApi.getAttendanceReport({ startDate: start, endDate: end })
            : start
            ? await reportApi.getAttendanceReport({ date: start })
            : employeeId
            ? await reportApi.getAttendanceReport({ employeeId: Number(employeeId) })
            : status
            ? await reportApi.getAttendanceReport({ status })
            : await reportApi.getAttendanceReport();
        result = asList<AttendanceRow>(res).filter((r) => {
          const d = (r.attendanceDate || '').substring(0, 10);
          return (
            (!name || same(r.employeeName, name)) &&
            (!status || upper(r.status) === status) &&
            (!start || d >= start) &&
            (!end || d <= end)
          );
        });
      } else if (kind === 'leave') {
        // Server: date range > employee > status > type.
        const res =
          from && to
            ? await reportApi.getLeaveReport({ startDate: from, endDate: to })
            : employeeId
            ? await reportApi.getLeaveReport({ employeeId: Number(employeeId) })
            : status
            ? await reportApi.getLeaveReport({ status })
            : leaveType
            ? await reportApi.getLeaveReport({ leaveType })
            : await reportApi.getLeaveReport();
        result = asList<LeaveRow>(res).filter((r) => {
          const s = (r.startDate || '').substring(0, 10);
          const e = (r.endDate || r.startDate || '').substring(0, 10);
          return (
            (!name || same(r.employeeName, name)) &&
            (!status || upper(r.status) === status) &&
            (!leaveType || leaveTypeMatches(r.leaveType, leaveType)) &&
            // overlap with the chosen window when only one bound is given
            (!from || e >= from) &&
            (!to || s <= to)
          );
        });
      } else {
        // Payroll periods are the 1st of the month. Server: month range / single month > employee.
        const startMonth = from || to;
        const endMonth = to || from;
        const res =
          startMonth && endMonth && startMonth !== endMonth
            ? await reportApi.getPayrollReport({ startDate: `${startMonth}-01`, endDate: lastDayOfMonth(endMonth) })
            : startMonth
            ? await reportApi.getPayrollReport({ period: `${startMonth}-01` })
            : employeeId
            ? await reportApi.getPayrollReport({ employeeId: Number(employeeId) })
            : await reportApi.getPayrollReport();
        result = asList<PayrollRow>(res).filter((r) => {
          const p = (r.period || '').substring(0, 7);
          return (
            (!name || same(r.employeeName, name)) &&
            (!startMonth || p >= startMonth) &&
            (!endMonth || p <= endMonth)
          );
        });
      }

      setRows(result);
      setRanKind(kind);
    } catch (err: any) {
      // Some endpoints answer 404 when nothing matches.
      if (err?.response?.status === 404) {
        setRows([]);
        setRanKind(kind);
      } else {
        setError(err?.response?.data?.message || t('frFailed'));
      }
    } finally {
      setIsRunning(false);
    }
  };

  // --- formatting ---
  const locale = localeFor(language);
  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const monthFmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const fmtDate = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? dateFmt.format(parseDateKey(s)) : s || '—');
  const fmtMonth = (s?: string) => (s && /^\d{4}-\d{2}/.test(s) ? monthFmt.format(parseDateKey(s.substring(0, 7) + '-01')) : s || '—');
  const money = (n?: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(n) || 0);
  const leaveTypeLabel = (v: string) => {
    const hit = LEAVE_TYPES.find((lt) => leaveTypeMatches(v, lt.code));
    return hit ? t(hit.key) : v;
  };
  const statusTone = (s?: string) => {
    const u = upper(s);
    if (['ACTIVE', 'PRESENT', 'APPROVED'].includes(u)) return 'ok';
    if (['LATE', 'PENDING'].includes(u)) return 'warn';
    if (['ABSENT', 'REJECTED'].includes(u)) return 'bad';
    return 'neutral';
  };
  const statusLabel = (s?: string) =>
    upper(s) === 'ACTIVE' ? t('frStatusActive') : upper(s) === 'INACTIVE' ? t('frStatusInactive') : tStatus(s);

  // --- table definition per report (also drives CSV export) ---
  type Col = { key: string; label: string; align?: 'right'; cell: (r: any) => React.ReactNode; csv: (r: any) => string | number };
  const columns: Record<ReportKind, Col[]> = {
    employees: [
      { key: 'name', label: t('frColName'), cell: (r: EmployeeRow) => <span className="font-semibold text-slate-900">{r.fullName}</span>, csv: (r) => r.fullName },
      { key: 'dept', label: t('frDepartment'), cell: (r) => r.department || '—', csv: (r) => r.department || '' },
      { key: 'job', label: t('frJob'), cell: (r) => r.jobTitle || '—', csv: (r) => r.jobTitle || '' },
      { key: 'email', label: t('frColEmail'), cell: (r) => <span className="text-slate-600">{r.email || '—'}</span>, csv: (r) => r.email || '' },
      { key: 'phone', label: t('frColPhone'), cell: (r) => r.phoneNumber || '—', csv: (r) => r.phoneNumber || '' },
      { key: 'gender', label: t('frColGender'), cell: (r) => r.gender || '—', csv: (r) => r.gender || '' },
      { key: 'status', label: t('frStatus'), cell: (r) => <StatusChip tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusChip>, csv: (r) => r.status || '' },
    ],
    attendance: [
      { key: 'name', label: t('frColName'), cell: (r: AttendanceRow) => <span className="font-semibold text-slate-900">{r.employeeName}</span>, csv: (r) => r.employeeName },
      { key: 'date', label: t('frColDate'), cell: (r) => fmtDate(r.attendanceDate), csv: (r) => (r.attendanceDate || '').substring(0, 10) },
      { key: 'in', label: t('frColCheckIn'), align: 'right', cell: (r) => (r.checkIn || '—').substring(0, 5), csv: (r) => r.checkIn || '' },
      { key: 'out', label: t('frColCheckOut'), align: 'right', cell: (r) => (r.checkOut || '—').substring(0, 5), csv: (r) => r.checkOut || '' },
      { key: 'late', label: t('frColLate'), align: 'right', cell: (r) => r.lateMinutes || 0, csv: (r) => r.lateMinutes || 0 },
      { key: 'ot', label: t('frColOt'), align: 'right', cell: (r) => r.otHours || 0, csv: (r) => r.otHours || 0 },
      { key: 'status', label: t('frStatus'), cell: (r) => <StatusChip tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusChip>, csv: (r) => r.status || '' },
    ],
    leave: [
      { key: 'name', label: t('frColName'), cell: (r: LeaveRow) => <span className="font-semibold text-slate-900">{r.employeeName}</span>, csv: (r) => r.employeeName },
      { key: 'type', label: t('frColType'), cell: (r) => leaveTypeLabel(r.leaveType), csv: (r) => r.leaveType },
      { key: 'dates', label: t('frColDates'), cell: (r) => `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}`, csv: (r) => `${r.startDate} - ${r.endDate}` },
      { key: 'days', label: t('frColDays'), align: 'right', cell: (r) => r.totalDays ?? '—', csv: (r) => r.totalDays ?? '' },
      { key: 'reason', label: t('frColReason'), cell: (r) => <span className="block max-w-[220px] truncate text-slate-600" title={r.reason}>{r.reason || '—'}</span>, csv: (r) => r.reason || '' },
      { key: 'by', label: t('frColApprovedBy'), cell: (r) => r.approvedBy || '—', csv: (r) => r.approvedBy || '' },
      { key: 'status', label: t('frStatus'), cell: (r) => <StatusChip tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusChip>, csv: (r) => r.status || '' },
    ],
    payroll: [
      { key: 'name', label: t('frColName'), cell: (r: PayrollRow) => <span className="font-semibold text-slate-900">{r.employeeName}</span>, csv: (r) => r.employeeName },
      { key: 'period', label: t('frColPeriod'), cell: (r) => fmtMonth(r.period), csv: (r) => (r.period || '').substring(0, 7) },
      { key: 'base', label: t('frColBase'), align: 'right', cell: (r) => money(r.baseSalary), csv: (r) => r.baseSalary ?? 0 },
      { key: 'late', label: t('frColLateDed'), align: 'right', cell: (r) => (r.lateDeduction ? `−${money(r.lateDeduction)}` : '—'), csv: (r) => r.lateDeduction ?? 0 },
      { key: 'unpaid', label: t('frColUnpaidDed'), align: 'right', cell: (r) => (r.unpaidLeaveDeduction ? `−${money(r.unpaidLeaveDeduction)}` : '—'), csv: (r) => r.unpaidLeaveDeduction ?? 0 },
      { key: 'net', label: t('frColNet'), align: 'right', cell: (r) => <span className="font-semibold text-slate-900">{money(r.netSalary)}</span>, csv: (r) => r.netSalary ?? 0 },
    ],
  };

  const summary = (): string => {
    if (!rows || !ranKind) return '';
    if (ranKind === 'employees') {
      const active = (rows as EmployeeRow[]).filter((r) => upper(r.status) === 'ACTIVE').length;
      return t('frSumEmployees', { active, inactive: rows.length - active });
    }
    if (ranKind === 'attendance') {
      const list = rows as AttendanceRow[];
      return t('frSumAttendance', {
        late: list.filter((r) => upper(r.status) === 'LATE').length,
        absent: list.filter((r) => upper(r.status) === 'ABSENT').length,
        ot: list.reduce((s, r) => s + (r.otHours || 0), 0),
      });
    }
    if (ranKind === 'leave') return t('frSumLeave', { days: (rows as LeaveRow[]).reduce((s, r) => s + (r.totalDays || 0), 0) });
    return t('frSumPayroll', { amount: money((rows as PayrollRow[]).reduce((s, r) => s + (Number(r.netSalary) || 0), 0)) });
  };

  const exportCsv = () => {
    if (!rows || !ranKind) return;
    const cols = columns[ranKind];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [cols.map((c) => esc(c.label)).join(','), ...rows.map((r) => cols.map((c) => esc(c.csv(r))).join(','))];
    // BOM so Excel opens Khmer text correctly
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hrms_${ranKind}_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- filters per report ---
  const select = (id: string, label: string, value: string, onChange: (v: string) => void, options: { value: string; label: string }[]) => (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls}>
        <option value="">{t('frAny')}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
  const dateInput = (id: string, label: string, value: string, onChange: (v: string) => void, type: 'date' | 'month') => (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls} />
    </div>
  );
  const employeeOptions = sortedEmployees.map((e) => ({ value: String(e.employeeId), label: `${e.firstName} ${e.lastName}` }));

  const filters: Record<ReportKind, React.ReactNode> = {
    employees: (
      <>
        {select('frEmpStatus', t('frStatus'), status, setStatus, [
          { value: 'ACTIVE', label: t('frStatusActive') },
          { value: 'INACTIVE', label: t('frStatusInactive') },
        ])}
        {select('frEmpDept', t('frDepartment'), departmentId, (v) => { setDepartmentId(v); setJobId(''); }, departments.map((d) => ({ value: String(d.departmentId), label: d.departmentName })))}
        {select('frEmpJob', t('frJob'), jobId, setJobId, jobsInDept.map((j) => ({ value: String(j.jobId), label: j.jobTitle })))}
      </>
    ),
    attendance: (
      <>
        {dateInput('frAttFrom', t('frFrom'), from, setFrom, 'date')}
        {dateInput('frAttTo', t('frTo'), to, setTo, 'date')}
        {select('frAttEmp', t('frEmployee'), employeeId, setEmployeeId, employeeOptions)}
        {select('frAttStatus', t('frStatus'), status, setStatus, ['PRESENT', 'LATE', 'ABSENT'].map((s) => ({ value: s, label: tStatus(s) })))}
      </>
    ),
    leave: (
      <>
        {dateInput('frLvFrom', t('frFrom'), from, setFrom, 'date')}
        {dateInput('frLvTo', t('frTo'), to, setTo, 'date')}
        {select('frLvEmp', t('frEmployee'), employeeId, setEmployeeId, employeeOptions)}
        {select('frLvStatus', t('frStatus'), status, setStatus, ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((s) => ({ value: s, label: tStatus(s) })))}
        {select('frLvType', t('frLeaveType'), leaveType, setLeaveType, LEAVE_TYPES.map((lt) => ({ value: lt.code, label: t(lt.key) })))}
      </>
    ),
    payroll: (
      <>
        {dateInput('frPrFrom', t('frFromMonth'), from, setFrom, 'month')}
        {dateInput('frPrTo', t('frToMonth'), to, setTo, 'month')}
        {select('frPrEmp', t('frEmployee'), employeeId, setEmployeeId, employeeOptions)}
      </>
    ),
  };

  const cols = ranKind ? columns[ranKind] : [];

  return (
    <DashboardCard title={t('frTitle')} subtitle={t('frSub')}>
      <FilterTabs
        label={t('frTabsLabel')}
        value={kind}
        onChange={switchKind}
        tabs={[
          { value: 'employees', label: t('frTabEmployees') },
          { value: 'attendance', label: t('frTabAttendance') },
          { value: 'leave', label: t('frTabLeave') },
          { value: 'payroll', label: t('frTabPayroll') },
        ]}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="flex flex-col gap-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">{filters[kind]}</div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={isRunning}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {isRunning ? <CircleNotch weight="bold" className="w-4 h-4 animate-spin" /> : <Play weight="fill" className="w-4 h-4" />}
            {t('frRun')}
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-sm font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
          >
            <ArrowCounterClockwise weight="bold" className="w-4 h-4" />
            {t('frReset')}
          </button>
          {rows && rows.length > 0 && ranKind === kind && (
            <button
              type="button"
              onClick={exportCsv}
              className="ml-auto inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-sm font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
            >
              <DownloadSimple weight="bold" className="w-4 h-4" />
              {t('frExport')}
            </button>
          )}
        </div>
      </form>

      {error && (
        <p role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-center gap-2">
          <WarningCircle weight="fill" className="w-4 h-4 text-rose-600 shrink-0" />
          {error}
        </p>
      )}

      {!rows || ranKind !== kind ? (
        <p className="py-6 text-center text-sm text-slate-500">{t('frNotRun')}</p>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">{t('frNoResults')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-600" aria-live="polite">
            <span className="font-semibold text-slate-900">{t('frRows', { count: rows.length })}</span> · {summary()}
          </p>
          <div className="overflow-x-auto -mx-5 border-t border-slate-200">
            <table className="w-full min-w-[820px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  {cols.map((c) => (
                    <th key={c.key} scope="col" className={`py-3 px-5 ${c.align === 'right' ? 'text-right' : ''}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700 tabular-nums">
                {rows.map((r, i) => (
                  <tr key={(r as any).employeeId ?? (r as any).attendanceId ?? (r as any).leaveId ?? (r as any).payrollId ?? i}>
                    {cols.map((c) => (
                      <td key={c.key} className={`py-3 px-5 whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''}`}>
                        {c.cell(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardCard>
  );
};
