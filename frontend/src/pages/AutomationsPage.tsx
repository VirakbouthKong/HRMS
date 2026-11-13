import React, { useState } from 'react';
import {
  Clock,
  CheckCircle,
  CircleNotch,
  Play,
  CalendarCheck,
  CurrencyDollar,
  ChartBar,
  WarningCircle,
} from '@phosphor-icons/react';
import { useHrmsStore } from '../store/useHrmsStore';
import { BehavioralHistorySelect } from '../components/ui/behavioral-history-select';
import { useI18n } from '../i18n/useI18n';

interface CronJobSpec {
  jobName: string;
  titleKey: 'cronAttTitle' | 'cronContractTitle' | 'cronPayrollTitle' | 'cronWeeklyTitle';
  taglineKey: 'cronAttTagline' | 'cronContractTagline' | 'cronPayrollTagline' | 'cronWeeklyTagline';
  cadenceKey: 'cronAttCadence' | 'cronContractCadence' | 'cronPayrollCadence' | 'cronWeeklyCadence';
  schedule: string;
  icon: any;
}

const CRON_JOBS: CronJobSpec[] = [
  {
    jobName: 'DailyAttendanceSyncJob',
    titleKey: 'cronAttTitle',
    taglineKey: 'cronAttTagline',
    cadenceKey: 'cronAttCadence',
    schedule: '0 0 1 * * ?',
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
    schedule: '0 0 0 28 * ?',
    icon: CurrencyDollar,
  },
  {
    jobName: 'WeeklyReportJob',
    titleKey: 'cronWeeklyTitle',
    taglineKey: 'cronWeeklyTagline',
    cadenceKey: 'cronWeeklyCadence',
    schedule: '0 0 9 ? * MON',
    icon: ChartBar,
  },
];

export const AutomationsPage: React.FC = () => {
  const { cronHistory, triggerCronJob, currentUser } = useHrmsStore();
  const { t, tStatus } = useI18n();
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('ALL');

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

  const filteredHistory =
    selectedJobFilter === 'ALL'
      ? cronHistory
      : cronHistory.filter((h) => h.jobName === selectedJobFilter);

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* 1. Status Bar */}
      <div className="flex items-center justify-between gap-4 pb-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {t('scheduledTasksCount', { count: CRON_JOBS.length })}
        </span>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-mono font-semibold text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{t('daemonActive')}</span>
        </span>
      </div>

      {/* 2. Feedback Toasts */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3 animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <CheckCircle weight="fill" className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <span className="font-mono text-[10px] text-emerald-600">{t('dispatched')}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 animate-fadeIn"
        >
          <WarningCircle weight="fill" className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* 3. Scheduled Jobs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CRON_JOBS.map((job) => {
          const Icon = job.icon;
          const isRunning = triggeringJob === job.jobName;
          const jobTitle = t(job.titleKey);

          return (
            <div
              key={job.jobName}
              className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-[box-shadow,border-color] duration-150 min-h-[165px]"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <Icon weight="duotone" className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {t(job.cadenceKey)}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-3 tracking-tight">
                  {jobTitle}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {t(job.taglineKey)}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  {job.schedule}
                </span>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleTrigger(job.jobName, jobTitle)}
                    disabled={isRunning}
                    aria-label={`${t('runBtn')} ${jobTitle}`}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.96] text-white text-xs font-semibold shadow-2xs transition-[transform,background-color] duration-100 disabled:opacity-50 cursor-pointer"
                  >
                    {isRunning ? (
                      <>
                        <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                        <span>{t('runningText')}</span>
                      </>
                    ) : (
                      <>
                        <Play weight="fill" className="w-3 h-3 text-emerald-400" />
                        <span>{t('runBtn')}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Execution History Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              {t('executionHistory')}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">{t('executionHistorySub')}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">{t('filterLabel')}</span>
            <BehavioralHistorySelect
              selectWidth="200px"
              value={selectedJobFilter}
              onChange={(val) => setSelectedJobFilter(val)}
              options={[
                { value: 'ALL', label: t('allJobs') },
                ...CRON_JOBS.map((j) => ({
                  value: j.jobName,
                  label: t(j.titleKey),
                })),
              ]}
              storageKey="hrms_cron_filter_history"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-3">{t('colJob')}</th>
                <th className="px-6 py-3">{t('colStatus')}</th>
                <th className="px-6 py-3">{t('colTimestamp')}</th>
                <th className="px-6 py-3">{t('colJobDuration')}</th>
                <th className="px-6 py-3 text-right">{t('colTrigger')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    {t('noExecutions')}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => {
                  const jobSpec = CRON_JOBS.find((j) => j.jobName === item.jobName);
                  const isSuccess = item.status === 'SUCCESS';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        <span className="font-bold text-slate-900">
                          {jobSpec ? t(jobSpec.titleKey) : item.jobName}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold text-[11px] px-2.5 py-0.5 rounded-full border ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                              : 'bg-rose-50 text-rose-700 border-rose-200/80'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSuccess ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>{tStatus(item.status)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap tabular-nums">
                        {item.executionTime}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-600 text-[11px] tabular-nums">
                        {item.durationMs}ms
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-[10px] text-slate-400">
                        {item.triggeredBy === 'CRON_SCHEDULER'
                          ? t('scheduledTrigger')
                          : item.triggeredBy}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
