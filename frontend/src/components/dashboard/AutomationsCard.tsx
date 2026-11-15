import React, { useMemo } from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import { useHrmsStore } from '../../store/useHrmsStore';
import { useI18n, TranslationKey } from '../../i18n/useI18n';
import { JobExecution } from '../../types';
import { DashboardCard, EmptyState, StatusChip } from './DashboardCard';

const JOB_TITLES: Record<string, TranslationKey> = {
  DailyAttendanceSyncJob: 'cronAttTitle',
  ContractExpiryJob: 'cronContractTitle',
  MonthlyPayrollJob: 'cronPayrollTitle',
  WeeklyReportJob: 'cronWeeklyTitle',
};

/** Latest run of each scheduled job from the cron service. */
export const AutomationsCard: React.FC = () => {
  const { cronHistory, setActiveTab } = useHrmsStore();
  const { t } = useI18n();

  const latest = useMemo(() => {
    const byJob = new Map<string, JobExecution>();
    cronHistory.forEach((run) => {
      const prev = byJob.get(run.jobName);
      if (!prev || (run.executionTime || '') > (prev.executionTime || '')) byJob.set(run.jobName, run);
    });
    return Array.from(byJob.values()).sort((a, b) => a.jobName.localeCompare(b.jobName));
  }, [cronHistory]);

  const failed = latest.filter((r) => r.status === 'FAILED').length;
  const headerChip =
    latest.length === 0 ? undefined : failed > 0 ? (
      <StatusChip tone="bad">{t('dashSomeFailed', { count: failed })}</StatusChip>
    ) : (
      <StatusChip tone="ok">{t('dashAllHealthy')}</StatusChip>
    );

  const chipFor = (run: JobExecution) =>
    run.status === 'FAILED' ? (
      <StatusChip tone="bad">{t('dashJobFailed')}</StatusChip>
    ) : run.status === 'RUNNING' ? (
      <StatusChip tone="info">{t('dashJobRunning')}</StatusChip>
    ) : (
      <StatusChip tone="ok">{t('dashJobSuccess')}</StatusChip>
    );

  return (
    <DashboardCard title={t('dashAutomationsTitle')} subtitle={t('dashAutomationsSub')} action={headerChip}>
      {latest.length === 0 ? (
        <EmptyState>{t('dashNoRuns')}</EmptyState>
      ) : (
        <ul className="flex flex-col -mt-1">
          {latest.map((run) => (
            <li
              key={run.jobName}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5 border-t border-slate-100 first:border-0"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {JOB_TITLES[run.jobName] ? t(JOB_TITLES[run.jobName]) : run.jobName}
                </div>
                <div className="text-[13px] text-slate-500 tabular-nums">{(run.executionTime || '').substring(0, 16)}</div>
              </div>
              {chipFor(run)}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setActiveTab('automations')}
        className="mt-auto self-start inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800 rounded focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none cursor-pointer"
      >
        {t('dashOpenAutomations')}
        <ArrowRight weight="bold" className="w-3.5 h-3.5" />
      </button>
    </DashboardCard>
  );
};
