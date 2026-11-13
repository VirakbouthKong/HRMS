import * as React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { CalendarBlank } from '@phosphor-icons/react';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/useI18n';

export interface DatePickerProps {
  value?: string; // yyyy-MM-dd
  onChange: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder,
  className,
  id,
  disabled = false,
}) => {
  const { t } = useI18n();
  const effectivePlaceholder = placeholder || t('selectDatePlaceholder');
  const [isOpen, setIsOpen] = React.useState(false);

  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    const d = parseISO(value);
    return isValid(d) ? d : undefined;
  }, [value]);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onChange(format(selectedDate, 'yyyy-MM-dd'));
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            'flex items-center justify-between w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 hover:bg-slate-100/70 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-[background-color,border-color,box-shadow] font-medium',
            !parsedDate && 'text-slate-400',
            disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
            className
          )}
        >
          <span>{parsedDate ? format(parsedDate, 'PPP') : effectivePlaceholder}</span>
          <CalendarBlank weight="duotone" className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 border border-slate-200/90 shadow-2xl bg-white" align="start">
        <Calendar
          mode="single"
          selected={parsedDate}
          onSelect={handleSelect}
          defaultMonth={parsedDate || new Date()}
          className="rounded-xl border-none p-2 select-none"
        />
      </PopoverContent>
    </Popover>
  );
};

export default DatePicker;
