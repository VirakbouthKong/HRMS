import React from 'react';
import { UsersThree, Clock, CalendarCheck, WarningCircle, ArrowRight } from '@phosphor-icons/react';
import { MetricCard } from '../components/dashboard/MetricCard';
import { AttendanceExceptionsCard } from '../components/dashboard/AttendanceExceptionsCard';
import { ReviewQueueCard } from '../components/dashboard/ReviewQueueCard';
import { LeaveDaysCard } from '../components/dashboard/LeaveDaysCard';
import { ComingUpCard } from '../components/dashboard/ComingUpCard';
import { AutomationsCard } from '../components/dashboard/AutomationsCard';
import { localeFor, toDateKey } from '../components/dashboard/DashboardCard';
import { useHrmsStore } from '../store/useHrmsStore';
import { getRoleBadge, isRoleAllowedForTab } from '../utils/rbac';
import { useI18n } from '../i18n/useI18n';

const TIME_ZONE = 'Asia/Phnom_Penh';

const isActiveStatus = (status?: string) => {
  const s = (status || '').toUpperCase();
  return s !== 'TERMINATED' && s !== 'INACTIVE';
};

export const DashboardPage: React.FC = () => {
  const {
    currentUser,
    employees,
    departments,
    attendance,
    leaves,
    pendingActions,
    dashboardSummary,
    isLoading,
    setActiveTab,
  } = useHrmsStore();
  const { t, tRole, tStatus, tLeaveType, language } = useI18n();
  const isEmployee = currentUser.role === 'ROLE_EMPLOYEE';
  const roleBadge = getRoleBadge(currentUser.role);
  const showAutomations = isRoleAllowedForTab(currentUser.role, 'automations');
  const todayKey = toDateKey(new Date());
  const numberFmt = new Intl.NumberFormat(language === 'kh' ? 'km-KH' : 'en-US');

  // --- Greeting ---
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: TIME_ZONE }).format(new Date())
  );
  const greetingKey = hour < 12 ? 'dashGoodMorning' : hour < 18 ? 'dashGoodAfternoon' : 'dashGoodEvening';
  const dateLine = new Intl.DateTimeFormat(localeFor(language), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(new Date());
  const pendingCount = pendingActions.length;
  const statusLine =
    pendingCount === 0
      ? t('dashAllClear')
      : isEmployee
      ? t('dashMyPendingLine', { count: pendingCount })
      : t('dashNeedsDecision', { count: pendingCount });

  // --- KPIs ---
  const totalEmployees = dashboardSummary?.totalEmployees ?? employees.length;
  const activeEmployees = dashboardSummary?.activeEmployees ?? employees.filter((e) => isActiveStatus(e.status)).length;
  const totalDepartments = dashboardSummary?.totalDepartments ?? departments.length;

  const todayRecords = attendance.filter((a) => (a.attendanceDate || '').startsWith(todayKey));
  const presentToday = todayRecords.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
  const lateToday = todayRecords.filter((a) => a.status === 'LATE').length;
  const presentPct = activeEmployees > 0 ? Math.round((presentToday / activeEmployees) * 100) : 0;
  const myToday = todayRecords.find((a) => a.employeeId === currentUser.employeeId) ?? todayRecords[0];

  const onLeaveToday = leaves.filter(
    (l) =>
      l.status?.toUpperCase() === 'APPROVED' &&
      l.startDate &&
      l.startDate.substring(0, 10) <= todayKey &&
      (l.endDate || l.startDate).substring(0, 10) >= todayKey
  );
  const leaveByType = new Map<string, number>();
  onLeaveToday.forEach((l) => leaveByType.set(l.leaveType, (leaveByType.get(l.leaveType) || 0) + 1));
  const leaveBreakdown = Array.from(leaveByType.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, n]) => `${numberFmt.format(n)} ${tLeaveType(type)}`)
    .join(' · ');

  const pendingLeaveCount = pendingActions.filter((a) => a.actionKind !== 'correction').length;
  const pendingCorrectionCount = pendingCount - pendingLeaveCount;

  const metric = (n: number) =>
    isLoading && n === 0 ? (
      <span className="inline-block h-8 w-14 bg-slate-200/80 animate-pulse rounded-lg align-middle" />
    ) : (
      numberFmt.format(n)
    );

  return (
    <div className="space-y-6 pb-10">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-slate-900">
            {t(greetingKey, { name: currentUser.fullName })}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {dateLine} · {statusLine}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${roleBadge.badgeClass}`}
        >
          <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${roleBadge.dotClass}`} />
          {tRole(currentUser.role).shortTag}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title={t('dashKpiWorkforce')}
          icon={UsersThree}
          value={metric(totalEmployees)}
          subtitle={t('dashKpiWorkforceSub', {
            active: numberFmt.format(activeEmployees),
            departments: numberFmt.format(totalDepartments),
          })}
        />
        {isEmployee ? (
          <MetricCard
            title={t('dashKpiMyToday')}
            icon={Clock}
            accent={myToday ? 'brand' : 'neutral'}
            value={myToday ? tStatus(myToday.status) : '—'}
            subtitle={myToday?.checkIn ? t('dashCheckedInAt', { time: myToday.checkIn }) : t('dashNotCheckedIn')}
          />
        ) : (
          <MetricCard
            title={t('dashKpiPresent')}
            icon={Clock}
            value={metric(presentToday)}
            suffix={activeEmployees > 0 ? `/ ${numberFmt.format(activeEmployees)}` : undefined}
            meter={todayRecords.length > 0 ? presentPct : undefined}
            meterLabel={`${t('dashKpiPresent')}: ${presentPct}%`}
            subtitle={
              todayRecords.length > 0
                ? t('dashKpiPresentSub', { pct: presentPct, late: numberFmt.format(lateToday) })
                : t('dashKpiPresentNone')
            }
          />
        )}
        <MetricCard
          title={t('dashKpiOnLeave')}
          icon={CalendarCheck}
          value={metric(onLeaveToday.length)}
          subtitle={onLeaveToday.length > 0 ? leaveBreakdown : t('dashKpiOnLeaveNone')}
        />
        <MetricCard
          title={isEmployee ? t('dashKpiMyPending') : t('dashKpiWaiting')}
          icon={WarningCircle}
          accent={pendingCount > 0 ? 'warn' : 'neutral'}
          value={metric(pendingCount)}
          footer={
            <button
              type="button"
              onClick={() => setActiveTab('leaves')}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-amber-800 hover:text-amber-900 rounded focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none cursor-pointer"
            >
              {t('dashKpiWaitingSub', {
                leaves: numberFmt.format(pendingLeaveCount),
                corrections: numberFmt.format(pendingCorrectionCount),
              })}
              <ArrowRight weight="bold" className="w-3.5 h-3.5" />
            </button>
          }
        />
      </div>

      {/* Attendance + review queue */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-4">
        <AttendanceExceptionsCard />
        <ReviewQueueCard />
      </div>

      {/* Leave, upcoming, automations */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${showAutomations ? 'xl:grid-cols-3' : ''}`}>
        <LeaveDaysCard />
        <ComingUpCard />
        {showAutomations && <AutomationsCard />}
      </div>
    </div>
  );
};
