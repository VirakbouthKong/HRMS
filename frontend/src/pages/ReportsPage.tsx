import React from 'react';
import {
  ChartBar,
  DownloadSimple,
  Users,
  CalendarCheck,
  CurrencyCircleDollar,
  LockKey,
  ShieldCheck,
  House,
} from '@phosphor-icons/react';
import { useHrmsStore } from '../store/useHrmsStore';
import { LeaveSummaryChart } from '../components/dashboard/LeaveSummaryChart';
import { AttendanceSummaryChart } from '../components/dashboard/AttendanceSummaryChart';
import { hasPermission } from '../utils/rbac';
import { useI18n } from '../i18n/useI18n';

export const ReportsPage: React.FC = () => {
  const { employees, departments, payroll, attendance, currentUser, setActiveTab } = useHrmsStore();
  const { t } = useI18n();

  const hasAccess = hasPermission(currentUser.role, 'REPORTS_VIEW_EXECUTIVE');

  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white/90 backdrop-blur-md rounded-2xl p-8 border border-white/80 shadow-[0_4px_25px_rgba(0,0,0,0.04)] text-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 mx-auto flex items-center justify-center shadow-sm">
          <LockKey weight="duotone" className="w-8 h-8" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-mono font-semibold mb-3">
            <ShieldCheck weight="bold" className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('rbacTier1')}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t('execClearanceTitle')}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
            {t('execClearanceDesc')}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-left max-w-lg mx-auto text-xs space-y-2">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>{t('gatewaySecurityPolicy')}</span>
            <span className="font-mono text-[10px] text-rose-600 font-bold">HTTP 403 FORBIDDEN</span>
          </div>
          <div className="text-slate-600 text-[11px] font-mono space-y-1">
            <div>
              <span className="text-slate-400">Target:</span> GET /api/report/dashboard
            </div>
            <div>
              <span className="text-slate-400">Required:</span> hasAnyRole('ADMIN', 'HR_MANAGER')
            </div>
            <div>
              <span className="text-slate-400">{t('accountLabel')}:</span> {currentUser.fullName} (
              {currentUser.userName})
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 min-h-[40px] px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <House weight="bold" className="w-4 h-4" />
            <span>{t('returnToDashboard')}</span>
          </button>
        </div>
      </div>
    );
  }

  const totalPayroll = payroll.reduce((acc, p) => acc + p.netSalary, 0);
  const attendedCount = attendance.filter(
    (a) => a.status === 'PRESENT' || a.status === 'LATE'
  ).length;
  const attendanceRate =
    attendance.length > 0 ? Math.round((attendedCount / attendance.length) * 1000) / 10 : 0;

  const handleExportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['Employee ID,First Name,Last Name,Email,Department,Job Title,Status,Salary'];
    const rows = employees.map((e) =>
      [
        e.employeeId,
        esc(e.firstName),
        esc(e.lastName),
        esc(e.email),
        esc(e.departmentName),
        esc(e.jobTitle),
        esc(e.status),
        e.salary ?? 0,
      ].join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hrms_workforce_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div>
          <div className="flex items-center gap-2">
            <ChartBar weight="duotone" className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {t('execAnalyticsTitle')}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{t('execAnalyticsSub')}</p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.97] text-white text-xs font-semibold shadow-sm transition-[transform,background-color] cursor-pointer shrink-0"
        >
          <DownloadSimple weight="bold" className="w-4 h-4" />
          <span>{t('exportWorkforceCsv')}</span>
        </button>
      </div>

      {/* 2. Key Intelligence Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
              {employees.length}{' '}
              <span className="text-sm font-normal text-slate-400">{t('staffUnit')}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Users weight="fill" className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
              {t('totalActiveHeadcount')}
            </h3>
            <p className="text-[11px] text-emerald-600 mt-0.5 leading-tight font-medium">
              {t('acrossDepts', { count: departments.length })}
            </p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
              {attendanceRate}%
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <CalendarCheck weight="fill" className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
              {t('avgAttendanceRate')}
            </h3>
            <p className="text-[11px] text-emerald-600 mt-0.5 leading-tight font-medium">
              {t('fromLastQuarter')}
            </p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
              ${totalPayroll.toLocaleString()}
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <CurrencyCircleDollar weight="fill" className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
              {t('totalMonthlyPayout')}
            </h3>
            <p className="text-[11px] text-blue-600 mt-0.5 leading-tight font-medium">
              {t('calculatedNetPayroll')}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-h-[290px]">
          <LeaveSummaryChart />
        </div>
        <div className="min-h-[290px]">
          <AttendanceSummaryChart />
        </div>
      </div>

      {/* 4. Department Staffing Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            {t('deptHeadcountAllocation')}
          </h3>
          <span className="text-xs text-slate-400">
            {t('departmentCountLabel', { count: departments.length })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-6">{t('colDeptName')}</th>
                <th className="py-3 px-6">{t('colFunctionDesc')}</th>
                <th className="py-3 px-6">{t('colHeadcount')}</th>
                <th className="py-3 px-6 text-right">{t('colWorkforceShare')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {departments.map((d) => {
                const count = employees.filter((e) => e.departmentId === d.departmentId).length;
                const share = Math.round((count / (employees.length || 1)) * 100);
                return (
                  <tr key={d.departmentId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">{d.departmentName}</td>
                    <td className="py-3.5 px-6 text-slate-500">{d.description}</td>
                    <td className="py-3.5 px-6 font-mono font-medium tabular-nums">
                      {count} {t('membersUnit')}
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono font-semibold text-blue-600 tabular-nums">
                      {share}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
