import React from 'react';
import {
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
import { MetricCard } from '../components/dashboard/MetricCard';
import { DashboardCard } from '../components/dashboard/DashboardCard';
import { FilteredReports } from '../components/reports/FilteredReports';
import { hasPermission } from '../utils/rbac';
import { useI18n } from '../i18n/useI18n';

const isActiveStatus = (status?: string) => {
  const s = (status || '').toUpperCase().replace(/\s+/g, '_');
  return s !== 'TERMINATED' && s !== 'INACTIVE';
};

export const ReportsPage: React.FC = () => {
  const { employees, departments, payroll, attendance, currentUser, setActiveTab } = useHrmsStore();
  const { t } = useI18n();

  const hasAccess = hasPermission(currentUser.role, 'REPORTS_VIEW_EXECUTIVE');

  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white rounded-xl p-8 border border-slate-200 text-center space-y-6 animate-fadeIn">
        <div className="w-14 h-14 rounded-xl bg-amber-50 text-amber-800 mx-auto flex items-center justify-center">
          <LockKey weight="duotone" className="w-7 h-7" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-3">
            <ShieldCheck weight="bold" className="w-3.5 h-3.5 text-brand-700" />
            <span>{t('rbacTier1')}</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">{t('execClearanceTitle')}</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">{t('execClearanceDesc')}</p>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-left max-w-lg mx-auto text-[13px] space-y-2">
          <div className="font-semibold text-slate-700 flex flex-wrap items-center justify-between gap-2">
            <span>{t('gatewaySecurityPolicy')}</span>
            <span className="font-mono text-xs text-rose-700 font-bold">HTTP 403 FORBIDDEN</span>
          </div>
          <div className="text-slate-600 font-mono text-xs space-y-1">
            <div>
              <span className="text-slate-500">Target:</span> GET /api/report/dashboard
            </div>
            <div>
              <span className="text-slate-500">Required:</span> hasAnyRole('ADMIN', 'HR_MANAGER')
            </div>
            <div>
              <span className="text-slate-500">{t('accountLabel')}:</span> {currentUser.fullName} ({currentUser.userName})
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <House weight="bold" className="w-4 h-4" />
          {t('returnToDashboard')}
        </button>
      </div>
    );
  }

  const activeEmployees = employees.filter((e) => isActiveStatus(e.status));
  const totalPayroll = payroll.reduce((acc, p) => acc + p.netSalary, 0);
  const attendedCount = attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
  const attendanceRate = attendance.length > 0 ? Math.round((attendedCount / attendance.length) * 1000) / 10 : 0;
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  const deptRows = departments
    .map((d) => {
      const count = employees.filter((e) => e.departmentId === d.departmentId).length;
      return { ...d, count, share: Math.round((count / (employees.length || 1)) * 100) };
    })
    .sort((a, b) => b.count - a.count);
  const maxShare = Math.max(1, ...deptRows.map((d) => d.share));

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
      {/* 1. Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{t('execAnalyticsSub')}</p>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-sm font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
        >
          <DownloadSimple weight="bold" className="w-4 h-4" />
          {t('exportWorkforceCsv')}
        </button>
      </div>

      {/* 2. Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title={t('totalActiveHeadcount')}
          icon={Users}
          value={activeEmployees.length}
          suffix={t('staffUnit')}
          subtitle={t('acrossDepts', { count: departments.length })}
        />
        <MetricCard
          title={t('avgAttendanceRate')}
          icon={CalendarCheck}
          value={`${attendanceRate}%`}
          meter={attendance.length > 0 ? attendanceRate : undefined}
          subtitle={t('fromLastQuarter')}
        />
        <MetricCard
          title={t('totalMonthlyPayout')}
          icon={CurrencyCircleDollar}
          value={money.format(totalPayroll)}
          subtitle={t('calculatedNetPayroll')}
        />
      </div>

      {/* 3. Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="min-h-[290px]">
          <LeaveSummaryChart />
        </div>
        <div className="min-h-[290px]">
          <AttendanceSummaryChart />
        </div>
      </div>

      {/* 4. Department staffing */}
      <DashboardCard
        title={t('deptHeadcountAllocation')}
        subtitle={t('departmentCountLabel', { count: departments.length })}
      >
        <div className="overflow-x-auto -mx-5">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-600 border-y border-slate-200">
                <th scope="col" className="py-3 px-5">{t('colDeptName')}</th>
                <th scope="col" className="py-3 px-5">{t('colFunctionDesc')}</th>
                <th scope="col" className="py-3 px-5 text-right">{t('colHeadcount')}</th>
                <th scope="col" className="py-3 px-5 w-[30%]">{t('colWorkforceShare')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700 tabular-nums">
              {deptRows.map((d) => (
                <tr key={d.departmentId}>
                  <td className="py-3.5 px-5 font-semibold text-slate-900">{d.departmentName}</td>
                  <td className="py-3.5 px-5 text-slate-500 max-w-[280px] truncate" title={d.description}>
                    {d.description || '—'}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    {d.count} {t('membersUnit')}
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3" title={`${d.departmentName}: ${d.share}%`}>
                      <div className="flex-1 h-2.5" aria-hidden="true">
                        <div
                          className="h-2.5 bg-brand-600 rounded-r"
                          style={{ width: `${Math.max(d.share > 0 ? 2 : 0, Math.round((d.share / maxShare) * 100))}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-semibold text-slate-900">{d.share}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      {/* 5. Filtered reports (report service) */}
      <FilteredReports />
    </div>
  );
};
