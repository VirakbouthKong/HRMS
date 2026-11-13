import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Plus,
  CalendarPlus,
  ClockAfternoon,
  List,
} from '@phosphor-icons/react';
import { useHrmsStore } from '../../store/useHrmsStore';
import { getRoleBadge } from '../../utils/rbac';
import { NotificationsMenu } from '../ui/notifications-menu';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { GlobalSearch } from './GlobalSearch';
import { useI18n } from '../../i18n/useI18n';

interface HeaderProps {
  onRaiseRequestClick?: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onRaiseRequestClick, onOpenMobileMenu }) => {
  const { setActiveTab, currentUser, leaves, attendance } = useHrmsStore();
  const { t, tRole } = useI18n();
  const [isRaiseDropdownOpen, setIsRaiseDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('notif') === 'true'
  );
  const notifRef = useRef<HTMLDivElement>(null);
  const raiseRef = useRef<HTMLDivElement>(null);

  const unreadCount =
    leaves.filter((l) => l.status === 'PENDING').length +
    attendance.filter((a) => a.status === 'LATE').length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (raiseRef.current && !raiseRef.current.contains(event.target as Node)) {
        setIsRaiseDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false);
        setIsRaiseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const roleBadge = getRoleBadge(currentUser.role);
  const roleInfo = tRole(currentUser.role);

  return (
    <header className="sticky top-0 z-20 px-4 sm:px-6 lg:px-8 py-3 bg-[#eaf1f7]/90 backdrop-blur-md border-b border-slate-200/60 select-none">
      {/* Top Utility Bar */}
      <div className="flex items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 active:scale-[0.96] transition-[transform,background-color,color] duration-150 flex items-center justify-center shadow-2xs shrink-0 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
            >
              <List weight="bold" className="w-4 h-4" />
            </button>
          )}
          {/* Global Search Command Bar with Live Dropdown & Keyboard Shortcuts */}
          <GlobalSearch />
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Official NPM Flag-Only Bilingual Switcher Pill */}
          <LanguageSwitcher variant="header" />

          {/* Notifications Popover Trigger */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              aria-label={t('viewNotifications')}
              aria-expanded={isNotificationsOpen}
              aria-haspopup="true"
              className={`relative w-10 h-10 rounded-xl border text-slate-600 hover:text-slate-900 active:scale-[0.96] transition-[transform,background-color,border-color,color] duration-150 flex items-center justify-center shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer ${
                isNotificationsOpen
                  ? 'bg-blue-50 border-blue-300 text-blue-600 shadow-sm'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Bell weight={isNotificationsOpen ? 'fill' : 'bold'} className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* Notifications Popover with Polish Animation */}
            {isNotificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-[380px] sm:w-[460px] origin-top-right animate-in zoom-in-95">
                <NotificationsMenu onClose={() => setIsNotificationsOpen(false)} />
              </div>
            )}
          </div>

          {/* Verified Session Role & Account Pill (40px desktop hit target) */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            title={t('viewAccountTooltip')}
            className="hidden md:flex items-center gap-2 h-10 px-3.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:border-slate-300 shadow-2xs active:scale-[0.96] transition-transform duration-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full ${roleBadge.dotClass}`} />
            <span className="font-mono text-[11px] tracking-tight font-bold">{roleInfo.shortTag}</span>
            <span className="text-slate-200">|</span>
            <span className="text-slate-600 font-medium text-[11px] truncate max-w-[120px]">
              {currentUser.userName}
            </span>
          </button>

          {/* New Request Button (40px desktop hit target) */}
          <div className="relative" ref={raiseRef}>
            <button
              type="button"
              onClick={() => setIsRaiseDropdownOpen((prev) => !prev)}
              aria-label={t('createRequestAria')}
              aria-expanded={isRaiseDropdownOpen}
              aria-haspopup="true"
              className="flex items-center gap-1.5 h-10 px-3 sm:px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.96] text-white text-xs font-medium transition-[transform,background-color] duration-100 shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer whitespace-nowrap"
            >
              <Plus weight="bold" className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{t('newRequest')}</span>
            </button>

            {isRaiseDropdownOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl bg-white shadow-xl border border-slate-200/90 p-1.5 z-50 origin-top-right animate-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setIsRaiseDropdownOpen(false);
                    if (onRaiseRequestClick) {
                      onRaiseRequestClick();
                    } else {
                      setActiveTab('leaves');
                    }
                  }}
                  className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg active:scale-[0.96] transition-transform duration-100 cursor-pointer"
                >
                  <CalendarPlus weight="bold" className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{t('applyForLeave')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRaiseDropdownOpen(false);
                    setActiveTab('attendance');
                  }}
                  className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg active:scale-[0.96] transition-transform duration-100 cursor-pointer"
                >
                  <ClockAfternoon weight="bold" className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{t('requestAttendanceCorrection')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
