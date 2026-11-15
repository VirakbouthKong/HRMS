import React from 'react';

export interface FilterTab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface FilterTabsProps<T extends string> {
  tabs: FilterTab<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group, e.g. "Filter requests by status". */
  label: string;
  className?: string;
}

/** Underlined filter tabs with counts (Evergreen). Buttons expose state via aria-pressed. */
export function FilterTabs<T extends string>({ tabs, value, onChange, label, className = '' }: FilterTabsProps<T>) {
  return (
    <div role="group" aria-label={label} className={`flex flex-wrap gap-1 border-b border-slate-200 ${className}`}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.value)}
            className={`inline-flex items-center gap-2 h-11 px-3 -mb-px border-b-2 text-sm transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none rounded-t-md ${
              active
                ? 'border-brand-600 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 font-medium hover:text-slate-900'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`px-2 py-px rounded-full text-xs font-semibold tabular-nums ${
                  active ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
