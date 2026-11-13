import React from 'react';
import { IconProps } from '@phosphor-icons/react';

export type MetricAccent = 'blue' | 'purple' | 'green' | 'orange' | 'cyan';

interface MetricCardProps {
  value: React.ReactNode;
  title: string;
  subtitle: string;
  icon: React.ComponentType<IconProps>;
  accent: MetricAccent;
}

const accentMap: Record<MetricAccent, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-600', text: 'text-white' },
  purple: { bg: 'bg-purple-600', text: 'text-white' },
  green: { bg: 'bg-emerald-600', text: 'text-white' },
  orange: { bg: 'bg-amber-500', text: 'text-white' },
  cyan: { bg: 'bg-cyan-500', text: 'text-white' },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  value,
  title,
  subtitle,
  icon: Icon,
  accent,
}) => {
  const badgeStyle = accentMap[accent] || accentMap.blue;

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-slate-200 transition-[box-shadow,border-color] duration-150 flex flex-col justify-between min-h-[118px]">
      {/* Top Row: Stat Figure on Left, Vibrant Icon Badge on Right */}
      <div className="flex items-start justify-between">
        <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
          {value}
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${badgeStyle.bg} ${badgeStyle.text}`}
        >
          <Icon weight="fill" className="w-5 h-5" />
        </div>
      </div>

      {/* Bottom Row: Title and Context */}
      <div className="mt-4">
        <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
          {title}
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-tight truncate">
          {subtitle}
        </p>
      </div>
    </div>
  );
};
