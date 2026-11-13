import React, { useState } from 'react';
import { Calendar } from '../ui/calendar';
import { CalendarDots, Sparkle } from '@phosphor-icons/react';
import { useHrmsStore } from '../../store/useHrmsStore';
import { useI18n } from '../../i18n/useI18n';

export const EventCalendarCard: React.FC = () => {
  const { leaves } = useHrmsStore();
  const { t, language } = useI18n();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);

  // Derive real event markers from company payroll schedule (28th) and real leaves
  const hasEventOnDate = (date: Date) => {
    if (date.getDate() === 28) return true;

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dStr = `${y}-${m}-${d}`;

    return leaves.some((l) => {
      if (!l.startDate) return false;
      const end = l.endDate || l.startDate;
      return dStr >= l.startDate && dStr <= end;
    });
  };

  const currentQuarter = `Q${Math.floor(today.getMonth() / 3) + 1} ${today.getFullYear()}`;

  const selectedDateStr = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(
        selectedDate.getDate()
      ).padStart(2, '0')}`
    : '';

  const leavesOnSelectedDate = leaves.filter((l) => {
    if (!selectedDateStr || !l.startDate) return false;
    const end = l.endDate || l.startDate;
    return selectedDateStr >= l.startDate && selectedDateStr <= end;
  });

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col h-full justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <CalendarDots weight="duotone" className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            {t('scheduleAndEvents')}
          </h2>
        </div>
        <span className="text-[10px] font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
          {currentQuarter}
        </span>
      </div>

      {/* Calendar Component */}
      <div className="flex-1 flex items-center justify-center py-1">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          defaultMonth={today}
          className="p-0 select-none"
          modifiers={{
            hasEvent: (date) => hasEventOnDate(date),
          }}
          modifiersClassNames={{
            hasEvent:
              "relative font-bold after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-blue-600 after:rounded-full",
          }}
        />
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-slate-100/90 flex items-center justify-between text-[11px] gap-2">
        <div className="text-slate-600 truncate">
          <span className="font-semibold text-slate-800">
            {selectedDate
              ? selectedDate.toLocaleDateString(language === 'kh' ? 'km-KH' : 'en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : t('selectDate')}
          </span>
          {leavesOnSelectedDate.length > 0 && (
            <span className="ml-1.5 text-blue-600 font-medium">
              ({leavesOnSelectedDate.length}{' '}
              {leavesOnSelectedDate.length > 1 ? t('leavePlural') : t('leaveSingular')})
            </span>
          )}
          {selectedDate?.getDate() === 28 && (
            <span className="ml-1.5 text-emerald-600 font-medium font-mono">
              {t('payrollRunTag')}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
          <Sparkle weight="fill" className="w-2.5 h-2.5 text-emerald-600" />
          <span>{t('operationalBadge')}</span>
        </span>
      </div>
    </div>
  );
};

export default EventCalendarCard;
