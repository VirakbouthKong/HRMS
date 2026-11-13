import React from 'react';
import gbFlag from 'flag-icons/flags/4x3/gb.svg';
import khFlag from 'flag-icons/flags/4x3/kh.svg';
import { useI18n } from '../../i18n/useI18n';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  variant?: 'header' | 'login' | 'dark';
  className?: string;
}

/**
 * Official NPM Flag-Only Segmented Switcher Pill (flag-icons 4:3 SVGs).
 * Renders authentic GB (English) and KH (Cambodia) flags with zero text codes.
 */
export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'header',
  className,
}) => {
  const { language, setLanguage } = useI18n();
  const isDark = variant === 'dark';

  return (
    <div
      role="group"
      aria-label="Language switcher"
      className={cn(
        'relative inline-flex items-center p-1 rounded-xl border transition-colors',
        isDark
          ? 'bg-slate-800/80 border-slate-700/80'
          : variant === 'login'
          ? 'bg-slate-100/90 border-slate-200/80 shadow-2xs'
          : 'h-10 bg-white border-slate-200 shadow-2xs',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-label="Switch language to English"
        aria-pressed={language === 'en'}
        title="English"
        className={cn(
          'relative flex items-center justify-center rounded-lg transition-[transform,background-color,box-shadow,opacity] duration-150 active:scale-[0.94] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer',
          variant === 'header' ? 'w-8 h-8' : 'w-8 h-7',
          language === 'en'
            ? isDark
              ? 'bg-slate-700 shadow-sm ring-1 ring-blue-400/50'
              : 'bg-blue-50/90 shadow-xs ring-1 ring-blue-500/30'
            : isDark
            ? 'opacity-55 hover:opacity-90 hover:bg-slate-700/40'
            : 'opacity-55 hover:opacity-100 hover:bg-slate-100'
        )}
      >
        <img
          src={gbFlag}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="w-5 h-[15px] rounded-[3px] object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.08)] pointer-events-none select-none"
        />
      </button>

      <button
        type="button"
        onClick={() => setLanguage('kh')}
        aria-label="ប្តូរភាសាទៅជាភាសាខ្មែរ (Switch language to Khmer)"
        aria-pressed={language === 'kh'}
        title="ភាសាខ្មែរ"
        className={cn(
          'relative flex items-center justify-center rounded-lg transition-[transform,background-color,box-shadow,opacity] duration-150 active:scale-[0.94] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer',
          variant === 'header' ? 'w-8 h-8' : 'w-8 h-7',
          language === 'kh'
            ? isDark
              ? 'bg-slate-700 shadow-sm ring-1 ring-blue-400/50'
              : 'bg-blue-50/90 shadow-xs ring-1 ring-blue-500/30'
            : isDark
            ? 'opacity-55 hover:opacity-90 hover:bg-slate-700/40'
            : 'opacity-55 hover:opacity-100 hover:bg-slate-100'
        )}
      >
        <img
          src={khFlag}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="w-5 h-[15px] rounded-[3px] object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.08)] pointer-events-none select-none"
        />
      </button>
    </div>
  );
};
