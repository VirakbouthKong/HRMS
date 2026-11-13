import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { CalendarCheck } from '@phosphor-icons/react';
import { useHrmsStore } from '../../store/useHrmsStore';
import { useI18n } from '../../i18n/useI18n';

ChartJS.register(ArcElement, Tooltip, Legend);

export const LeaveSummaryChart: React.FC = () => {
  const { leaves } = useHrmsStore();
  const { t, tLeaveType } = useI18n();

  // Aggregate real leaves by leaveType
  const typeCounts: Record<string, number> = {};
  leaves.forEach((l) => {
    const type = l.leaveType || 'Casual Leave';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  const rawCategories = Object.keys(typeCounts);
  const categories = rawCategories.map((c) => tLeaveType(c));
  const counts = Object.values(typeCounts);

  const palette = ['#06B6D4', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

  const data = {
    labels: categories,
    datasets: [
      {
        data: counts,
        backgroundColor: categories.map((_, i) => palette[i % palette.length]),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => ` ${context.label}: ${context.raw} ${t('applicationsUnit')}`,
        },
      },
    },
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col h-full justify-between">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">{t('leaveDistTitle')}</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">{t('leaveDistSub')}</p>
        </div>
        <span className="text-[11px] font-mono font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
          {t('totalSuffix', { count: leaves.length })}
        </span>
      </div>

      {leaves.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100/80 border border-slate-200/60 flex items-center justify-center text-slate-400 mb-2.5 shadow-xs">
            <CalendarCheck weight="duotone" className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-xs font-semibold text-slate-700">{t('noLeaveRecords')}</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] leading-relaxed">
            {t('noLeaveRecordsDesc')}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between flex-1 gap-6 pt-2">
          {/* Donut Chart Canvas */}
          <div className="relative w-40 h-40 flex-shrink-0 mx-auto sm:mx-0">
            <Doughnut data={data} options={options} />
          </div>

          {/* Side Legend */}
          <div className="flex flex-col gap-2.5 flex-1 pl-2 min-w-0">
            {categories.map((label, idx) => {
              const count = counts[idx];
              const pct = Math.round((count / leaves.length) * 100);
              return (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-600">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: palette[idx % palette.length] }}
                  />
                  <span className="truncate text-xs font-medium text-slate-700 flex-1">{label}</span>
                  <span className="text-[11px] font-mono font-semibold text-slate-800 tabular-nums">
                    {count} <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
