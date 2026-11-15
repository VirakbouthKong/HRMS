import React from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import { JobHistoryItem } from '../../api';
import { useI18n } from '../../i18n/useI18n';
import { StatusChip, localeFor, parseDateKey } from '../dashboard/DashboardCard';

interface JobHistoryTimelineProps {
  items: JobHistoryItem[];
  loading?: boolean;
  error?: string | null;
}

/** Newest-first job timeline; the current job (no end date) is highlighted. */
export const JobHistoryTimeline: React.FC<JobHistoryTimelineProps> = ({ items, loading, error }) => {
  const { t, language } = useI18n();
  const dateFmt = new Intl.DateTimeFormat(localeFor(language), { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtDate = (s?: string | null) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? dateFmt.format(parseDateKey(s)) : s || '—');

  if (loading) {
    return (
      <div className="py-10 text-center text-slate-500">
        <CircleNotch weight="bold" className="inline w-5 h-5 animate-spin" aria-label="Loading" />
      </div>
    );
  }
  if (error) {
    return (
      <p role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
        {error}
      </p>
    );
  }
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">{t('jhEmpty')}</p>;
  }
  return (
    <ol className="relative flex flex-col gap-5 pl-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
      {items.map((h, i) => {
        const current = !h.endDate;
        return (
          <li key={`${h.jobTitle}-${h.startedDate}-${i}`} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-6 top-1 w-[15px] h-[15px] rounded-full border-2 border-white ${
                current ? 'bg-brand-600' : 'bg-slate-300'
              }`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">{h.jobTitle}</span>
              {current && <StatusChip tone="ok">{t('jhCurrent')}</StatusChip>}
            </div>
            <div className="text-[13px] text-slate-600 mt-0.5">{h.departmentName}</div>
            <div className="text-[13px] text-slate-500 mt-0.5 tabular-nums">
              {fmtDate(h.startedDate)} – {h.endDate ? fmtDate(h.endDate) : t('jhPresent')}
            </div>
            {h.remark && <p className="text-[13px] text-slate-600 mt-1">{h.remark}</p>}
          </li>
        );
      })}
    </ol>
  );
};
