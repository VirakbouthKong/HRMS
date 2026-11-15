import React from 'react';
import { IconProps } from '@phosphor-icons/react';

export type MetricAccent = 'neutral' | 'brand' | 'warn';

interface MetricCardProps {
  value: React.ReactNode;
  /** Small text after the value, e.g. "/ 236". */
  suffix?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  icon: React.ComponentType<IconProps>;
  accent?: MetricAccent;
  /** Optional 0–100 progress meter drawn under the value. */
  meter?: number;
  meterLabel?: string;
  footer?: React.ReactNode;
}

// Evergreen keeps KPI tiles calm: neutral icon chips, with amber reserved for
// metrics that need someone's attention.
const accentMap: Record<MetricAccent, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  brand: 'bg-brand-50 text-brand-700',
  warn: 'bg-amber-50 text-amber-800',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  value,
  suffix,
  title,
  subtitle,
  icon: Icon,
  accent = 'neutral',
  meter,
  meterLabel,
  footer,
}) => (
  <div className="bg-white rounded-xl px-5 py-[18px] border border-slate-200 flex flex-col gap-2.5 min-h-[148px] min-w-0">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-[13px] font-semibold text-slate-600 leading-snug">{title}</h3>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accentMap[accent]}`}>
        <Icon weight="regular" className="w-[18px] h-[18px]" />
      </div>
    </div>
    <div className="flex items-baseline gap-1.5">
      <span className="font-heading text-[34px] font-semibold tracking-tight text-slate-900 tabular-nums leading-none">
        {value}
      </span>
      {suffix && <span className="text-sm text-slate-500 tabular-nums">{suffix}</span>}
    </div>
    {meter !== undefined && (
      <div
        role="meter"
        aria-label={meterLabel || title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(meter)}
        className="h-1.5 rounded-full bg-slate-100 overflow-hidden"
      >
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, Math.max(0, meter))}%` }} />
      </div>
    )}
    {subtitle && <p className="text-[13px] text-slate-500 leading-relaxed mt-auto">{subtitle}</p>}
    {footer && <div className="mt-auto">{footer}</div>}
  </div>
);
