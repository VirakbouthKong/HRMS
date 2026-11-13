import React from 'react';
import {
  UsersThree,
  Buildings,
  CheckCircle,
  CalendarCheck,
  Briefcase,
} from '@phosphor-icons/react';
import { MetricCard } from '../components/dashboard/MetricCard';
import { PendingActionCard } from '../components/dashboard/PendingActionCard';
import { EventCalendarCard } from '../components/dashboard/EventCalendarCard';
import { LeaveSummaryChart } from '../components/dashboard/LeaveSummaryChart';
import { AttendanceSummaryChart } from '../components/dashboard/AttendanceSummaryChart';
import { useHrmsStore } from '../store/useHrmsStore';
import { getRoleBadge } from '../utils/rbac';
import { useI18n } from '../i18n/useI18n';

export const DashboardPage: React.FC = () => {
  const { currentUser, employees, departments, jobs, leaves, dashboardSummary, isLoading } = useHrmsStore();
  const { t, tRole } = useI18n();
  const roleBadge = getRoleBadge(currentUser.role);
  const roleInfo = tRole(currentUser.role);

  const totalEmployees = dashboardSummary?.totalEmployees ?? employees.length;
  const activeEmployees =
    dashboardSummary?.activeEmployees ??
    employees.filter((e) => e.status?.toUpperCase() === 'ACTIVE' || e.status === 'Active').length;
  const totalDepartments = dashboardSummary?.totalDepartments ?? departments.length;
  const totalJobs = dashboardSummary?.totalJobs ?? jobs.length;
  const pendingLeaves = leaves.filter((l) => l.status === 'PENDING').length;

  const renderMetric = (val: number) => {
    if (isLoading && val === 0) {
      return <div className="h-7 w-12 bg-slate-200/80 animate-pulse rounded-lg mt-0.5" />;
    }
    return String(val).padStart(2, '0');
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            {t('welcomeBack')} <span className="text-blue-600">{currentUser.fullName}</span>
          </h2>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${roleBadge.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${roleBadge.dotClass}`} />
            <span>{roleInfo.shortTag}</span>
          </span>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          {t('portalTagline')}
        </div>
      </div>

      {/* 1. Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          value={renderMetric(totalEmployees)}
          title={t('metricTotalWorkforce')}
          subtitle={t('metricTotalWorkforceSub')}
          icon={UsersThree}
          accent="blue"
        />
        <MetricCard
          value={renderMetric(activeEmployees)}
          title={t('metricActiveStaff')}
          subtitle={t('metricActiveStaffSub')}
          icon={CheckCircle}
          accent="green"
        />
        <MetricCard
          value={renderMetric(totalDepartments)}
          title={t('metricDepartments')}
          subtitle={t('metricDepartmentsSub')}
          icon={Buildings}
          accent="purple"
        />
        <MetricCard
          value={renderMetric(totalJobs)}
          title={t('metricJobPositions')}
          subtitle={t('metricJobPositionsSub')}
          icon={Briefcase}
          accent="cyan"
        />
        <MetricCard
          value={renderMetric(pendingLeaves)}
          title={t('metricPendingRequests')}
          subtitle={t('metricPendingRequestsSub')}
          icon={CalendarCheck}
          accent="orange"
        />
      </div>

      {/* 2. Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-h-[320px]">
          <PendingActionCard />
        </div>
        <div className="min-h-[320px]">
          <EventCalendarCard />
        </div>
      </div>

      {/* 3. Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-h-[280px]">
          <LeaveSummaryChart />
        </div>
        <div className="min-h-[280px]">
          <AttendanceSummaryChart />
        </div>
      </div>
    </div>
  );
};
