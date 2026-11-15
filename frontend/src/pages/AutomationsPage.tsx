import React, { useMemo, useState } from 'react';
import {
  Clock,
  CheckCircle,
  CircleNotch,
  Play,
  CalendarCheck,
  CurrencyDollar,
  ChartBar,
  WarningCircle,
  IconProps,
} from '@phosphor-icons/react';
import { useHrmsStore } from '../store/useHrmsStore';
import { useI18n } from '../i18n/useI18n';
import { JobExecution } from '../types';
import { StatusChip, localeFor } from '../components/dashboard/DashboardCard';
import { FilterTabs } from '../components/ui/filter-tabs';

interface CronJobSpec {
  jobName: string;
  titleKey: 'cronAttTitle' | 'cronContractTitle' | 'cronPayrollTitle' | 'cronWeeklyTitle';
  taglineKey: 'cronAttTagline' | 'cronContractTagline' | 'cronPayrollTagline' | 'cronWeeklyTagline';
  cadenceKey: 'cronAttCadence' | 'cronContractCadence' | 'cronPayrollCadence' | 'cronWeeklyCadence';
  /** Must match the @Scheduled(cron = ...) value of the job in backend/cron_service. */
  schedule: string;
  icon: React.ComponentType<IconProps>;
}

const CRON_JOBS: CronJobSpec[] = [
  {
    jobName: 'DailyAttendanceSyncJob',
    titleKey: 'cronAttTitle',
    taglineKey: 'cronAttTagline',
    cadenceKey: 'cronAttCadence',
    schedule: '0 0 0 * * *',
    icon: Clock,
  },
  {
    jobName: 'ContractExpiryJob',
    titleKey: 'cronContractTitle',
    taglineKey: 'cronContractTagline',
    cadenceKey: 'cronContractCadence',
    schedule: '0 0 8 * * ?',
    icon: CalendarCheck,
  },
  {
    jobName: 'MonthlyPayrollJob',
    titleKey: 'cronPayrollTitle',
    taglineKey: 'cronPayrollTagline',
    cadenceKey: 'cronPayrollCadence',
    schedule: '0 0 1 28 * ?',
    icon: CurrencyDollar,
  },
  {
    jobName: 'WeeklyReportJob',
    titleKey: 'cronWeeklyTitle',
    taglineKey: 'cronWeeklyTagline',
    cadenceKey: 'cronWeeklyCadence',
    schedule: '0 0 8 * * MON',
    icon: ChartBar,
  },
];

export const AutomationsPage: React.FC = () => {
  const { cronHistory, triggerCronJob, currentUser } = useHrmsStore();
  const { t, language } = useI18n();
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState<string>('ALL');

  const isAdmin = currentUser.role === 'ROLE_ADMIN' || currentUser.role === 'ROLE_HR';

  const handleTrigger = async (jobName: string, title: string) => {
    setTriggeringJob(jobName);
    setToastMessage(null);
    setErrorMessage(null);

    const res = await triggerCronJob(jobName);
    setTriggeringJob(null);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to execute job.');
      return;
    }

    setToastMessage(t('cronExecutedToast', { title }));
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Latest run per job drives the health summary and each card's "last run" line.
  const latestByJob = useMemo(() => {
    const map = new Map<string, JobExecution>();
    cronHistory.forEach((run) => {
      const prev = map.get(run.jobName);
      if (!prev || (run.executionTime || '') > (prev.executionTime || '')) map.set(run.jobName, run);
    });
    return map;
  }, [cronHistory]);
  const failedJobs = Array.from(latestByJob.values()).filter((r) => r.status === 'FAILED').length;

  const sortedHistory = useMemo(
    () => [...cronHistory].sort((a, b) => (b.executionTime || '').localeCompare(a.executionTime || '')),
    [cronHistory]
  );
  const filteredHistory = jobFilter === 'ALL' ? sortedHistory : sortedHistory.filter((h) => h.jobName === jobFilter);

  const timeFmt = new Intl.DateTimeFormat(localeFor(language), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const fmtTime = (ts?: string) => {
    if (!ts) return '—';
    const d = new Date(ts.replace(' ', 'T'));
    return isNaN(d.getTime()) ? ts : timeFmt.format(d);
  };
  const fmtDuration = (ms?: number) =>
    ms === undefined || ms === null
      ? '—'
      : ms >= 1000
      ? t('auSeconds', { s: (ms / 1000).toFixed(1) })
      : t('auMillis', { ms });
  const jobTitle = (jobName: string) => {
    const spec = CRON_JOBS.find((j) => j.jobName === jobName);
    return spec ? t(spec.titleKey) : jobName;
  };
  const runChip = (status?: JobExecution['status']) =>
    status === 'FAILED' ? (
      <StatusChip tone="bad">{t('dashJobFailed')}</StatusChip>
    ) : status === 'RUNNING' ? (
      <StatusChip tone="info">{t('dashJobRunning')}</StatusChip>
    ) : (
      <StatusChip tone="ok">{t('dashJobSuccess')}</StatusChip>
    );

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Health summary (from the latest run of each job, not a static badge) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-600">{t('auJobsCount', { count: CRON_JOBS.length })}</span>
        {latestByJob.size === 0 ? (
          <StatusChip tone="neutral">{t('auNoRunsChip')}</StatusChip>
        ) : failedJobs > 0 ? (
          <StatusChip tone="bad">{t('dashSomeFailed', { count: failedJobs })}</StatusChip>
        ) : (
          <StatusChip tone="ok">{t('dashAllHealthy')}</StatusChip>
        )}
      </div>

      {/* 2. Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 rounded-lg bg-brand-50 border border-brand-200 text-sm text-brand-800 flex items-center gap-2 animate-fadeIn"
        >
          <CheckCircle weight="fill" className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-center gap-2 animate-fadeIn"
        >
          <WarningCircle weight="fill" className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* 3. Scheduled jobs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {CRON_JOBS.map((job) => {
          const Icon = job.icon;
          const isRunning = triggeringJob === job.jobName;
          const title = t(job.titleKey);
          const last = latestByJob.get(job.jobName);

          return (
            <section key={job.jobName} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Icon weight="regular" className="w-5 h-5" />
                </div>
                {last && runChip(last.status)}
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                <p className="text-[13px] text-slate-500 mt-1">{t(job.taglineKey)}</p>
              </div>

              <div className="text-[13px] text-slate-700 flex flex-col gap-1">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Clock weight="regular" aria-hidden="true" className="w-4 h-4 text-slate-500" />
                  {t(job.cadenceKey)}
                </span>
                <code title={t('auCronExpr')} className="text-xs text-slate-500 tabular-nums">
                  {job.schedule}
                </code>
              </div>

              <div className="mt-auto pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 text-[13px]">
                  <div className="text-slate-600 tabular-nums">
                    {last ? t('auLastRun', { time: fmtTime(last.executionTime) }) : t('auNeverRun')}
                  </div>
                  {last?.status === 'FAILED' && last.message && (
                    <div className="text-rose-800 truncate max-w-[220px]" title={last.message}>
                      {last.message}
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleTrigger(job.jobName, title)}
                    disabled={isRunning}
                    aria-label={t('auRunAria', { job: title })}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-[13px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
                  >
                    {isRunning ? (
                      <>
                        <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                        {t('runningText')}
                      </>
                    ) : (
                      <>
                        <Play weight="fill" className="w-3 h-3 text-brand-600" />
                        {t('auRunNow')}
                      </>
                    )}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* 4. Run history */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{t('executionHistory')}</h2>
          <p className="text-[13px] text-slate-500 mt-1">{t('executionHistorySub')}</p>
        </div>
        <FilterTabs
          label={t('auFilterLabel')}
          value={jobFilter}
          onChange={setJobFilter}
          tabs={[
            { value: 'ALL', label: t('lvTabAll'), count: cronHistory.length },
            ...CRON_JOBS.map((j) => ({
              value: j.jobName,
              label: t(j.titleKey),
              count: cronHistory.filter((h) => h.jobName === j.jobName).length,
            })),
          ]}
        />
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                <th scope="col" className="py-3 px-5">{t('colJob')}</th>
                <th scope="col" className="py-3 px-5">{t('colStatus')}</th>
                <th scope="col" className="py-3 px-5">{t('colTimestamp')}</th>
                <th scope="col" className="py-3 px-5 text-right">{t('colJobDuration')}</th>
                <th scope="col" className="py-3 px-5">{t('auColResult')}</th>
                <th scope="col" className="py-3 px-5">{t('colTrigger')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700 tabular-nums">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-5 text-center text-slate-500">
                    {t('noExecutions')}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3.5 px-5 font-semibold text-slate-900">{jobTitle(item.jobName)}</td>
                    <td className="py-3.5 px-5">{runChip(item.status)}</td>
                    <td className="py-3.5 px-5 whitespace-nowrap">{fmtTime(item.executionTime)}</td>
                    <td className="py-3.5 px-5 text-right">{fmtDuration(item.durationMs)}</td>
                    <td className="py-3.5 px-5 max-w-[320px] truncate text-slate-600" title={item.message}>
                      {item.message || '—'}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">
                      {item.triggeredBy === 'CRON_SCHEDULER' ? t('scheduledTrigger') : item.triggeredBy || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
