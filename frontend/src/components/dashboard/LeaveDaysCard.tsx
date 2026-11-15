import React, { useMemo } from 'react';
import { useHrmsStore } from '../../store/useHrmsStore';
import { useI18n } from '../../i18n/useI18n';
import { DashboardCard, EmptyState, localeFor, toDateKey } from './DashboardCard';

/** Approved leave days whose leave starts in the current month, by leave type. */
export const LeaveDaysCard: React.FC = () => {
  const { leaves } = useHrmsStore();
  const { t, tLeaveType, language } = useI18n();
  const monthPrefix = toDateKey(new Date()).substring(0, 7);

  const rows = useMemo(() => {
    const byType = new Map<string, number>();
    leaves
      .filter((l) => l.status?.toUpperCase() === 'APPROVED' && (l.startDate || '').startsWith(monthPrefix))
      .forEach((l) => {
        const type = l.leaveType || 'Casual Leave';
        byType.set(type, (byType.get(type) || 0) + (l.daysCount || 1));
      });
    return Array.from(byType.entries())
      .map(([type, days]) => ({ type, days }))
      .sort((a, b) => b.days - a.days);
  }, [leaves, monthPrefix]);

  const total = rows.reduce((sum, r) => sum + r.days, 0);
  const max = Math.max(1, ...rows.map((r) => r.days));
  const monthName = new Intl.DateTimeFormat(localeFor(language), { month: 'long', year: 'numeric' }).format(new Date());

  return (
    <DashboardCard title={t('dashLeaveDaysTitle')} subtitle={t('dashLeaveDaysSub', { month: monthName, total })}>
      {rows.length === 0 ? (
        <EmptyState>{t('dashLeaveDaysEmpty')}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3" aria-label={t('dashLeaveDaysTitle')}>
          {rows.map((r) => (
            <li key={r.type} className="flex items-center gap-3" title={`${tLeaveType(r.type)}: ${r.days}`}>
              <span className="w-28 shrink-0 truncate text-[13px] text-slate-600">{tLeaveType(r.type)}</span>
              <div className="flex-1 h-3" aria-hidden="true">
                <div
                  className="h-3 bg-brand-600 rounded-r"
                  style={{ width: `${Math.max(2, Math.round((r.days / max) * 100))}%` }}
                />
              </div>
              <span className="w-8 text-right text-[13px] font-semibold text-slate-900 tabular-nums">{r.days}</span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
};
