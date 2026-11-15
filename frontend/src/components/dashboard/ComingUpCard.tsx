import React, { useMemo } from 'react';
import { CalendarCheck, CurrencyDollar, FileText, IconProps } from '@phosphor-icons/react';
import { useHrmsStore } from '../../store/useHrmsStore';
import { useI18n } from '../../i18n/useI18n';
import { DashboardCard, EmptyState, localeFor, parseDateKey, toDateKey } from './DashboardCard';

const WINDOW_DAYS = 30;
const MAX_ITEMS = 5;
// The company payroll run date already used by the app's schedule (MonthlyPayrollJob).
const PAYROLL_DAY = 28;

interface UpcomingEvent {
  id: string;
  date: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<IconProps>;
  warn?: boolean;
}

const isActive = (status?: string) => {
  const s = (status || '').toUpperCase();
  return s !== 'TERMINATED' && s !== 'INACTIVE';
};

export const ComingUpCard: React.FC = () => {
  const { employees, leaves, dashboardSummary } = useHrmsStore();
  const { t, tLeaveType, language } = useI18n();

  const events = useMemo(() => {
    const today = new Date();
    const start = toDateKey(today);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + WINDOW_DAYS);
    const end = toDateKey(endDate);
    const inWindow = (key?: string) => !!key && key.substring(0, 10) >= start && key.substring(0, 10) <= end;

    const list: UpcomingEvent[] = [];

    // Next payroll run
    const payroll = new Date(today.getFullYear(), today.getMonth(), PAYROLL_DAY);
    if (toDateKey(payroll) < start) payroll.setMonth(payroll.getMonth() + 1);
    const activeCount = dashboardSummary?.activeEmployees ?? employees.filter((e) => isActive(e.status)).length;
    if (inWindow(toDateKey(payroll))) {
      list.push({
        id: 'payroll',
        date: toDateKey(payroll),
        title: t('dashEventPayroll'),
        subtitle: activeCount ? t('dashEventPayrollSub', { count: activeCount }) : undefined,
        icon: CurrencyDollar,
      });
    }

    // Contracts ending soon
    employees
      .filter((e) => isActive(e.status) && inWindow(e.contractEndDate))
      .forEach((e) =>
        list.push({
          id: `contract-${e.employeeId}`,
          date: e.contractEndDate!.substring(0, 10),
          title: t('dashEventContract', { name: `${e.firstName} ${e.lastName}`.trim() }),
          subtitle: e.departmentName,
          icon: FileText,
          warn: true,
        })
      );

    // Approved leave starting soon
    leaves
      .filter((l) => l.status?.toUpperCase() === 'APPROVED' && inWindow(l.startDate))
      .forEach((l) =>
        list.push({
          id: `leave-${l.leaveId}`,
          date: l.startDate.substring(0, 10),
          title: t('dashEventLeave', { name: l.employeeName, type: tLeaveType(l.leaveType) }),
          subtitle: l.daysCount === 1 ? t('dashOneDay') : t('dashDaysCount', { count: l.daysCount || 1 }),
          icon: CalendarCheck,
        })
      );

    return list.sort((a, b) => a.date.localeCompare(b.date)).slice(0, MAX_ITEMS);
  }, [employees, leaves, dashboardSummary, t, tLeaveType]);

  const locale = localeFor(language);
  const dayFmt = new Intl.DateTimeFormat(locale, { day: 'numeric' });
  const monFmt = new Intl.DateTimeFormat(locale, { month: 'short' });
  const fullFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <DashboardCard title={t('dashComingUpTitle')} subtitle={t('dashComingUpSub')}>
      {events.length === 0 ? (
        <EmptyState>{t('dashComingUpEmpty')}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {events.map((ev) => {
            const d = parseDateKey(ev.date);
            const Icon = ev.icon;
            return (
              <li key={ev.id} className="flex items-center gap-3">
                <time
                  dateTime={ev.date}
                  title={fullFmt.format(d)}
                  className={`w-11 shrink-0 text-center rounded-lg border py-1 ${
                    ev.warn ? 'border-amber-200 bg-amber-50' : 'border-slate-200'
                  }`}
                >
                  <span className="block font-heading text-base font-semibold leading-tight text-slate-900">
                    {dayFmt.format(d)}
                  </span>
                  <span className="block text-xs font-semibold uppercase text-slate-500">{monFmt.format(d)}</span>
                </time>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    <Icon weight="regular" aria-hidden="true" className="w-4 h-4 shrink-0 text-slate-500" />
                    <span className="truncate">{ev.title}</span>
                  </div>
                  {ev.subtitle && <div className="text-[13px] text-slate-500 truncate">{ev.subtitle}</div>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
};
