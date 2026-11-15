import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Clock } from '@phosphor-icons/react';
import { useHrmsStore } from '../../store/useHrmsStore';
import { useI18n } from '../../i18n/useI18n';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export const AttendanceSummaryChart: React.FC = () => {
  const { attendance } = useHrmsStore();
  const { t } = useI18n();

  const normStatus = (s?: string) => (s || '').toUpperCase().trim();

  const onTimeCount = attendance.filter(
    (a) =>
      (normStatus(a.status) === 'PRESENT' || normStatus(a.status) === 'PUNCTUAL') &&
      (!a.lateMinutes || a.lateMinutes === 0)
  ).length;

  const lateCount = attendance.filter(
    (a) => normStatus(a.status) === 'LATE' || Number(a.lateMinutes) > 0
  ).length;

  const absentLeaveCount = attendance.filter(
    (a) =>
      normStatus(a.status) === 'ABSENT' ||
      normStatus(a.status) === 'ON_LEAVE' ||
      normStatus(a.status) === 'LEAVE'
  ).length;

  const totalLogs = attendance.length;
  const maxVal = Math.max(onTimeCount, lateCount, absentLeaveCount, 1);
  const yAxisMax = Math.max(5, Math.ceil(maxVal * 1.25));

  const onTimeLabel = t('onTimeLabel');
  const lateLabel = t('lateArrivalLabel');
  const absentLabel = t('absentLeaveLabel');

  const data = {
    labels: [onTimeLabel, lateLabel, absentLabel],
    datasets: [
      {
        data: [onTimeCount, lateCount, absentLeaveCount],
        backgroundColor: ['#0A8F72', '#C46A00', '#6250D6'],
        borderRadius: 4,
        borderSkipped: 'start' as const,
        barThickness: 32,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) =>
            ` ${context.label}: ${t('recordsSuffix', { count: context.raw })}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#5F6B65',
        },
      },
      y: {
        min: 0,
        max: yAxisMax,
        ticks: {
          stepSize: yAxisMax <= 10 ? 1 : Math.ceil(yAxisMax / 5),
          font: {
            size: 10,
          },
          color: '#5F6B65',
        },
        grid: {
          color: '#E3E6E1',
        },
      },
    },
  };

  const legendItems = [
    { label: onTimeLabel, count: onTimeCount, color: '#0A8F72' },
    { label: lateLabel, count: lateCount, color: '#C46A00' },
    { label: absentLabel, count: absentLeaveCount, color: '#6250D6' },
  ];

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col h-full justify-between">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">{t('attChartTitle')}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{t('attChartSub')}</p>
        </div>
        <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
          {t('recordsSuffix', { count: totalLogs })}
        </span>
      </div>

      {totalLogs === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100/80 border border-slate-200/60 flex items-center justify-center text-slate-400 mb-2.5 shadow-xs">
            <Clock weight="duotone" className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-xs font-semibold text-slate-700">{t('noAttRecords')}</p>
          <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">
            {t('noAttRecordsDesc')}
          </p>
        </div>
      ) : (
        <>
          {/* Bar Chart Canvas */}
          <div className="relative w-full h-36 my-auto pt-2">
            <Bar data={data} options={options} />
          </div>

          {/* Bottom Legend with Actual Counts */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-3 border-t border-slate-100/80">
            {legendItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-slate-700">{item.label}</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  ({item.count})
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
