import React from 'react';
import { useEmployeePhoto } from '../../lib/employeePhotos';

interface DashboardCardProps {
  title: string;
  subtitle?: React.ReactNode;
  /** Optional control or status chip shown on the right of the title. */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Shared Evergreen card frame used by every dashboard panel. */
export const DashboardCard: React.FC<DashboardCardProps> = ({ title, subtitle, action, className = '', children }) => (
  <section className={`bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 min-w-0 ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-[13px] text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

type ChipTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

const chipTones: Record<ChipTone, string> = {
  ok: 'bg-brand-50 text-brand-800',
  warn: 'bg-amber-50 text-amber-800',
  bad: 'bg-rose-50 text-rose-800',
  info: 'bg-violet-50 text-violet-800',
  neutral: 'bg-slate-100 text-slate-700',
};

/** Status pill: a dot plus text, so meaning never relies on colour alone. */
export const StatusChip: React.FC<{ tone: ChipTone; children: React.ReactNode }> = ({ tone, children }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${chipTones[tone]}`}
  >
    <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-current" />
    {children}
  </span>
);

export const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="py-8 text-center text-sm text-slate-500">{children}</p>
);

export const initialsOf = (name?: string) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const AVATAR_TINTS = ['bg-brand-100', 'bg-violet-100', 'bg-amber-100', 'bg-sky-100', 'bg-rose-100'];

/**
 * Round avatar: the employee's real photo when `employeeId` is given and they uploaded one,
 * otherwise their initials. Decorative (the name is always shown next to it).
 */
export const InitialsAvatar: React.FC<{ name?: string; size?: 'sm' | 'md' | 'lg'; employeeId?: number | null }> = ({
  name,
  size = 'md',
  employeeId,
}) => {
  const { ref, url } = useEmployeePhoto<HTMLSpanElement>(employeeId);
  const tint = AVATAR_TINTS[(name || '').length % AVATAR_TINTS.length];
  const dims = size === 'sm' ? 'w-8 h-8 text-[11px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-9 h-9 text-xs';
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`${dims} ${url ? 'bg-slate-100' : tint} rounded-full inline-flex items-center justify-center font-semibold text-slate-900 shrink-0 overflow-hidden`}
    >
      {url ? <img src={url} alt="" className="w-full h-full object-cover" draggable={false} /> : initialsOf(name)}
    </span>
  );
};

/** Local YYYY-MM-DD, matching how the store keys attendance and leave dates. */
export const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseDateKey = (key: string) => {
  const [y, m, d] = key.substring(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const localeFor = (language: string) => (language === 'kh' ? 'km-KH' : 'en-GB');
