import React, { useMemo, useState } from 'react';
import { useHrmsStore } from '../../store/useHrmsStore';
import { useI18n } from '../../i18n/useI18n';
import { DashboardCard, EmptyState, localeFor, parseDateKey, toDateKey } from './DashboardCard';

// Validated categorical palette (CVD-safe adjacent pairs): late, on leave, absent.
const SERIES = [
  { key: 'late', status: 'LATE', color: '#C46A00', labelKey: 'dashLate' },
  { key: 'leave', status: 'ON_LEAVE', color: '#6250D6', labelKey: 'dashOnLeave' },
  { key: 'absent', status: 'ABSENT', color: '#C2405A', labelKey: 'dashAbsent' },
] as const;

type SeriesKey = (typeof SERIES)[number]['key'];
type DayRow = { date: string; total: number } & Record<SeriesKey, number>;

const DAYS_SHOWN = 7;
const CHART_HEIGHT = 180;

const niceMax = (n: number) => {
  if (n <= 5) return 5;
  const step = n <= 20 ? 5 : n <= 50 ? 10 : 20;
  return Math.ceil(n / step) * step;
};

export const AttendanceExceptionsCard: React.FC = () => {
  const { attendance } = useHrmsStore();
  const { t, language } = useI18n();
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const todayKey = toDateKey(new Date());

  // Most recent days that have any attendance records, oldest first.
  const rows: DayRow[] = useMemo(() => {
    const byDate = new Map<string, DayRow>();
    attendance.forEach((rec) => {
      const date = (rec.attendanceDate || '').substring(0, 10);
      if (!date) return;
      if (!byDate.has(date)) byDate.set(date, { date, late: 0, leave: 0, absent: 0, total: 0 });
      const row = byDate.get(date)!;
      const series = SERIES.find((s) => s.status === rec.status);
      if (series) {
        row[series.key] += 1;
        row.total += 1;
      }
    });
    return Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-DAYS_SHOWN);
  }, [attendance]);

  const totals = SERIES.map((s) => rows.reduce((sum, r) => sum + r[s.key], 0));
  const max = niceMax(Math.max(0, ...rows.map((r) => r.total)));
  const unit = CHART_HEIGHT / max;
  const ticks = [0, max / 2, max];

  const dayFmt = new Intl.DateTimeFormat(localeFor(language), { weekday: 'short' });
  const dateFmt = new Intl.DateTimeFormat(localeFor(language), { day: 'numeric', month: 'short' });
  const dayLabel = (key: string) => (key === todayKey ? t('dashToday') : dayFmt.format(parseDateKey(key)));
  const dateLabel = (key: string) => dateFmt.format(parseDateKey(key));

  const subtitle =
    rows.length > 0
      ? `${t('dashExceptionsSub')} · ${dateLabel(rows[0].date)} – ${dateLabel(rows[rows.length - 1].date)}`
      : t('dashExceptionsSub');

  const toggle = (
    <div role="group" aria-label={t('dashViewAs')} className="flex gap-0.5 p-[3px] border border-slate-200 rounded-lg">
      {(['chart', 'table'] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => setView(v)}
          className={`h-8 px-3 rounded-md text-[13px] font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none ${
            view === v ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {v === 'chart' ? t('dashViewChart') : t('dashViewTable')}
        </button>
      ))}
    </div>
  );

  const ariaSummary = rows
    .map((r) => `${dateLabel(r.date)}: ${SERIES.map((s) => `${t(s.labelKey)} ${r[s.key]}`).join(', ')}`)
    .join('; ');

  return (
    <DashboardCard title={t('dashExceptionsTitle')} subtitle={subtitle} action={rows.length > 0 ? toggle : undefined}>
      {rows.length === 0 ? (
        <EmptyState>{t('dashNoAttendance')}</EmptyState>
      ) : (
        <>
          {/* Legend: always present, with period totals so identity never relies on colour alone */}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {SERIES.map((s, i) => (
              <span key={s.key} className="inline-flex items-center gap-2 text-[13px] text-slate-600">
                <span aria-hidden="true" className="w-2.5 h-2.5 rounded-[3px]" style={{ background: s.color }} />
                {t(s.labelKey)}
                <span className="text-slate-500 tabular-nums">{t('dashInPeriod', { count: totals[i] })}</span>
              </span>
            ))}
          </div>

          {view === 'chart' ? (
            totals.every((n) => n === 0) ? (
              <EmptyState>{t('dashNoExceptions')}</EmptyState>
            ) : (
              <div role="img" aria-label={`${t('dashExceptionsTitle')}. ${ariaSummary}`} className="flex flex-col gap-2">
                <div className="flex gap-2.5">
                  {/* Y axis */}
                  <div className="relative w-6 shrink-0" style={{ height: CHART_HEIGHT }} aria-hidden="true">
                    {ticks.map((v) => (
                      <span
                        key={v}
                        className="absolute right-0 translate-y-1/2 text-xs text-slate-500 tabular-nums"
                        style={{ bottom: v * unit }}
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                  {/* Plot */}
                  <div className="relative flex-1 border-b border-slate-300" style={{ height: CHART_HEIGHT }}>
                    {ticks.slice(1).map((v) => (
                      <div
                        key={v}
                        aria-hidden="true"
                        className="absolute inset-x-0 border-t border-dashed border-slate-200"
                        style={{ bottom: v * unit }}
                      />
                    ))}
                    <div className="absolute inset-0 flex items-end justify-around">
                      {rows.map((r) => {
                        const visible = SERIES.filter((s) => r[s.key] > 0);
                        return (
                          <div
                            key={r.date}
                            className="group h-full w-16 flex flex-col items-center justify-end gap-1.5 rounded-md hover:bg-slate-50"
                            title={`${dateLabel(r.date)} · ${SERIES.map((s) => `${t(s.labelKey)}: ${r[s.key]}`).join(' · ')}`}
                          >
                            <span className="text-xs font-semibold text-slate-600 tabular-nums">{r.total}</span>
                            {/* Stack bottom → top: late, on leave, absent. 2px gaps; rounded top only. */}
                            <div className="flex flex-col-reverse gap-[2px] w-9">
                              {visible.map((s, i) => (
                                <div
                                  key={s.key}
                                  style={{
                                    height: Math.max(2, r[s.key] * unit),
                                    background: s.color,
                                    borderRadius: i === visible.length - 1 ? '4px 4px 0 0' : 0,
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {/* X axis */}
                <div className="flex justify-around pl-[34px]" aria-hidden="true">
                  {rows.map((r) => (
                    <div
                      key={r.date}
                      className={`w-16 text-center text-xs leading-snug ${
                        r.date === todayKey ? 'text-slate-900 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {dayLabel(r.date)}
                      <br />
                      {dateLabel(r.date)}
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th scope="col" className="text-left py-2 px-2.5 text-xs font-semibold text-slate-600">
                      {t('dashDay')}
                    </th>
                    {SERIES.map((s) => (
                      <th key={s.key} scope="col" className="text-right py-2 px-2.5 text-xs font-semibold text-slate-600">
                        {t(s.labelKey)}
                      </th>
                    ))}
                    <th scope="col" className="text-right py-2 px-2.5 text-xs font-semibold text-slate-600">
                      {t('dashTotal')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.date} className="border-b border-slate-100 last:border-0">
                      <th scope="row" className="text-left py-2 px-2.5 font-medium text-slate-800">
                        {dayLabel(r.date)} {dateLabel(r.date)}
                      </th>
                      {SERIES.map((s) => (
                        <td key={s.key} className="text-right py-2 px-2.5 text-slate-700">
                          {r[s.key]}
                        </td>
                      ))}
                      <td className="text-right py-2 px-2.5 font-semibold text-slate-900">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </DashboardCard>
  );
};
