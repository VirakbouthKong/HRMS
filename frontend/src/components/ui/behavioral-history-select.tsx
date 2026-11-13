"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";

export interface HistoryOption {
  value: string | number;
  label: string;
}

export interface BehavioralHistorySelectProps {
  options: HistoryOption[];
  label?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  defaultValue?: string | number;
  value?: string | number;
  maxHistory?: number;
  storageKey?: string;
  selectWidth?: string | number;
  className?: string;
  disabled?: boolean;
  id?: string;
}

interface StoredHistory {
  value: string;
  count: number;
  timestamp: number;
}

export const BehavioralHistorySelect: React.FC<BehavioralHistorySelectProps> = ({
  options,
  label,
  placeholder,
  onChange,
  defaultValue,
  value,
  maxHistory = 5,
  storageKey,
  selectWidth,
  className,
  disabled = false,
  id,
}) => {
  const { t } = useI18n();
  const effectivePlaceholder = placeholder || t("selectOptionPlaceholder");
  // Normalize value to string for Radix Select compatibility
  const normalizedValue = value !== undefined ? String(value) : undefined;
  const normalizedDefault = defaultValue !== undefined ? String(defaultValue) : undefined;

  const [selected, setSelected] = React.useState<string>(
    normalizedValue || normalizedDefault || ""
  );
  const [history, setHistory] = React.useState<StoredHistory[]>([]);

  React.useEffect(() => {
    if (normalizedValue !== undefined) {
      setSelected(normalizedValue);
    }
  }, [normalizedValue]);

  // Safe localStorage loader with schema validation
  React.useEffect(() => {
    if (typeof window !== "undefined" && storageKey) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(
              (item) =>
                item &&
                typeof item.value !== "undefined" &&
                typeof item.count === "number" &&
                typeof item.timestamp === "number"
            );
            setHistory(valid);
          } else {
            localStorage.removeItem(storageKey);
            setHistory([]);
          }
        }
      } catch {
        setHistory([]);
      }
    }
  }, [storageKey]);

  const handleChange = (val: string) => {
    setSelected(val);
    onChange?.(val);

    if (storageKey) {
      setHistory((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const existing = safePrev.find((h) => h.value === val);
        let updated: StoredHistory[];
        if (existing) {
          updated = safePrev.map((h) =>
            h.value === val
              ? { ...h, count: h.count + 1, timestamp: Date.now() }
              : h
          );
        } else {
          updated = [...safePrev, { value: val, count: 1, timestamp: Date.now() }];
        }

        updated.sort((a, b) => {
          if (b.count === a.count) return b.timestamp - a.timestamp;
          return b.count - a.count;
        });

        const limited = updated.slice(0, maxHistory);

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(storageKey, JSON.stringify(limited));
          } catch {
            // ignore storage quota error
          }
        }

        return limited;
      });
    }
  };

  // Convert all options to string value internally
  const normalizedOptions = React.useMemo(() => {
    if (!Array.isArray(options)) return [];
    return options.map((opt) => ({
      value: String(opt.value),
      label: opt.label,
    }));
  }, [options]);

  const selectedOption = React.useMemo(() => {
    return normalizedOptions.find((o) => o.value === selected);
  }, [normalizedOptions, selected]);

  // Determine recent items if storageKey is active
  const recentItems = React.useMemo(() => {
    if (!storageKey || !Array.isArray(history) || history.length === 0) return [];
    return history
      .map((h) => normalizedOptions.find((o) => o.value === h.value))
      .filter(Boolean) as { value: string; label: string }[];
  }, [storageKey, history, normalizedOptions]);

  const otherItems = React.useMemo(() => {
    if (recentItems.length === 0) return normalizedOptions;
    return normalizedOptions.filter((o) => !recentItems.some((r) => r.value === o.value));
  }, [recentItems, normalizedOptions]);

  const isFullWidth = !selectWidth || selectWidth === "100%";
  const fixedWidthStyle =
    !isFullWidth && selectWidth
      ? typeof selectWidth === "number"
        ? `${selectWidth}px`
        : selectWidth
      : undefined;

  return (
    <div
      className={cn("flex flex-col gap-1.5", isFullWidth ? "w-full" : "", className)}
      style={fixedWidthStyle ? { width: fixedWidthStyle } : undefined}
    >
      <Select
        value={selected || undefined}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className={cn(
            "w-full bg-white border-slate-200 text-xs text-slate-800 rounded-xl shadow-sm focus:ring-blue-500/20",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={fixedWidthStyle ? { width: fixedWidthStyle, minWidth: fixedWidthStyle } : undefined}
        >
          <SelectValue placeholder={effectivePlaceholder}>
            {selectedOption ? selectedOption.label : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          className="bg-white/95 backdrop-blur-md border-slate-200 shadow-xl rounded-xl"
        >
          {label && (
            <SelectGroup>
              <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                {label}
              </SelectLabel>
            </SelectGroup>
          )}

          {recentItems.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-blue-600 px-3 py-1">
                {t("recentGroup")}
              </SelectLabel>
              {recentItems.map((opt) => {
                const stored = Array.isArray(history) ? history.find((h) => h.value === opt.value) : undefined;
                return (
                  <SelectItem
                    key={`recent-${opt.value}`}
                    value={opt.value}
                    className="flex justify-between items-center w-full text-xs text-slate-700 py-2 cursor-pointer hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700"
                  >
                    <span>{opt.label}</span>
                    {stored && (
                      <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full ml-auto">
                        {stored.count}×
                      </span>
                    )}
                  </SelectItem>
                );
              })}
            </SelectGroup>
          )}

          {otherItems.length > 0 && (
            <SelectGroup>
              {recentItems.length > 0 && (
                <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                  {t("otherOptionsGroup")}
                </SelectLabel>
              )}
              {otherItems.map((opt) => (
                <SelectItem
                  key={`other-${opt.value}`}
                  value={opt.value}
                  className="text-xs text-slate-700 py-2 cursor-pointer hover:bg-slate-50 focus:bg-blue-50 focus:text-blue-700"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
